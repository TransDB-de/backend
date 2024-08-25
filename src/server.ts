import { Server } from "@overnightjs/core"
import express from "express"
import { Server as HttpServer } from "http"
import helmet from "helmet"
import { config } from "./services/config.service.js"
import cors from "cors"

import { errorFunctionMiddleware } from "./middleware/errorFunction.middleware.js"
import csrfMiddleware from "./middleware/csrf.middleware.js"

export default class TransDBBackendServer extends Server {
	private server!: HttpServer;
	
	constructor() {
		super(process.env.NODE_ENV === "development");
		
		this.app.set("trust proxy", config.web.trustProxy);
		this.app.use(helmet());
		this.app.use(express.json());
		this.app.use(cors({ origin: config.web.CORSOrigins }));
		this.app.use(errorFunctionMiddleware);
		
		if (config.csrfProtection.active) {
			this.app.use(csrfMiddleware);
		}
		
		this.setupControllers();
	}
	
	private async setupControllers(): Promise<void> {
		// Dynamic imports are required here to load these modules after the config has been loaded.
		const DefaultController = (await import("./controllers/default.controller.js")).default;
		const EntriesController = (await import("./controllers/entries.controller.js")).default;
		const GeodataController = (await import("./controllers/geodata.controller.js")).default;
		const ReportController = (await import("./controllers/report.controller.js")).default;
		const AccessController = (await import("./controllers/access.controller.js")).default;
		
		super.addControllers([
			new DefaultController(),
			new EntriesController(),
			new GeodataController(),
			new ReportController(),
			new AccessController()
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
