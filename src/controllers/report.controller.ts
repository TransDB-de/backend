import { Controller, Middleware, Post } from "@overnightjs/core"
import rateLimit from "express-rate-limit"
import { IRequest, IResponse } from "express"

import { StatusCode } from "../types/httpStatusCodes.js"
import { Report } from "../models/request/report.request.js"
import validate from "../middleware/validation.middleware.js"

import { config } from "../services/config.service.js"
import * as Database from "../services/database.service.js"
import * as Discord from "../services/discord.service.js"


const newReportLimiter = rateLimit({
	windowMs: config.rateLimit.report.timeframeMinutes * 60 * 1000,
	max: config.rateLimit.report.maxRequests,
});


@Controller("report")
export default class ReportController {
	@Post("/")
	@Middleware( newReportLimiter )
	@Middleware( validate(Report) )
	public async report(req: IRequest<Report>, res: IResponse) {
		let entry = await Database.getEntry(req.body.id);
		
		if (!entry) return res.status(StatusCode.NotFound).send({ error: "entry_not_found" }).end();
		
		let sent = await Discord.sendReport(entry, req.body.type, req.body.message);
		
		if (!sent) return res.status(StatusCode.InternalServerError).end();
		
		res.status(200).end();
	}
}
