import * as fs from "fs";
import { customAlphabet } from "nanoid";


const nanoid = customAlphabet('0123456789abcdefghijklmnopqurstuvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_.', 64);

const defaultConfig = {
    info: {
        name: "TransDB",
        github: "",
        version: "0.1.0"
    },
    mongodb: {
        host: "localhost",
        username: "transdb",
        password: "",
        database: "transdb",
        itemsPerPage: 10
    },
    web: {
        port: 1300,
        frontEndURL: "http://localhost:8080/",
        enableCORS: true,
        CORSOrigins: ["http://localhost:8080"]
    },
    osm: {
        apiUrl: "https://nominatim.openstreetmap.org/search",
        userAgent: "transdb.de/0.1.0 (axios)"
    },
    jwt: {
        secret: "",
        expiresIn: "1h"
    },
};

// define type based on default config, so that all configs match this type in code
type Config = typeof defaultConfig;

export const configPath = "./config.json";

export let config: Config;

/**
 * Loads the config from disk, or creates a template config file if none was found
 */
export function initConfig() {

    // create config with default schema if not exists
    if (!fs.existsSync(configPath) || fs.readFileSync(configPath).toString() === "") {
        
        config.jwt.secret = nanoid();
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

        console.warn("--- [ Config ] ---\n" +
            "No config file found. A new one has been created. Please fill in data and restart the application!");

        process.exit();

    }

    // get the config
    let cfgFile = fs.readFileSync(configPath).toString();

    config = JSON.parse(cfgFile);

    console.log("[Config] Loaded");

}

export function getMongoUrl() {
    // additional assertion to avoid config file set-up mistakes
    for (let [key, val] of Object.entries( config.mongodb )) {
        if (val === "") {
            console.warn("--- [ Config ] ---\n" +
                `Please fill in "${key}" under "mongodb" in the config file. Settings in "mongodb" must not be empty!`);

            process.exit();
        }
    }

    return `mongodb://${config.mongodb.username}:${config.mongodb.password}@${config.mongodb.host}/?authSource=${config.mongodb.database}`;
}
