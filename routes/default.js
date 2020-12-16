// Import modules
const express = require("express");
const router = express.Router();

// Require services
const Config = require("../services/config");

// Path in URL
router.path = "/";

// Base route to get basic information about this API. The data can be changed in the config file.
router.get("/", (req, res) => {

    res.send(Config.config.info);

});

module.exports = router;