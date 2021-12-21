import MongoDB from "mongodb"
import FilterLang from "@transdb-de/filter-lang"
import { config } from "./config.service.js"

import * as Database from "./database.service.js"
import * as OSM from "./osm.service.js"

import { stringToRegex } from "../util/regExp.util.js"

import { GeoJsonPoint } from "../models/database/geodata.model.js"
import { DatabaseEntry, DatabaseAddress } from "../models/database/entry.model.js"
import { Entry, FilterFull, FilterQuery } from "../models/request/entries.request.js"
import { AdminFilteredEntries, PublicEntry, QueriedEntries } from "../models/response/entries.response.js"
import { parsePhoneNumberFromString, PhoneNumber } from "libphonenumber-js"

/**
 * Add an entry
 * @param object body of the new entry request
 * @returns The new entry object
 */
export async function addEntry(object: Entry) {
	let address: DatabaseAddress = object.address;
	let internationalPhoneNumber = object.telephone ?? null;
	
	// Parse and unify phone number
	if (object.telephone) {
		let t: string = object.telephone.replace(/[^0-9+()]/g, "");
		let phoneNumber: PhoneNumber | undefined = parsePhoneNumberFromString(t, "DE");
		
		if (phoneNumber) {
			internationalPhoneNumber = phoneNumber.formatInternational();
		}
	}
	
	
	// Build the entry object
	let entry: DatabaseEntry<"in"> = {
		type: object.type,
		approved: false,
		name: object.name,
		firstName: object.firstName ?? null,
		lastName: object.lastName ?? null,
		email: object.email,
		website: object.website ?? null,
		telephone: internationalPhoneNumber,
		address: address,
		location: null,
		meta: {
			attributes: object.meta.attributes ?? null,
			specials: object.meta.specials ?? null,
			minAge: object.meta.minAge ?? null,
			subject: object.meta.subject ?? null,
			offers: object.meta.offers ?? null,
		},
		accessible: object.accessible ?? null,
		submittedTimestamp: Date.now()
	};
	
	return await Database.addEntry(entry);
}

/**
 * Filter and get all entry objects (approved and non-blacklisted)
 * @param filters
 */
export async function filter(filters: FilterQuery) : Promise<QueriedEntries> {
	let entries: PublicEntry[];
	let page = filters.page ? filters.page : 0;
	let geoLoc: GeoJsonPoint | null = null;
	let locationName: string = "";
	
	let query: MongoDB.Filter<DatabaseEntry<"out">> = {
		approved: true,
		blacklisted: { $ne: true }
	};
	
	if (filters.type) {
		query.type = filters.type;
	}
	
	if (filters.offers) {
		query["meta.offers"] = { $in: filters.offers };
	}
	
	if (filters.attributes) {
		query["meta.attributes"] = { $in: filters.attributes };
	}
	
	if (filters.text) {
		query.$or = [
			{ name: stringToRegex(filters.text, "i") },
			{ firstName: stringToRegex(filters.text, "i") },
			{ lastName: stringToRegex(filters.text, "i") }
		]
	}
	
	if (filters.accessible) {
		query.accessible = filters.accessible;
	}
	
	// Searched with location
	if (filters.lat && filters.long) {
		
		let geodata = await Database.findGeoName({
			type: "Point",
			coordinates: [ filters.long, filters.lat ]
		});
		
		locationName = geodata[0].name;
		geoLoc = geodata[0].location;
		
	}
	// Not searched with geolocation
	else if (filters.location) {
		
		// Add geolocation by plz or city
		
		let geodata = await Database.findGeoLocation(filters.location);
		
		if ( geodata[0] ) {
			locationName = geodata[0].name;
			geoLoc = geodata[0].location;
		}
		
	}
	
	if (geoLoc) {
		entries = await Database.findEntriesAtLocation(geoLoc, query, page);
	} else {
		entries = await Database.findEntries(query, page);
	}
	
	let more = !(entries.length < config.mongodb.itemsPerPage);
	
	
	
	return { entries, locationName, more };
}


