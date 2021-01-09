import * as MongoDB from "mongodb";

import * as Database from "./database.js";

import { NewApiEntry, Entry, Address, FilterQuery } from "../api/entries.js";


/**
 * Add an entry
 * @returns The new entry object
 */
export async function addEntry(object: NewApiEntry) {

    let address: Address = {
        city: object.city,
        plz: object.plz,
        street: object.street,
        house: object.house
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
        telephone: object.telephone ?? null,
        address: address,
        location: null,
        meta: {
            attributes: object.attributes ?? null,
            specials: object.specials ?? null,
            minAge: object.minAge ?? null,
            subject: object.subject ?? null,
            offers: object.offers ?? null,
        }
    };

    return await Database.addEntry(entry);

}

/**
 * Filter and get all entry objects
 * @param filters
 */
export async function filter(filters: FilterQuery) {

    let data: Entry[];
    let page = filters.page ? filters.page : 0;

    let query: MongoDB.FilterQuery<Entry> = {
        approved: true
    };

    if (filters.type) {
        query.type = filters.type;
    }

    if (filters.search) {

        query.$or = [
            { name: new RegExp(filters.search, "i") },
            { firstName: new RegExp(filters.search, "i") },
            { lastName: new RegExp(filters.search, "i") },
        ]

    }

    // Not searched with geolocation
    if ( !(filters.lat && filters.long) ) {

        // Add geolocation by plz or city
        if (filters.plz || filters.city) {
            let geodata = await Database.findGeoData(filters.city ? filters.city : filters.plz);
            filters.lat = geodata[0].lat;
            filters.long = geodata[0].lon;
        }

    }

    if (filters.lat && filters.long) {
        data = await Database.findEntriesAtLocation(filters.lat, filters.long, query, page)
    } else {
        data = await Database.findEntries(query, page);
    }

    return data;

}

/**
 * Get all unnaproved entries on a page as an array
 * @param page Page number to get unapproved entries for. Defaults to 0
 */
export async function getUnapproved(page = 0) {

    return Database.findEntries( {approved: false}, page);

}
