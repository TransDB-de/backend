// Import modules
const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cleanup = require("node-cleanup");

// Require services
const Config = require("./services/config");
const Database = require("./services/database");

// Init modules and services
const app = express();
Config.initConfig();
Database.connect();

// Middlewares
app.use(express.json());
app.use(helmet());

app.use(cors({ origin: Config.config.web.CORSOrigins }));

// load routes
fs.readdirSync("./routes/").forEach((file) => {

    let route = require("./routes/" + file);
    app.use(route.path, route);

});

// start server
const server = app.listen(Config.config.web.port, () => {
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