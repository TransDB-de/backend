import * as fs from "fs";
import { customAlphabet } from "nanoid";
import IDictionary from "../types/dictionary";

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
	entryDuplicateSearchThreshold: 3,
	web: {
		port: 1300,
		enableCORS: true,
		trustProxy: true,
		CORSOrigins: ["http://localhost:8080"]
	},
	osm: {
		apiUrl: "https://nominatim.openstreetmap.org/search",
		userAgent: "transdb.de/2.0.0 (axios)"
	},
	jwt: {
		secret: "",
		expiresIn: "1h"
	},
	csrfProtection: {
		active: false,
		secret: ""
	},
	rateLimit: {
		newEntries: {
			timeframeMinutes: 5,
			maxRequests: 3
		},
		report: {
			timeframeMinutes: 5,
			maxRequests: 3
		},
		login: {
			timeframeMinutes: 5,
			maxRequests: 5
		}
	},
	slowDown: {
		entries: {
			timeframeSeconds: 20,
			maxRequests: 5,
			delayMs: 200,
			maxDelayMs: 1200,
		}
	},
	discordWebhookURL: "",
	reportEntryURL: "https://transdb.de/manage/database?id=",
	atlassian: {
		apiURL: "",
		username: "",
		key: "",
		projectId: "",
		customfieldReportTypeMapping: {
			edit: "10026",
			report: "10027",
			other: "10028"
		},
		issueTypes: {
			report: "10003",
			newEntry: "10014"
		},
		customfieldURL: "customfield_10040",
		customFieldReportType: "customfield_10041"
	}
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
		config.csrfProtection.secret = nanoid();
		
		fs.writeFileSync(configPath, JSON.stringify(config, null, '\t'));
		
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
			if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
				matches = checkFields(object[key] as IDictionary, val) && matches;
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
	
	return `mongodb://${config.mongodb.username}:${config.mongodb.password}@${config.mongodb.host}/${config.mongodb.database}?authSource=${config.mongodb.database}`;
}
