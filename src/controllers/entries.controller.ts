import { Controller, Middleware, Get, Post, Patch, Delete } from "@overnightjs/core"
import rateLimit from "express-rate-limit"
import { IRequest, IResponse } from "express"

import { config } from "../services/config.service.js"
import * as EntryService from "../services/entry.service.js"
import * as Database from "../services/database.service.js"
import * as DiscordService from "../services/discord.service.js"

import queryNumberParser from "../middleware/queryNumberParser.middleware.js"
import queryArrayParser from "../middleware/queryArrayParser.middleware.js"
import { AdminFilteredEntries, PublicEntry, QueriedEntries } from "../models/response/entries.response.js"
import authenticate from "../middleware/auth.middleware.js"
import { Entry, FilterFull, FilterQuery } from "../models/request/entries.request.js"
import validate, {
	validateFilterQuery,
	validateId,
	validateOptional
} from "../middleware/validation.middleware.js"
import { StatusCode } from "../types/httpStatusCodes.js"
import { ObjectId } from "../models/request/objectId.request.js"
import { filterEntry } from "../util/filter.util.js"

const newEntryLimiter = rateLimit({
	windowMs: config.rateLimit.newEntries.timeframeMinutes * 60 * 1000,
	max: config.rateLimit.newEntries.maxRequests,
});


@Controller("entries")
export default class EntriesController {
	@Get("/")
	@Middleware( queryNumberParser("lat", "long", "page") )
	@Middleware( queryArrayParser("offers", "attributes") )
	@Middleware( validateFilterQuery )
	async getEntries(req: IRequest<{}, FilterQuery>, res: IResponse<QueriedEntries>) {
		res.send(await EntryService.filter( req.query ));
	}
	
	@Post("/")
	@Middleware( newEntryLimiter )
	@Middleware( validate(Entry, { validationGroupFromEntryType: true }) )
	async submitNewEntry(req: IRequest<Entry>, res: IResponse<PublicEntry>) {
		await EntryService.addEntry(req.body);
		
		res.status(StatusCode.Created).end();
		
		DiscordService.sendNewEntryNotification(req.body.name, req.body.type);
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
	@Middleware( authenticate({ admin: true }) )
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
		let entry = await Database.getEntry(req.params.id);
		
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
		let entry = await Database.getEntry(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		// Update entry with new approved state
		try {
			await EntryService.approve(entry, req.user!.id);
		}
		catch {
			res.error!("not_updated");
			return;
		}
		
		res.status(StatusCode.OK).end();
	}
	
	@Patch(":id/edit")
	@Middleware( authenticate({ admin: true }) )
	@Middleware( validateId )
	@Middleware( validateOptional(Entry) )
	async adminUpdateEntry(req: IRequest<Entry, {}, ObjectId>, res: IResponse) {
		let entry = await Database.getEntry(req.params.id);
		
		if (!entry) {
			res.error!("not_found");
			return;
		}
		
		let updated = await Database.updateEntry(entry, req.body);
		
		if (!updated) {
			res.error!("not_updated");
		}
		
		res.status(StatusCode.OK).end();
	}
	
	@Patch(":id/updateGeo")
	@Middleware( authenticate({ admin: true }) )
	@Middleware( validateId )
	async adminUpdateGeo(req: IRequest<{}, {}, ObjectId>, res: IResponse) {
		let entry = await Database.getEntry(req.params.id);
		
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
		let entry = await Database.getEntry(req.params.id);
		
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
