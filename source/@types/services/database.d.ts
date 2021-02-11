import { Entry as ApiEntry } from "../../api/entries"
import MongoDB from "mongodb";

interface GeoJsonPoint {
    type: "Point",
    coordinates: number[]
}

// Types for services/database.ts

/**
 * User object as stored in database
 * 
 * The User<"in"> and User<"out"> variants, are there because some fields change type,
 * when mongodb outputs them.
 * 
 * "in" is for users which go into the database, and database **in**ternal users
 * 
 * "out" is for users which are returned by the database, external (our **out**side) users
 */
export type User<io extends "in" | "out"> = {
    _id: io extends "in" ? MongoDB.ObjectId : string,
    username: string,
    password: Password,
    email: string,
    registerDate: Date,
    lastLogin: null | Date,
    admin: boolean
}

/**
 * Entry object as stored in database
 * 
 * The Entry<"in"> and Entry<"out"> variants, are there because some fields change type,
 * when mongodb outputs them.
 * 
 * "in" is for entries which go into the database, and database **in**ternal entries
 * 
 * "out" is for entries which are returned by the database, external (our **out**side) entries
 */
export interface Entry<io extends "in" | "out"> extends ApiEntry {
    _id: io extends "in" ? MongoDB.ObjectId : string,
    submittedTimestamp: number,
    approvedTimestamp?: number,
    /** id of user who approved entry */
    approvedBy?: io extends "in" ? MongoDB.ObjectId : string
}

/** Entry object for new database entry */
export type NewDbEntry = Omit<Entry, '_id'>

/** User object for new database entries */
export type NewDbUser = Omit<User, '_id'>

/** Encrypted password with salt, as stored in database */
export interface Password {
    key: string,
    salt: string
}

export interface CollectionMeta {
    about: string
}

export interface GeoData {
    _id: string | MongoDB.ObjectId,
    level: number,
    name: string,
    ascii: string,
    plz: string,
    location: GeoJsonPoint | null,
    referenceLocation: GeoJsonPoint | null
}

export interface EntriesMeta extends CollectionMeta {
    lastChangeTimestamp: number,
    lastExportTimestamp: number
}

export const enum MetaUpdateType {
    Changed,
    Exported
}
