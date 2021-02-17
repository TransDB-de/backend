import * as fs from "fs";
import { customAlphabet } from "nanoid";
import { IDictionary } from "../api/api";


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
        itemsPerPage: 10,
        backupFolder: "./files/backups/"
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

const configPath = "./config.json";

export let config = defaultConfig;

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

    // check if new fields were added to the default config, and not yet updated in the live config
    let sameFields = checkFields(config, defaultConfig);

    if (!sameFields) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        console.warn("--- [ Config ] ---\n" +
            "Config fields were updated in the release, which were not yet updated in the config file!\n"+
            "Fields were automatically added to config. Please check these new settings, and change them where required.");
    }

    console.log("[Config] Loaded");

}

/**
 * Checks if an object has all fields from compare.
 * If a field is missing, copy the contents of compare, and return false.
 * @param object the object to check
 * @param compare the object to comapre to
 */
function checkFields(object: IDictionary, compare: IDictionary): boolean {

    let matches = true;

    for (let [key, val] of Object.entries( compare )) {

        // copy value from compare if key does not exists on object
        if ( !(key in object) ) {

            object[ key ] = compare[ key ];
            matches = false;

        } else {

            // recursivly check nested objects
            if (typeof val === 'object' && val !== null) {
                matches = checkFields(object[ key ], val) && matches;
            }

        }

    }

    return matches;

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
