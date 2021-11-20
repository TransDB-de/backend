import { Server } from "@overnightjs/core"
import DefaultController from "./controllers/default.controller.js"
import EntriesController from "./controllers/entries.controller.js"
import GeodataController from "./controllers/geodata.controller.js"
import ReportController from "./controllers/report.controller.js"
import UsersController from "./controllers/users.controller.js"
import express from "express"
import { Server as HttpServer } from "http"
import helmet from "helmet"
import * as Config from "./services/config.service.js"
import cors from "cors"


export default class TransDBBackendServer extends Server {
	private server!: HttpServer;

	constructor() {
		super(process.env.NODE_ENV === "development");

		this.app.use(helmet());
		this.app.use(express.json());
		this.app.use(cors({ origin: Config.config.web.CORSOrigins }));

		this.setupControllers();
	}

	private setupControllers(): void {
		const defaultController = new DefaultController();
		const entriesController = new EntriesController();
		const geodataController = new GeodataController();
		const reportController = new ReportController();
		const usersController = new UsersController();

		super.addControllers([
			defaultController,
			entriesController,
			geodataController,
			reportController
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
