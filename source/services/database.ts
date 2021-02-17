import MongoDB from "mongodb";
import * as fs from "fs";

import * as OSM from "./osm.js";
import * as Config from "./config.js";

import * as Shell from "../utils/shell.js";
import { convertToAscii } from "../utils/asciiConverter.js";

import { GeoJsonPoint, GeoPlace } from "../api/geo";

import { NewDbEntry, User, Entry, NewDbUser, Password, GeoData, EntriesMeta, MetaUpdateType, CollectionMeta } from "../@types/services/database";
export { NewDbEntry, User, Entry, NewDbUser, Password };

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

    client = new MongoDB.MongoClient( Config.getMongoUrl(), { tls: false, useUnifiedTopology: true } );

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
            db.collection<Entry<"in">>("entries").createIndex({ location: "2dsphere" }),
            db.collection<GeoData>("geodata").createIndex({ location: "2dsphere" }),

            db.collection<Entry<"in">>("entries").createIndex({ name: "text", firstName: "text", lastName: "text", email: "text", webiste: "text", telephone: "text", "address.city": "text", "address.plz": "text", "address.street": "text", "address.house": "text" , "meta.specials": "text" }),

            db.collection<GeoData>("geodata").createIndex({ name: "text", plz: "text", ascii: "text" }),
            db.collection<EntriesMeta>("meta").createIndex({ about: "text" })

        ]).then(() => {
            // Call connected method (specified in main.js)
            events.connected();
        });

    });

}

/*
* User management
* */

/**
 * Create a user and save them into the database
 * @returns a new user object
 */
export async function createUser(username: string, email: string, password: Password, admin = false) {

    let user: NewDbUser = {
        username,
        email,
        password,
        registerDate: new Date(),
        lastLogin: null,
        admin
    };

    let res = await db
        .collection<User<"in">>("users")
        .insertOne(user);

    return res.ops[0] as unknown as User<"out">;

}

/**
 * Get a user by id
 * @returns The user object
 */
export async function getUser(userId: string | number): Promise<User<"out"> | null> {

    return await db
        .collection<User<"in">>("users")
        .findOne({ _id: new MongoDB.ObjectId(userId) });

}

/**
 * Find a user with a custom mongodb query
 * @returns The user object
 */
export async function findUser(query: MongoDB.FilterQuery<User<"in">>): Promise<User<"out"> | null> {

    return await db
        .collection<User<"in">>("users")
        .findOne(query);

}

/**
 * Get an array with all users
 * @returns Array with all users
 */
export async function getAllUsers() {

    type ProjectedUsers = Pick< User<"out">, "username" | "email" | "registerDate" | "lastLogin" | "admin">

    return await db
        .collection<User<"in">>("users")
        .find({}, {
            projection: {
                username: true,
                email: true,
                registerDate: true,
                lastLogin: true,
                admin: true
            }
        }).toArray() as ProjectedUsers[];
}

/**
 * Update userdata by user id
 * @param userId
 * @param updater Fields to update
 * @returns {Promise<Boolean>} Boolean indicating the success of the update
 */
export async function updateUser(userId: string | number, updater: Partial<User<"in">> ): Promise<boolean> {

    let res = await db
        .collection<User<"in">>("users")
        .updateOne({ _id: new MongoDB.ObjectId(userId) }, { $set: updater });

    return Boolean(res.modifiedCount);

}

/**
 * Delete a user by id
 * @param userId
 * @returns {Promise<boolean>} Boolean indicating the success of the delete
 */
export async function deleteUser(userId: string | number) {

    let res = await db
        .collection<User<"in">>("users")
        .deleteOne({ _id: new MongoDB.ObjectId(userId) });

    return Boolean(res.deletedCount);

}

// ------ Entry management ------

/**
 * Add an entry to the database
 * @param entry A full entry object
 * @returns The new entry
 */
export async function addEntry(entry: NewDbEntry) {

    let res = await db
        .collection<Entry<"in">>("entries")
        .insertOne(entry);

    updateEntriesMeta();
    return res.ops[0] as unknown as Entry<"out">;

}

/**
 * Get an entry by id
 * @param entryId
 * @returns The entry
 */
export async function getEntry(entryId: string | number): Promise<Entry<"out"> | null> {

    return await db
        .collection<Entry<"in">>("entries")
        .findOne({ _id: new MongoDB.ObjectId(entryId) });

}

/**
 * Find entries with a custom mongodb query
 * @param query
 * @param page
 * @returns Array with entry objects
 */
