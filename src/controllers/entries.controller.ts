import { Controller, Middleware, Get, Post, Patch, Put, Delete } from "@overnightjs/core"
import rateLimit from "express-rate-limit"
import slowDown from "express-slow-down"
import { IRequest, IResponse } from "express"

import { config } from "../services/config.service.js"
import * as EntryService from "../services/entry.service.js"
import * as Database from "../services/database.service.js"
import * as CMS from "../services/cms.service.js"

import queryNumberParser from "../middleware/queryNumberParser.middleware.js"
import queryArrayParser from "../middleware/queryArrayParser.middleware.js"
import trimAndNullifyMiddleware from "../middleware/trimAndNullify.middleware.js"

import { AdminFilteredEntries, PublicEntry, QueriedEntries } from "../models/response/entries.response.js"
import authenticate from "../middleware/auth.middleware.js"
import { EditEntry, Entry, FilterFull, FilterQuery } from "../models/request/entries.request.js"
import validate, {
	validateFilterQuery,
	validateId,
	validateOptional
} from "../middleware/validation.middleware.js"
import { StatusCode } from "../types/httpStatusCodes.js"
import { ObjectId } from "../models/request/objectId.request.js"
import { filterEntry } from "../util/filter.util.js"
import { ECMSTicketType } from "../types/cms.js"

const newEntryLimiter = rateLimit({
	windowMs: config.rateLimit.newEntries.timeframeMinutes * 60 * 1000,
	max: config.rateLimit.newEntries.maxRequests,
});

const entryDataSpeedLimiter = slowDown({
	windowMs: config.slowDown.entries.timeframeSeconds * 1000,
	delayAfter: config.slowDown.entries.maxRequests,
	delayMs: config.slowDown.entries.delayMs,
	maxDelayMs: config.slowDown.entries.maxDelayMs
});


@Controller("entries")
export default class EntriesController {
	@Get("/")
	@Middleware( entryDataSpeedLimiter )
	@Middleware( queryNumberParser("lat", "long", "page") )
	@Middleware( queryArrayParser("offers", "attributes") )
	@Middleware( validateFilterQuery )
	async getEntries(req: IRequest<{}, FilterQuery>, res: IResponse<QueriedEntries>) {
		res.send(await EntryService.filter( req.query ));
	}
	
	@Post("/")
	@Middleware( newEntryLimiter )
	@Middleware( trimAndNullifyMiddleware )
	@Middleware( validate(Entry, { validationGroupFromEntryType: true }) )
	async submitNewEntry(req: IRequest<Entry>, res: IResponse<PublicEntry>) {
		const id = await EntryService.addEntry(req.body);
		
		res.status(StatusCode.Created).end();
		
		// DiscordService.sendNewEntryNotification(req.body.name, req.body.type);
		CMS.createTicket(req.body.name, id.toString(), ECMSTicketType.NEW, null);
	}
	
	@Get("unapproved")
	@Middleware( authenticate() )
	@Middleware( queryNumberParser("page") )
	async authorizedGetUnapproved(req: IRequest<{}, {page: number}>, res: IResponse<QueriedEntries>) {
		res.send(await EntryService.getUnapproved(req.query.page ? req.query.page : 0));
	}
	
	@Get("backup")
	@Middleware( authenticate({ admin: true }) )
	async adminGetBackup(req: IRequest, res: IResponse) {
		let exported = await Database.exportEntries();
		
		if (!exported) {
			res.error!("backup_failed");
			return;
		}
		
		res.download(exported);
	}
	
	@Post("full")
	@Middleware( authenticate() )
	@Middleware( validate(FilterFull) )
	async adminGetFullFilteredEntries(req: IRequest<FilterFull>, res: IResponse<AdminFilteredEntries>) {
		let entries = await EntryService.filterWithFilterLang(req.body);
		
		if (entries === null) {
			res.error!("compilation_failed");
			return;
		}
		
		res.send(entries);
	}
	
	@Get(":id")
	@Middleware( validateId )
	async getSingleEntry(req: IRequest<{}, {}, ObjectId>, res: IResponse<PublicEntry>) {
		let entry = await Database.getEntryById(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		filterEntry(entry);
		
		res.send(entry);
	}
	
	@Patch(":id/approve")
	@Middleware( authenticate() )
	@Middleware( validateId )
	async approveEntry(req: IRequest<{}, {}, ObjectId>, res: IResponse) {
		let entry = await Database.getEntryById(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		// Update entry with new approved state
		let updated = await EntryService.approve(entry, req.user!.id);
		
		if (!updated) {
			res.error!("not_updated");
			return;
		}
		
		res.status(StatusCode.OK).end();
	}
	
	@Patch(":id/blocklist")
	@Middleware( authenticate() )
	@Middleware( validateId )
	async blockEntry(req: IRequest<{}, {}, ObjectId>, res: IResponse) {
		let entry = await Database.getEntryById(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		// Update entry with new status
		let updated = await EntryService.update(entry, { blocked: true, possibleDuplicate: undefined });
		
		if (!updated) {
			res.error!("not_updated");
			return;
		}
		
		res.status(StatusCode.OK).end();
	}
	
	@Patch(":id/edit")
	@Middleware( authenticate({ admin: true }) )
	@Middleware( trimAndNullifyMiddleware )
	@Middleware( validateId )
	@Middleware( validateOptional(EditEntry) )
	async adminUpdateEntry(req: IRequest<EditEntry, {}, ObjectId>, res: IResponse) {
		let entry = await Database.getEntryById(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		let updated = await EntryService.update(entry, req.body);
		
		if (!updated) {
			res.error!("not_updated");
		}
		
		res.status(StatusCode.OK).end();
	}
	
	@Patch(":id/updateGeo")
	@Middleware( authenticate({ admin: true }) )
	@Middleware( validateId )
	async adminUpdateGeo(req: IRequest<{}, {}, ObjectId>, res: IResponse) {
		let entry = await Database.getEntryById(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		EntryService.updateGeoLocation(entry);
		
		res.status(StatusCode.Accepted).end();
	}

	
	
	@Delete(":id")
	@Middleware( authenticate() )
	@Middleware( validateId )
	async deleteEntry(req: IRequest<{}, {}, ObjectId>, res: IResponse) {
		let entry = await Database.getEntryById(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		let deleted = await Database.deleteEntry(req.params.id);
		
		if (!deleted) {
			res.error!("not_deleted");
			return;
		}
		
		res.status(StatusCode.OK).end();
	}
}
