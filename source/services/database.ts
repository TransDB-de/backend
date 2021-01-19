import MongoDB from "mongodb";

import * as OSM from "./osm.js";
import * as Config from "./config.js";

import * as Shell from "../utils/shell.js";
import { convertToAscii } from "../utils/asciiConverter.js";

import { Entry } from "../api/entries";
import { GeoJsonPoint, GeoPlace } from "../api/geo";

import { NewDbEntry, User, NewDbUser, Password, EntriesMeta, MetaUpdateType } from "../@types/services/database";
export { NewDbEntry, User, NewDbUser, Password };

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
            db.collection("entries").createIndex({ location: "2dsphere" }),
            db.collection("geodata").createIndex({ location: "2dsphere" }),

            db.collection("geodata").createIndex({ name: "text", plz: "text", ascii: "text" }),
            db.collection("meta").createIndex({ about: "text" })

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
        .collection("users")
        .insertOne(user);

    return res.ops[0] as User;

}

/**
 * Get a user by id
 * @returns The user object
 */
export async function getUser(userId: string | number): Promise<User | null> {

    return await db
        .collection("users")
        .findOne({ _id: new MongoDB.ObjectId(userId) });

}

/**
 * Find a user with a custom mongodb query
 * @returns The user object
 */
export async function findUser(query: MongoDB.FilterQuery<User>): Promise<User | null> {

    return await db
        .collection("users")
        .findOne(query);

}

/**
 * Get an array with all users
 * @returns Array with all users
 */
export async function getAllUsers() {

    type ProjectedUsers = Pick< User, "username" | "email" | "registerDate" | "lastLogin" | "admin">

    return await db
        .collection("users")
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
export async function updateUser(userId: string | number, updater: Partial<User> ): Promise<boolean> {

    let res = await db
        .collection("users")
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
        .collection("users")
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
        .collection("entries")
        .insertOne(entry);

    updateEntriesMeta();
    return res.ops[0] as Entry;

}

/**
 * Get an entry by id
 * @param entryId
 * @returns The entry
 */
export async function getEntry(entryId: string | number): Promise<Entry | null> {

    return await db
        .collection("entries")
        .findOne({ _id: new MongoDB.ObjectId(entryId) });

}

/**
 * Find entries with a custom mongodb query
 * @param query
 * @param page
 * @returns Array with entry objects
 */
export async function findEntries(query: MongoDB.FilterQuery<Entry>, page: number): Promise<Entry[] | null> {

    let limit = Config.config.mongodb.itemsPerPage;
    let skip = limit * page;

    return await db
        .collection("entries")
        .find(query).skip(skip).limit(limit).toArray();

}

/**
 * Find all entries close to given location
 * @param lat Latitude
 * @param long Longitude
 * @param query MongoDB Query
 * @param page Defaults to 0
 * @returns Array with entry objects
 */
export async function findEntriesAtLocation(locaction: GeoJsonPoint, query: MongoDB.FilterQuery<Entry> = {}, page = 0): Promise<Entry[] | null> {

    let limit = Config.config.mongodb.itemsPerPage;
    let skip = limit * page;

    return await db
        .collection("entries")
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
            { $unset: ["location", "approved"] }
        ]).toArray();

}

/**
 * Update an entry by id
 * @param id
 * @param updater
 * @returns Boolean indicating the success of the update
 */
export async function updateEntry(entry: Entry, updater: Partial<Entry>) {

    let res = await db
        .collection("entries")
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
        .collection("entries")
        .deleteOne({ _id: new MongoDB.ObjectId(id) });

    updateEntriesMeta();
    return Boolean(res.deletedCount);

}

export async function exportEntries(): Promise<string | false> {

    // get meta information about entries collection
    let meta = await db.collection("meta").findOne({ about: "entries" }) as EntriesMeta;
    let path = Config.config.mongodb.backupFolder + meta.lastExportTimestamp + "/entries.json";
    let success = true;

    // Change occured after last export
    if (meta.lastChangeTimestamp > meta.lastExportTimestamp) {

        success = await Shell.exportEntries( Config.getMongoUrl(), Config.config.mongodb.database, path );

        if (success) {
            updateEntriesMeta(MetaUpdateType.Exported);
        }

    }

    // Return path to new export, or false if export failed
    return success ? path : false;

}

/**
 * Updates the metadata for the entry collection.
 * Should be called after every write to the collection
 * @param newEntry if a new entry was added
 */
async function updateEntriesMeta(type = MetaUpdateType.Changed): Promise<void> {

    // Check if entry meta exists
    let meta = await db.collection("meta").findOne({ about: "entries" });

    let time = Date.now();

    // Create one if it dosn't
    if (!meta) {

        const entriesMeta: EntriesMeta = {
            about: "entries",
            lastChangeTimestamp: time,
            lastExportTimestamp: type === MetaUpdateType.Exported ? time : 0
        }

        await db.collection("meta").insertOne(entriesMeta);

    } else {
        let updater: Partial<EntriesMeta>= {};

        if (type === MetaUpdateType.Changed) {

            updater = {
                lastChangeTimestamp: time
            }

        }
        else if (type === MetaUpdateType.Exported) {

            updater = {
                lastExportTimestamp: time
            }

        }


        // Update in Database
        await db
            .collection("meta")
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
        .collection("geodata")
        .find({ $text: { $search: searchStr } })
        .limit(6)
        .sort({ score: { $meta: "textScore"  }, level: -1 })
        .project({
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
        .collection("geodata")
        .aggregate([
            {
                $geoNear: {
                    near: location,
                    distanceField: "distance"
                }
            },
            { $limit: 1 }
        ])
        .project({
            name: true,
            location: true,
            _id: false
        })
        .toArray() as [GeoPlace];
}

/**
 * Sets or updates the geolocation field of an entry, based on the entries adress
 * Due to rate limits, this is not immediate, and may take a while.
 * As the potential execution time might be very high, do not await this in API routes
 * @param entry The entry to update the geoloaction for
 */
export async function setGeolocation(entry: Entry) {

    try {

        let loc = await OSM.getGeoByAddress( entry.address );

        await db
            .collection("entries")
            .updateOne({ _id: new MongoDB.ObjectId(entry._id) }, { $set: { location: loc } });

    } catch {
        // TODO : Error logging?
    }

}