export async function findEntries(query: MongoDB.FilterQuery<Entry<"out">>, page: number): Promise<Entry<"out">[]> {

    let limit = Config.config.mongodb.itemsPerPage;
    let skip = limit * page;

    let entries = await db
        .collection<Entry<"in">>("entries")
        .aggregate([
            {
                $match: query
            },
            { $sort: { approvedTimestamp: -1, submittedTimestamp: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $unset: ["location", "approvedBy", "approvedTimestamp", "submittedTimestamp"] }
        ]).toArray();

    return entries as unknown as Entry<"out">[];

}

/**
 * Find all entries close to given location
 * @param locaction
 * @param query MongoDB Query
 * @param page Defaults to 0
 * @returns Array with entry objects
 */
export async function findEntriesAtLocation(locaction: GeoJsonPoint, query: MongoDB.FilterQuery<Entry<"out">> = {}, page = 0): Promise<Entry<"out">[]> {

    let limit = Config.config.mongodb.itemsPerPage;
    let skip = limit * page;

    return await db
        .collection<Entry<"in">>("entries")
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
            { $set: { distance: { $round: [ "$distance", 2 ] } } },
            { $unset: ["location", "approvedBy", "approvedTimestamp", "submittedTimestamp"] }
        ]).toArray() as unknown as Entry<"out">[];

}

/**
 * 
 * @param pipeline mongodb
 */
export async function findEntriesRaw(pipeline: object[] | undefined): Promise<Entry<"out">[]> {

    return await db
        .collection<Entry<"in">>("entries")
        .aggregate(pipeline)
        .toArray() as unknown as Entry<"out">[];

}

/**
 * Update an entry by id
 * @param entry
 * @param updater
 * @returns Boolean indicating the success of the update
 */
export async function updateEntry(entry: Entry<"out">, updater: Partial<Entry<"in">>) {

    let res = await db
        .collection<Entry<"in">>("entries")
        .updateOne({ _id: new MongoDB.ObjectId(entry._id) }, { $set: updater });

    let updated = Boolean(res.modifiedCount);

    // Check if Geolocation needs updating
    if (updated) {

        // If the entry was first approved
        if (!entry.approved && updater.approved) {
            setGeolocation(entry);
        }
        // If the address was changed
        else if (updater.address) {
            setGeolocation(entry);
        }

        updateEntriesMeta();

    }

    return updated;

}

/**
 * Delete an entry by id
 * @param id
 * @returns Boolean indicating the success of the delete
 */
export async function deleteEntry(id: string | number) {

    let res = await db
        .collection<Entry<"in">>("entries")
        .deleteOne({ _id: new MongoDB.ObjectId(id) });

    updateEntriesMeta();
    return Boolean(res.deletedCount);

}

export async function exportEntries(): Promise<string | false> {

    // get meta information about entries collection
    let meta = await db.collection<CollectionMeta>("meta").findOne({ about: "entries" }) as EntriesMeta;
    let path = Config.config.mongodb.backupFolder + meta.lastExportTimestamp + "/entries.json";
    let success = true;

    // Change occured after last export
    if (meta.lastChangeTimestamp > meta.lastExportTimestamp || !fs.existsSync(path)) {

        let timestamp = Date.now();

        path = Config.config.mongodb.backupFolder + timestamp + "/entries.json";

        success = await Shell.exportEntries( Config.getMongoUrl(), Config.config.mongodb.database, path );

        if (success) {
            updateEntriesMeta(MetaUpdateType.Exported, timestamp);
        }

    }

    // Return path to new export, or false if export failed
    return success ? path : false;

}

/**
 * Updates the metadata for the entry collection.
 * Should be called after every write to the collection
 * @param type
 */
async function updateEntriesMeta(type = MetaUpdateType.Changed, timestamp: number = Date.now()): Promise<void> {

    // Check if entry meta exists
    let meta = await db.collection<CollectionMeta>("meta").findOne({ about: "entries" });

    // Create one if it dosn't
    if (!meta) {

        const entriesMeta: EntriesMeta = {
            about: "entries",
            lastChangeTimestamp: timestamp,
            lastExportTimestamp: type === MetaUpdateType.Exported ? timestamp : 0
        }

        await db.collection<CollectionMeta>("meta").insertOne(entriesMeta);

    } else {
        let updater: Partial<EntriesMeta>= {};

        if (type === MetaUpdateType.Changed) {

            updater = {
                lastChangeTimestamp: timestamp
            }

        }
        else if (type === MetaUpdateType.Exported) {

            updater = {
                lastExportTimestamp: timestamp
            }

        }


        // Update in Database
        await db
            .collection<CollectionMeta>("meta")
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
export async function findGeoLocation(search: string) {

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
            { $sort: { score: { $meta: "textScore"  }, level: -1 } },
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
export async function findGeoName(location: GeoJsonPoint) {
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
 * Sets or updates the geolocation field of an entry, based on the entries adress
 * Due to rate limits, this is not immediate, and may take a while.
 * As the potential execution time might be very high, do not await this in public API routes
 * @param entry The entry to update the geoloaction for
 */
export async function setGeolocation(entry: Entry<"out">) {

    try {

        let loc = await OSM.getGeoByAddress( entry.address );

        await db
            .collection<Entry<"in">>("entries")
            .updateOne({ _id: new MongoDB.ObjectId(entry._id) }, { $set: { location: loc } });

    } catch {
        // TODO : Error logging?
    }

}
