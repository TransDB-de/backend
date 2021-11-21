import TransDBBackendServer from "./server.js"
import cleanup from "node-cleanup"
import * as Config from "./services/config.service.js"
import * as Database from "./services/database.service.js"

// Config
Config.initConfig();

Database.connect();

// Start server
const server = new TransDBBackendServer();
server.start(Config.config.web.port);


cleanup(() => {
	server.stop();
});