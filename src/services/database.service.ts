import MongoDB from "mongodb"
import * as fs from "fs"
import path from "path"

import * as Config from "./config.service.js"

import * as Shell from "../util/shell.util.js";
import { convertToAscii } from "../util/asciiConverter.util.js"

import { GeoJsonPoint, GeoPlace } from "../models/database/geodata.model.js"

import { DatabaseEntry } from "../models/database/entry.model.js";
import { GeoData } from "../models/database/geodata.model.js";
import { CollectionMeta, EntriesCollectionMeta, CollectionMetaUpdateType } from "../models/database/collectionMeta.model.js";
import { PublicEntry } from "../models/response/entries.response.js";
import { filterEntries } from "../util/filter.util.js";

// ------ Globals ------

export let client: MongoDB.MongoClient;

let db: MongoDB.Db;

/**
 * callbak event functions.
 * register callback functions here
 */
export const events = {
	connected: () => {}
};

// ------ Functions ------

export function connect() {

	client = new MongoDB.MongoClient( Config.getMongoUrl(), { tls: false } );

	client.connect((err) => {

		if (err) {
			console.error(err);
			return;
		}

		db = client.db( Config.config.mongodb.database );

		console.log("[mongodb] Successful connected");

		// Resolve all db promises in parallel, then callback sucessfull connection
		Promise.all([

			// Add index for genoear queries
			db.collection<DatabaseEntry<"in">>("entries").createIndex({ location: "2dsphere" }),
			db.collection<GeoData>("geodata").createIndex({ location: "2dsphere" }),

			db.collection<DatabaseEntry<"in">>("entries").createIndex({ name: "text", academicTitle: "text", firstName: "text", lastName: "text", email: "text", webiste: "text", telephone: "text", "address.city": "text", "address.plz": "text", "address.street": "text", "address.house": "text" , "meta.specials": "text" }),

			db.collection<GeoData>("geodata").createIndex({ name: "text", plz: "text", ascii: "text" }),
			db.collection<EntriesCollectionMeta<"in">>("meta").createIndex({ about: "text" })

		]).then(() => {
			// Call connected method (specified in main.js)
			events.connected();
		});

	});

}

// ------ Entry management ------

/**
 * Add an entry to the database
 * @param entry A full entry object
 * @returns Boolean indicating if the entry was added
 */
export async function addEntry(entry: DatabaseEntry<"in">): Promise<MongoDB.ObjectId> {

	let res = await db
		.collection<DatabaseEntry<"in">>("entries")
		.insertOne(entry);

	updateEntriesCollectionMeta();
	return res.insertedId;

}

/**
 * Get an entry by id
 * @param entryId
 * @returns The entry
 */
export async function getEntryById(entryId: string | number): Promise< DatabaseEntry<"out"> | null > {
	return await db
		.collection<DatabaseEntry<"in">>("entries")
		.findOne({ _id: new MongoDB.ObjectId(entryId) }) as unknown as DatabaseEntry<"out">;
}

/**
 * Find entries with a custom mongodb query
 * @param query
 * @param page
 * @returns Array with entry objects
 */
export async function findEntries(query: MongoDB.Filter<DatabaseEntry<"in">>, page: number): Promise<PublicEntry[]> {

	let limit = Config.config.mongodb.itemsPerPage;
	let skip = limit * page;

	let entries = await db
		.collection<DatabaseEntry<"in">>("entries")
		.aggregate([
			{
				$match: query
			},
			{ $sort: { approvedTimestamp: -1, submittedTimestamp: -1, _id: -1 } },
			{ $skip: skip },
			{ $limit: limit }
		]).toArray();
	
	filterEntries(entries);
	return entries;

}

/**
 * Find all entries close to given location
 * @param locaction
 * @param query MongoDB Query
 * @param page Defaults to 0
 * @returns Array with entry objects
 */
export async function findEntriesAtLocation(locaction: GeoJsonPoint, query: MongoDB.Filter<DatabaseEntry<"in">> = {}, page = 0): Promise<PublicEntry[]> {
	let limit = Config.config.mongodb.itemsPerPage;
	let skip = limit * page;

	let entries =  await db
		.collection<DatabaseEntry<"in">>("entries")
		.aggregate([
			{
				$geoNear: {
					near: locaction,
					distanceField: "distance",
					distanceMultiplier: 0.001,
					query: query
				}
			},
			{ $sort: { distance: 1 } },
			{ $skip: skip },
			{ $limit: limit },
			{ $set: { distance: { $round: [ "$distance", 2 ] } } }
		]).toArray();
	
	filterEntries(entries);
	return entries;
}

/**
 * Find entries with all fields via mongodb pipeline
 * @param pipeline aggregation pipeline
 */
export async function findEntriesRaw(pipeline: object[] | undefined): Promise<DatabaseEntry<"out">[]> {
	return await db
		.collection<DatabaseEntry<"in">>("entries")
		.aggregate(pipeline)
		.toArray() as unknown as DatabaseEntry<"out">[];
}

/**
 * Update an entry by id
 * @param entry
 * @param updater
 * @param additionalUpdater
 * @returns boolean indicating the success of the update
 */
