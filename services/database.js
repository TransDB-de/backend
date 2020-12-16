// import node modules
const MongoDB = require("mongodb");

// import services
const Config = require("./config");

class Database{

    static connect(){

        Database.client = new MongoDB.MongoClient(Config.getMongoUrl(), { tls: false, useUnifiedTopology: true });

        Database.client.connect((err) => {

            if (err) {
                console.error(err);
                return;
            }

            Database.db = this.client.db(Config.config.mongodb.database);
            console.log("[mongodb] Successful connected");

        });

    }

}


module.exports = Database;