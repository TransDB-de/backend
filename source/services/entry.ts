import MongoDB from "mongodb";
import FilterLang from "@transdb-de/filter-lang";
import { config } from "./config.js";

import * as Database from "./database.js";

import { NewApiEntry, Entry, Address, FilterQuery, QueriedEntries, FullEntry, FilterFull, FilteredEntries } from "../api/entries";
import { GeoJsonPoint } from "../api/geo";

import { stringToRegex } from "../utils/regExp.js";
import { parsePhoneNumber, PhoneNumber } from "libphonenumber-js";

/**
 * Add an entry
 * @param object body of the new entry request
 * @returns The new entry object
 */
export async function addEntry(object: NewApiEntry) {

	let address: Address = {
		city: object.city,
		plz: object.plz,
		street: object.street,
		house: object.house
	}
	
	let nationalPhoneNumber = object.telephone ?? null;
	
	// Parse and unify phone number
	if (object.telephone) {
		let phoneNumber: PhoneNumber = parsePhoneNumber(object.telephone, "DE");
		if (phoneNumber) {
			nationalPhoneNumber = phoneNumber.formatNational();
		}
	}

	// Build the entry object
	let entry: Database.NewDbEntry = {
		type: object.type,
		approved: false,
		name: object.name,
		firstName: object.firstName ?? null,
		lastName: object.lastName ?? null,
		email: object.email,
		website: object.website ?? null,
		telephone: nationalPhoneNumber,
		address: address,
		location: null,
		meta: {
			attributes: object.attributes ?? null,
			specials: object.specials ?? null,
			minAge: object.minAge ?? null,
			subject: object.subject ?? null,
			offers: object.offers ?? null,
		},
		accessible: object.accessible ?? null,
		submittedTimestamp: Date.now()
	};

	return await Database.addEntry(entry);

}

/**
 * Filter and get all entry objects
 * @param filters
 * @param full (optional) Full entry view for admins
 */
export async function filter(filters: FilterQuery) : Promise<QueriedEntries> {

	let entries: Entry[];
	let page = filters.page ? filters.page : 0;
	let geoLoc: GeoJsonPoint | null = null;
	let locationName: string = "";

	let query: MongoDB.FilterQuery<Entry> = {
		approved: true
	};

	if (filters.type) {
		query.type = filters.type;
	}

	if(filters.offers) {
		query["meta.offers"] = { $in: filters.offers };
	}

	if(filters.attributes) {
		query["meta.attributes"] = { $in: filters.attributes };
	}

	if(filters.text) {
		query.$or = [
			{ name: stringToRegex(filters.text, "i") },
			{ firstName: stringToRegex(filters.text, "i") },
			{ lastName: stringToRegex(filters.text, "i") }
		]
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
export async function filterWithFilterLang({filter, page}: FilterFull): Promise<FilteredEntries | null> {
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
export async function getUnapproved(page = 0): Promise<{ entries: Database.Entry<"out">[], more: boolean }> {

	let entries = await Database.findEntries( {approved: false}, page);

	let more = !(entries.length < config.mongodb.itemsPerPage);

	return { entries, more };
}

/**
 * Approve an entry
 * @param entry the entry to approve
 * @param userId the id of the user who approved the entry
 * @param approve (optional) set false to unapprove entry
 */
export async function approve(entry: Database.Entry<"out">, userId: string, approve = true) {

	let updater: Partial< Database.Entry<"in"> > = {
		approved: approve
	};

	if (approve) {
		updater.approvedBy = new MongoDB.ObjectID(userId);
		updater.approvedTimestamp = Date.now();
	}

	let updated = await Database.updateEntry(entry, updater);

	if (!updated) throw "Database failed to update";

}
