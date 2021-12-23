import { ObjectId } from "mongodb"
import { GeoJsonPoint } from "./geodata.model.js"

/**
 * Entry object as stored in database
 * 
 * The Entry<"in"> and Entry<"out"> variants exist because some fields change type
 * when mongodb outputs them.
 * 
 * "in" is for Entries which go into the database, or **in**putted Entries.
 * 
 * "out" is for Entries which are returned by the database, or **out**putted Entries.
 */
export interface DatabaseEntry<io extends "in" | "out"> {
	_id?: io extends "in" ? ObjectId : string,
	approved?: boolean,
	blocked?: boolean,
	type: string,
	name: string,
	telephone?: string | null,
	website?: string | null,
	email?: string | null,
	firstName?: string | null,
	lastName?: string | null,
	address: DatabaseAddress,
	location: GeoJsonPoint | null,
	meta: DatabaseEntryMeta,
	accessible?: "yes" | "no" | "unknown" | null,
	
	submittedTimestamp: number,
	approvedTimestamp?: number,
	
	/** id of user who approved entry */
	approvedBy?: io extends "in" ? ObjectId : string,
	distance?: io extends "out" ? number : undefined
	
	possibleDuplicate?: io extends "in" ? ObjectId : string
}

export interface DatabaseAddress {
	city: string,
	plz?: string,
	street?: string,
	house?: string
}

export interface DatabaseEntryMeta {
	attributes?: string[] | null,
	specials?: string | null,
	subject?: string | null,
	offers?: string[] | null,
	minAge?: number | null
}
