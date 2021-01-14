import MongoDB from "mongodb";

import * as OSM from "./osm.js";
import * as Config from "./config.js";

import { Entry, GeoData } from "../api/entries";

import { NewDbEntry, User, NewDbUser, Password } from "../@types/services/database";
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

        // Add index for genoear queries
        let entryPromise = db.collection("entries").createIndex({ location: "2dsphere" });
        let geodataPromise = db.collection("geodata").createIndex({ name: "text", plz: "text" });

        // Resolve all db promises in parallel, then callback sucessfull connection
        Promise.all([ entryPromise, geodataPromise ]).then(() => {
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

    type ProjectedUsers = Pick< User, keyof {
        username,
        email,
        registerDate,
        lastLogin,
        admin
    }>

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
export async function findEntriesAtLocation(lat: number, long: number, query: MongoDB.FilterQuery<Entry> = {}, page = 0): Promise<Entry[] | null> {

    let limit = Config.config.mongodb.itemsPerPage;
    let skip = limit * page;

    return await db
        .collection("entries")
        .aggregate([
            {
                $geoNear: {
                    near: [ long , lat ],
                    distanceField: "distance",
                    spherical: true,
                    distanceMultiplier: 6371,
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

    return Boolean(res.deletedCount);

}

/*
 Geodata management
 Based on: http://opengeodb.giswiki.org/wiki/OpenGeoDB
 */

/**
 * Find geo data by city name or postal code
 * @param search Either postalcode or city name
 * @returns Array with objects of cityname, lat and long
 */
export async function findGeoData(search: string): Promise<GeoData[]> {

    search = search.toString();

    return await db
        .collection("geodata")
        .find({ $text: { $search: search }, level: { $nin: ["1", "2", "3", "4", "5"] } })
        .limit(6)
        .sort({ score: { $meta: "textScore"  }, name: 1 })
        .project({
            lat: { $toDouble: "$lat" },
            lon: { $toDouble: "$lon" },
            name: true,
            _id: false
        })
        .toArray();

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
