import TransDBBackendServer from "./server.js"
import cleanup from "node-cleanup"
import * as Config from "./services/config.service.js"
import * as Database from "./services/database.service.js"
import * as UserService from "./services/users.service.js"
import * as Shell from "./util/shell.util.js"

// Config
Config.initConfig();

if(!process.argv.includes("--dev")) {
	await Shell.testForCommands();
}

Database.purgeBackups();

Database.connect();

UserService.loadUserNameCache();

// Start server
const server = new TransDBBackendServer();
server.start(Config.config.web.port);


cleanup(() => {
	Database.client.close()
	server.stop();
	console.log("Application shutdown successful");
});
