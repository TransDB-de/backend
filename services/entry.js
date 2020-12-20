const Database = require("./database");
const OSM = require("./osm");

class EntryService {

    /**
     * Add an entry
     * @param object
     * @returns {Promise<object>} The new entry object
     */
    static async addEntry(object) {

        // Build the entry object
        let entry = {
            type: object.type,
            approved: false,
            name: object.name,
            firstName: object.firstName ? object.firstName : null,
            lastName: object.lastName ? object.lastName : null,
            email: object.email,
            website: object.website ? object.website : null,
            telephone: object.telephone ? object.telephone : null,
            address: {
                city: object.city,
                plz: object.plz,
                street: object.street,
                house: object.house,
            },
            meta: {
                attributes: object.attributes ? object.attributes : null,
                specials: object.specials ? object.specials : null,
                minAge: object.minAge ? object.minAge : null,
                subject: object.subject ? object.subject : null,
                offers: object.offers ? object.offers : null,
            }
        };

        // Get geolocation
        entry.location = await OSM.getGeoByAddress(
            entry.address.city,
            entry.address.plz,
            entry.address.street,
            entry.address.house
        );

        return await Database.addEntry(entry);

    }

    /**
     * Filter and get all entry objects
     * @param filters
     * @returns {Promise<void>}
     */
    static async filter(filters) {

        let data;
        let page = filters.page ? filters.page : 0;

        let query = {};

        if(filters.type) {
            query.type = filters.type;
        }

        if((filters.city || filters.plz) && !query.address) {
            query.address = {};
        }

        if(filters.city) {
            query.address.city = new RegExp(filters.city, "i");
        }

        if(filters.plz) {
            query.address.plz = filters.plz;
        }

        if(filters.search) {
            query.$or = [
                { name: new RegExp(filters.search, "i") },
                { firstName: new RegExp(filters.search, "i") },
                { lastName: new RegExp(filters.search, "i") },
            ]
        }

        if(filters.lat && filters.long) {
            data = await Database.findEntriesWithLocation(filters.lat, filters.long, query, page)
        } else {
            data = await Database.findEntries(query, page);
        }

        return data;

    }

}

module.exports = EntryService;