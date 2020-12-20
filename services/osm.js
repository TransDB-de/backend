const axios = require("axios");

const Config = require("./config");

class OSMService {

    /**
     * Get the coordinates in geojson format from address
     * @param city
     * @param postalcode
     * @param street
     * @param houseNr
     * @returns {Promise<array|boolean>} legacy coordinates array or false if request failed
     */
    static async getGeoByAddress(city, postalcode, street, houseNr) {

        let data;

        try {

            data = await axios.get(Config.config.osm.apiUrl, {
                params: {
                    city, postalcode, street: houseNr + " " + street, format: "geojson"
                },
                headers: {
                    "user-agent": Config.config.osm.userAgent
                }
            });

        } catch (e) {
            return null;
        }

        data = data.data.features[0];

        if(!data) {
            return null
        }

        return data.geometry;

    }

}

module.exports = OSMService;