/**
 * Retrieve full entries via a filter-lang filter
 * @param filters filter-lang generated filters
 */
export async function filterWithFilterLang({filter, page}: FilterFull): Promise<AdminFilteredEntries | null> {
	let pipeline: object[];
	
	// injects manual reference for "approvedBy" username
	let userLookupInjection: FilterLang.Compiler.InjectedStages = {
		approvedBy: [
			{
				$lookup: {
					from: "users", 
					localField: "approvedBy", 
					foreignField: "_id", 
					as: "users"
				}
			}, {
				$set: {
					approvedBy: {
						$first: "$users.username"
					}
				}
			}, {
				$unset: [ "users" ]
			}
		]
	}
	
	// fetch coordinates for location search
	let loc: GeoJsonPoint | undefined;
	if (filter.location && filter.location.locationName) {
		
		let geo = await Database.findGeoLocation(filter.location.locationName);
		
		if (geo.length > 0) {
			loc = geo[0].location;
		}
		
	}
	
	// inser objectID
	const replacer: FilterLang.Compiler.Replacer = {
		_id: (val) => { return new MongoDB.ObjectId(val) }
	}
	
	// attempt compilation
	try {
		pipeline = FilterLang.Compiler.compileToMongoDB(filter, userLookupInjection, ["approvedBy"], loc, replacer);
	} catch {
		return null;
	}
	
	let limit = config.mongodb.itemsPerPage;
	let skip = limit * page;
	
	// append pagination to pipeline
	pipeline = [...pipeline,
		{ $skip: skip },
		{ $limit: limit }
	];
	
	let entries = await Database.findEntriesRaw(pipeline);
	
	let more = !(entries.length < config.mongodb.itemsPerPage);
	
	return { entries, more };
}

/**
 * Get all unnaproved entries on a page as an array
 * @param page (optional) Page number to get unapproved entries for. Defaults to 0
 */
export async function getUnapproved(page = 0): Promise<QueriedEntries> {
	let entries = await Database.findEntries( {
		approved: false,
		blacklisted: { $ne: true }
	}, page);
	
	let more = !(entries.length < config.mongodb.itemsPerPage);
	
	return { entries, more };
}

/**
 * Approve an entry
 * @param entry the entry to approve
 * @param userId the id of the user who approved the entry
 * @param approve (optional) set false to unapprove entry
 * @return whether the entry was updated
 */
export async function approve(entry: DatabaseEntry<"out">, userId: string, approve = true): Promise<boolean> {
	let updater: Partial< DatabaseEntry<"in"> > = {
		approved: approve
	};
	
	if (approve) {
		updater.approvedBy = new MongoDB.ObjectId(userId);
		updater.approvedTimestamp = Date.now();
	}
	
	return await update(entry, updater);
}

/**
 * Update a single Entry and it's Geodata
 * @param entry Entry to update
 * @param updater Patrial Entry acting as updated
 * @returns whether the entry was updated
 */
export async function update(entry: DatabaseEntry<"out">, updater: Partial< DatabaseEntry<"in"> >): Promise<boolean> {
	let updated = await Database.updateEntry(entry, updater);
	
	if (updated) {
		updateGeoLocation(entry);
	}
	
	return updated;
}

/**
 * Queues a GeoLocation update. May take long, do not await this function!
 * @param entry Entry to fetch new GeoLocation for
 */
export async function updateGeoLocation(entry: DatabaseEntry<"out">) {
	try {
		let loc = await OSM.getGeoByAddress( entry.address );
		
		if (loc === null) throw("location not found");
		
		Database.setGeolocation(entry._id!, loc);
	} catch(e: any) {
		// TODO : Error logging?
		console.error("Failed to update GeoLocation: " + e.message)
	}
}
