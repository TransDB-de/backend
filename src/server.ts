import { Server } from "@overnightjs/core"
import express from "express"
import { Server as HttpServer } from "http"
import helmet from "helmet"
import * as Config from "./services/config.service.js"
import cors from "cors"

import { errorFunctionMiddleware } from "./middleware/errorFunction.middleware.js"
import DefaultController from "./controllers/default.controller.js"
import EntriesController from "./controllers/entries.controller.js"
import GeodataController from "./controllers/geodata.controller.js"
import ReportController from "./controllers/report.controller.js"
import UsersController from "./controllers/users.controller.js"


export default class TransDBBackendServer extends Server {
	private server!: HttpServer;
	
	constructor() {
		super(process.env.NODE_ENV === "development");
		
		this.app.use(helmet());
		this.app.use(express.json());
		this.app.use(cors({ origin: Config.config.web.CORSOrigins }));
		this.app.use(errorFunctionMiddleware);
		
		this.setupControllers();
	}
	
	private setupControllers(): void {
		super.addControllers([
			new DefaultController(),
			new EntriesController(),
			new GeodataController(),
			new ReportController(),
			new UsersController()
		]);
	}
	
	public start(port: number): void {
		this.server = this.app.listen(port, () => {
			console.log("[express] Server running on " + port);
		});
	}
	
	public stop(): void {
		this.server.close();
		console.log("[express] Server stopped");
	}
}
