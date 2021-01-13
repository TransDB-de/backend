// third-party modules
import express from "express";

import * as Api from "../api/api";

// Require services
import { config } from "../services/config.js";

// Path in URL
export const path = "/";

export const router = express.Router() as IRouter<Api.Default>;

// Base route to get basic information about this API. The data can be changed in the config file.
router.get("/", (req, res) => {

    res.send(config.info);

});
