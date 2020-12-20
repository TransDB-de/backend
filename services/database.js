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

            // Call connected method (specified in main.js)
            Database.connected();

        });

    }

    /*
	* User management
	* */
    static createUser(username, email, password, admin = false){

        let user = {
            username,
            email,
            password,
            registerDate: new Date(),
            lastLogin: null,
            admin
        };

        return new Promise((resolve, reject) => {

            Database.db
                .collection("users")
                .insertOne(user)
                .then(res => {
                    resolve(res.ops[0]);
                })
                .catch(err => {
                    reject(err);
                })

        });

    }

    static getUser(query){

        return Database.db
            .collection("users")
            .findOne(query);

    }

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

    static updateUser(query, values){

        return Database.db
            .collection("users")
            .updateOne(query, values, { returnOriginal: false });

    }

    static async deleteUser(query){

        await Database.db
            .collection("users")
            .deleteOne(query);

        return true;

    }

    /*
	* Entry management
	* */
    static addEntry(entry) {

        return Database.db
            .collection("entries")
            .insertOne(entry)

    }

}


module.exports = Database;