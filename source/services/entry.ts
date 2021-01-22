import * as MongoDB from "mongodb";

import * as Database from "./database.js";

import { NewApiEntry, Entry, Address, FilterQuery, QueriedEntries, GeoData } from "../api/entries";
import { GeoJsonPoint } from "../api/geo";


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
export async function filter(filters: FilterQuery) : Promise<QueriedEntries> {

    let entries;
    let page = filters.page ? filters.page : 0;
    let geoLoc: GeoJsonPoint | null = null;
    let name: string = "";

    let query: MongoDB.FilterQuery<Entry> = {
        approved: true
    };

    if (filters.type) {
        query.type = filters.type;
    }

    // Searched with location
    if (filters.lat && filters.long) {

        let geodata = await Database.findGeoName({
            type: "Point",
            coordinates: [ filters.lat, filters.long ]
        });

        name = geodata[0].name;
        geoLoc = geodata[0].location;

    }
    // Not searched with geolocation
    else if (filters.location) {

        // Add geolocation by plz or city

        let geodata = await Database.findGeoLocation(filters.location);

        if ( geodata[0] ) {
            name = geodata[0].name;
            geoLoc = geodata[0].location;
        }

    }

    if (geoLoc) {
        entries = await Database.findEntriesAtLocation(geoLoc, query, page);
    } else {
        entries = await Database.findEntries(query, page);
    }

    return { entries, locationName: name };

}

/**
 * Get all unnaproved entries on a page as an array
 * @param page Page number to get unapproved entries for. Defaults to 0
 */
export async function getUnapproved(page = 0) {

    return Database.findEntries( {approved: false}, page);

}
