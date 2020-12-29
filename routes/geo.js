// Import modules
const express = require("express");
const router = express.Router();

// Require services
const Database = require("../services/database");

// Path in URL
router.path = "/geodata";

/**
 * Base route to get and filter entries
 */
router.get("/", async (req, res) => {

    if(!req.query.search) {
        res.status(422).end();
        return;
    }

    let data = await Database.findGeoData(req.query.search);

    if(!data[0]) {
        res.status(404).end();
        return;
    }

    res.send(data);

});

module.exports = router;