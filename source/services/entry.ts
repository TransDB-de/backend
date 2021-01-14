import * as MongoDB from "mongodb";

import * as Database from "./database.js";

import { NewApiEntry, Entry, Address, FilterQuery } from "../api/entries";


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

    let data: Entry[] | null;
    let page = filters.page ? filters.page : 0;

    let query: MongoDB.FilterQuery<Entry> = {
        approved: true
    };

    if (filters.type) {
        query.type = filters.type;
    }

    // Not searched with geolocation
    if ( !(filters.lat && filters.long) && filters.location) {

        // Add geolocation by plz or city

        let geodata = await Database.findGeoData(filters.location);

        if (geodata[0]) { 
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