export async function updateEntry(entry: DatabaseEntry<"out">, updater: Partial<DatabaseEntry<"in">>, additionalUpdater: MongoDB.UpdateFilter<DatabaseEntry<"in">> = {}): Promise<boolean> {
	let res = await db
		.collection<DatabaseEntry<"in">>("entries")
		.updateOne({ _id: new MongoDB.ObjectId(entry._id) }, { $set: updater, ...additionalUpdater });
	
	let updated = Boolean(res.modifiedCount);
	
	updateEntriesCollectionMeta();
	
	return updated;
}

/**
 * Delete an entry by id
 * @param id
 * @returns boolean indicating the success of the delete
 */
export async function deleteEntry(id: string): Promise<boolean> {
	let res = await db
		.collection<DatabaseEntry<"in">>("entries")
		.deleteOne({ _id: new MongoDB.ObjectId(id) });
	
	updateEntriesCollectionMeta();
	return Boolean(res.deletedCount);
}

export async function exportEntries(): Promise<string | false> {
	
	// get meta information about entries collection
	let meta = await db.collection<CollectionMeta<"in">>("meta").findOne({ about: "entries" }) as unknown as EntriesCollectionMeta<"out">;
	let backupPath = path.join(Config.config.mongodb.backupFolder, meta.lastExportTimestamp.toString(), "/entries.json");
	let success = true;
	
	// Change occured after last export
	if (meta.lastChangeTimestamp > meta.lastExportTimestamp || !fs.existsSync(backupPath)) {
		
		let timestamp = Date.now();
		
		backupPath = path.join(Config.config.mongodb.backupFolder, timestamp.toString(), "entries.json");
		
		success = await Shell.exportEntries( Config.getMongoUrl(), backupPath );
		
		if (success) {
			updateEntriesCollectionMeta(CollectionMetaUpdateType.Exported, timestamp);
		}
		
	}
	
	// Return path to new export, or false if export failed
	return success ? backupPath : false;
	
}

export function purgeBackups(): void {
	
	let backupFolder = Config.config.mongodb.backupFolder;
	
	if (!fs.existsSync(backupFolder)) {
		return;
	}
	
	fs.rmSync(backupFolder, { recursive: true, force: true });
}

/**
 * Updates the metadata for the entry collection.
 * Should be called after every write to the collection
 * @param type
 * @param timestamp
 */
async function updateEntriesCollectionMeta(type = CollectionMetaUpdateType.Changed, timestamp: number = Date.now()): Promise<void> {

	// Check if entry meta exists
	let meta = await db.collection<CollectionMeta<"out">>("meta").findOne({ about: "entries" });
	
	// Create one if it dosn't
	if (!meta) {
		
		const entriesMeta: EntriesCollectionMeta<"in"> = {
			about: "entries",
			lastChangeTimestamp: timestamp,
			lastExportTimestamp: type === CollectionMetaUpdateType.Exported ? timestamp : 0
		}
		
		await db.collection<CollectionMeta<"in">>("meta").insertOne(entriesMeta);
		
	} else {
		let updater: Partial<EntriesCollectionMeta<"in">> = {};
		
		if (type === CollectionMetaUpdateType.Changed) {
			
			updater = {
				lastChangeTimestamp: timestamp
			}
			
		}
		else if (type === CollectionMetaUpdateType.Exported) {
			
			updater = {
				lastExportTimestamp: timestamp
			}
			
		}
		
		
		// Update in Database
		await db
			.collection<CollectionMeta<"in">>("meta")
			.updateOne({ about: "entries" }, { $set: updater });
		
	}
	
}

/*
 Geodata management
 Based on: http://opengeodb.giswiki.org/wiki/OpenGeoDB
 */

/**
 * Find geo data by city name or postal code
 * @param search Either postalcode or city name
 * @returns Array with objects of cityname, and location
 */
export async function findGeoLocation(search: string): Promise<GeoPlace[]> {
	
	search = search.toString();
	
	let ascii = convertToAscii(search);
	
	// Search for input or ascii
	// the ascii is aditionally included to cover more edge cases
	let searchStr = `${search} ${ascii}`;
	
	return await db
		.collection<GeoData>("geodata")
		.aggregate([
			{
				$match: {
					$text: { $search: searchStr }
				}
			},
			{ $sort: { score: { $meta: "textScore" }, level: 1 } },
			{ $limit: 6 }
		])
		.project<GeoPlace>({
			name: true,
			location: { $ifNull: ["$location", "$referenceLocation"] },
			_id: false
		})
		.toArray();
}

/**
 * Finds the name of a nearest location by GeoJsonPoint
 * @param location GeoJsonPoint location
 * @returns Single length array with object of cityname, and location
 */
export async function findGeoName(location: GeoJsonPoint): Promise<GeoPlace[]> {
	return await db
		.collection<GeoData>("geodata")
		.aggregate([
			{
				$geoNear: {
					near: location,
					distanceField: "distance"
				}
			},
			{ $limit: 1 }
		])
		.project<GeoPlace>({
			name: true,
			location: true,
			_id: false
		})
		.toArray();
}

/**
 * Sets or updates the geolocation field of an entry
 * @param id Id of the entry
 * @param location GeoJsonPoint
 */
export async function setGeolocation(id: string, location: GeoJsonPoint): Promise<boolean> {
	let updateResult =  await db
			.collection<DatabaseEntry<"in">>("entries")
			.updateOne({ _id: new MongoDB.ObjectId(id) }, { $set: { location } });
			
	return Boolean(updateResult.modifiedCount);
}
