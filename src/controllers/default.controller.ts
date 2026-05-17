import { Controller } from "@overnightjs/core";
import { config } from "../services/config.service.js";
import { Request, Response } from "express";
import { Get } from "@overnightjs/core";
import { ping } from "../services/database.service.js";

@Controller("")
export default class DefaultController {
	@Get("/")
	public info(req: Request, res: Response): void {
		res.json(config.info);
	}

	@Get("health")
	public async healthcheck(req: Request, res: Response) {
		const r = await ping();
		res.status(200).json({ db: r }).end();
	}
}
