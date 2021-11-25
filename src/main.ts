import TransDBBackendServer from "./server.js"
import cleanup from "node-cleanup"
import * as Config from "./services/config.service.js"
import * as Database from "./services/database.service.js"
import * as UserService from "./services/users.service.js";

// Config
Config.initConfig();

// Database
Database.events.connected = async () => {
	await UserService.generateDefaultUserIfRequired();
};

Database.connect();

// Start server
const server = new TransDBBackendServer();
server.start(Config.config.web.port);


cleanup(() => {
	server.stop();
});
