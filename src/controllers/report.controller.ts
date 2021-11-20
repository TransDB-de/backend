import {Controller, Middleware, Post} from "@overnightjs/core"
import rateLimit from "express-rate-limit"
import { Report } from "../models/request/report.request.js"
import { config } from "../services/config.service.js"
import { Request, Response } from "express"
import { StatusCode } from "../types/httpStatusCodes"

import * as Database from "../services/database.service.js"
import * as Discord from "../services/discord.service.js"

const newReportLimiter = rateLimit({
	windowMs: config.rateLimit.report.timeframeMinutes * 60 * 1000,
	max: config.rateLimit.report.maxRequests,
});

@Controller("report")
export default class ReportController {
	@Post("/")
	@Middleware(newReportLimiter)
	public async report(req: Request<{}, {}, Report>, res: Response) {
		let entry = await Database.getEntry(req.body.id);
		
		if (!entry) return res.status(StatusCode.NotFound).send({ error: "entry_not_found" }).end();
		
		let sent = await Discord.sendReport(entry, req.body.message);
		
		if(!sent) return res.status(StatusCode.InternalServerError).end();
		
		res.status(200).end();
	}
}
