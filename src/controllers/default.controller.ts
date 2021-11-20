import { Controller } from "@overnightjs/core"
import { config } from "../services/config.service.js"
import { Request, Response } from "express"
import { Get } from "@overnightjs/core"

@Controller("/")
export default class DefaultController {
	@Get("/")
	public info(req: Request, res: Response): void {
		res.json(config.info)
	}
}
