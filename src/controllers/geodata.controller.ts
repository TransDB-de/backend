import { Controller, Get, Middleware } from "@overnightjs/core"
import { IRequest, IResponse } from "express"

import validate, { EValidationDataSource } from "../middleware/validation.middleware.js"
import { SearchGeoLocation } from "../models/request/geo.request.js"
import { StatusCode } from "../types/httpStatusCodes.js"

import * as Database from "../services/database.service.js"
import { GeoPlace } from "../models/database/geodata.model.js"

@Controller("geodata")
export default class GeodataController {
	@Get("/")
	@Middleware( validate(SearchGeoLocation, { source: EValidationDataSource.Query }) )
	async searchGeoLocation(req: IRequest<{}, SearchGeoLocation>, res: IResponse<GeoPlace[]>) {
		let data = await Database.findGeoLocation(req.query.search);
		
		if ( !data[0] ) return res.status(StatusCode.NotFound).end();
		
		res.send(data);
	}
}
