// import node modules
const MongoDB = require("mongodb");

// import services
const Config = require("./config");

class Database{

    static connected;

    static connect(){

        Database.client = new MongoDB.MongoClient(Config.getMongoUrl(), { tls: false, useUnifiedTopology: true });

        Database.client.connect((err) => {

            if (err) {
                console.error(err);
                return;
            }

            Database.db = this.client.db(Config.config.mongodb.database);

            console.log("[mongodb] Successful connected");

            // Add index for genoear queries
            Database.db.collection("entries").createIndex({ location: "2dsphere" });
            Database.db.collection("geodata").createIndex({ name: "text", plz: "text" });

            // Call connected method (specified in main.js)
            Database.connected();

        });

    }

    /*
	* User management
	* */

    /**
     * Create a user and save them into the database
     * @param username
     * @param email
     * @param password
     * @param admin
     * @returns {Promise<object>} A user object
     */
    static async createUser(username, email, password, admin = false){

        let user = {
            username,
            email,
            password,
            registerDate: new Date(),
            lastLogin: null,
            admin
        };

        let res = await Database.db
            .collection("users")
            .insertOne(user);

        return res.ops[0];

    }

    /**
     * Get a user by id
     * @param userId
     * @returns {object} The user object
     */
    static getUser(userId){

        return Database.db
            .collection("users")
            .findOne({ _id: MongoDB.ObjectId(userId) });

    }

    /**
     * Find a user with a custom mongodb query
     * @param query
     * @returns {object} The user object
     */
    static findUser(query) {

        return Database.db
            .collection("users")
            .findOne(query);

    }

    /**
     * Get an array with all users
     * @returns {Promise<object[]>} Array with all users
     */
    static getAllUsers() {

        return Database.db
            .collection("users")
            .find({}, {
                projection: {
                    username: true,
                    email: true,
                    registerDate: true,
                    lastLogin: true,
                    admin: true
                }
            }).toArray();
    }

    /**
     * Update userdata by user id
     * @param userId
     * @param updater Fields to update
     * @returns {Promise<Boolean>} Boolean indicating the success of the update
     */
    static async updateUser(userId, updater){

        let res = await Database.db
            .collection("users")
            .updateOne({ _id: MongoDB.ObjectId(userId) }, { $set: updater }, { returnOriginal: false });

        return !!res.modifiedCount;

    }

    /**
     * Delete a user by id
     * @param userId
     * @returns {Promise<boolean>} Boolean indicating the success of the delete
     */
    static async deleteUser(userId){

        let res = await Database.db
            .collection("users")
            .deleteOne({ _id: MongoDB.ObjectId(userId) });

        return !!res.deletedCount;

    }

    /*
	* Entry management
	* */

    /**
     * Add an entry to the database
     * @param entry A full entry object
     * @returns {object} The new entry
     */
    static async addEntry(entry) {

        let res = await Database.db
            .collection("entries")
            .insertOne(entry);

        return res.ops[0];

    }

    /**
     * Get an entry by id
     * @param entryId
     * @returns {object|null} The entry
     */
    static getEntry(entryId) {

        return Database.db
            .collection("entries")
            .findOne({ _id: MongoDB.ObjectId(entryId) });

    }

    /**
     * Find entries with a custom mongodb query
     * @param query
     * @param page
     * @returns {object[]} Array with entry objects
     */
    static findEntries(query, page) {

        let limit = Config.config.mongodb.itemsPerPage;
        let skip = limit * page;

        return Database.db
            .collection("entries")
            .find(query).skip(skip).limit(limit).toArray();

    }

    /**
     *
     * @param lat Latitude
     * @param long Longitude
     * @param query MongoDB Query
     * @param page
     * @returns {Promise<object[]>} Array with entry objects
     */
    static findEntriesWithLocation(lat, long, query = {}, page = 0) {

        let limit = Config.config.mongodb.itemsPerPage;
        let skip = limit * page;

        return Database.db
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
     * @returns {Promise<boolean>} Boolean indicating the success of the update
     */
    static async updateEntry(id, updater) {

        let res = await Database.db
            .collection("entries")
            .updateOne({ _id: MongoDB.ObjectId(id) }, { $set: updater }, { returnOriginal: false });

        return !!res.modifiedCount;

    }

    /**
     * Delete an entry by id
     * @param id
     * @returns {Promise<boolean>} Boolean indicating the success of the delete
     */
    static async deleteEntry(id) {

        let res = await Database.db
            .collection("entries")
            .deleteOne({ _id: MongoDB.ObjectId(id) });

        return !!res.deletedCount;

    }

    /*
    * Geodata management
    * Base on: http://opengeodb.giswiki.org/wiki/OpenGeoDB
    * */

    /**
     * Find geo data by city name or postal code
     * @param search Either postalcode or city name
     * @returns {Promise<object[]>} Array with objects of cityname, lat and long
     */
    static async findGeoData(search) {

        search = search.toString();

        return Database.db
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

}


module.exports = Database;