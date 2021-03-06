// third-party modules
import express from "express";

import * as Api from "../api/api";

// services
import * as Database from "../services/database.js";

import { ResponseCode } from "../utils/restResponseCodes.js";

// Path in URL
export const path = "/geodata";

export const router = express.Router() as IRouter<Api.GeoData>;

/**
 * Base route to get and filter entries
 */
router.get("/", async (req, res) => {

    if( !req.query.search ) {
        res.status(ResponseCode.UnprocessableEntity).end();
        return;
    }

    let data = await Database.findGeoLocation(req.query.search);

    if ( !data[0] ) {
        res.status(ResponseCode.NotFound).end();
        return;
    }

    res.send(data);

});
