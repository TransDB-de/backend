// third-party modules
import express from "express";

import * as Api from "../api/api";

// Require services
import { config } from "../services/config.js";
import rateLimit from "express-rate-limit";
import validate from "../utils/validate.js";
import {reportBody} from "../models/report.js";
import * as Database from "../services/database.js";
import * as Discord from "../services/discord.js";
import {ResponseCode} from "../utils/restResponseCodes.js";

// Path in URL
export const path = "/report";

export const router = express.Router() as IRouter<Api.Report>;

/**
 * Limits the rate at which new entries can be submitted
 */
const newReportLimiter = rateLimit({
	windowMs: config.rateLimit.report.timeframeMinutes * 60 * 1000,
	max: config.rateLimit.report.maxRequests,
}) as IMiddleware;


// Base route to get basic information about this API. The data can be changed in the config file.
router.post("/", newReportLimiter, validate(reportBody), async (req, res) => {

	let entry =  await Database.getEntry(req.body.entryId);

	if (!entry) return res.status(ResponseCode.NotFound).send({ error: "entry_not_found" }).end();

	let sent = await Discord.sendReport(entry, req.body.message);

	if(!sent) return res.status(ResponseCode.InternalServerError).end();

	res.status(200).end();

});
