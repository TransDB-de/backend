// Import modules
import fs from "fs";
import path from 'path';
import url from 'url';

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cleanup from "node-cleanup";

// Import services
import * as Config from "./services/config.js";
import * as Database from "./services/database.js";
import * as User from "./services/user.js";

import * as Shell from "./utils/shell.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Init modules and services
const app = express();
Config.initConfig();

// Check if required shell commands are installed
await Shell.testForCommands();

Database.events.connected = async () => {
    await User.generateDefaultUserIfRequired();
};

Database.connect();

// Middlewares
app.use( express.json() );
app.use( helmet() );

app.use( cors({ origin: Config.config.web.CORSOrigins }) );

// load routes
let files = fs.readdirSync( path.resolve(__dirname, "./routes/") );

for (let file of files) {
    // If its not a .js file, skip this file
    if ( !file.match(/^.*\.js$/) ) continue;

    let routeModule = await import("./routes/" + file);
    app.use(routeModule.path, routeModule.router);
}

// start server
const server = app.listen( Config.config.web.port, () => {
    console.log(`[express] Server running on ${Config.config.web.port}`)
});

// do cleanup on exit
cleanup(() => {

    console.log("[mongodb] close client...");
    Database.client.close();
    console.log("[express] close server...");
    server.close();

    console.log("Application shutdown successful!");

});