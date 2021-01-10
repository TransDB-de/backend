// third-party modules
import * as express from "express";

// services
import * as Entry from "../services/entry.js";
import * as Database from "../services/database.js";

import * as Api from "../api/api.js";

// utils
import validate, { validateId, validateManually } from "../utils/validate.js";
import auth from "../utils/auth.js";
import queryNumberParser from "../utils/queryNumberParser.js";
import { ResponseCode } from "../utils/restResponseCodes.js";

// models for input validation
import * as Models from "../models/entry.js";

// Path in URL
export const path = "/entries";

export const router = express.Router() as IRouter<Api.Entries>;


/**
 * Base route to get and filter entries
 */
router.get("/", queryNumberParser, async (req, res) => {

    let valRes = validateManually( req.query, Models.filterQuery );

    if(valRes !== true) {
        res.status(ResponseCode.UnprocessableEntity).send(valRes).end();
        return;
    }

    let data = await Entry.filter( req.query );

    res.send(data);

});

/**
 * Route to get a single entry
 */
router.get("/:id", validateId, async (req, res) => {

   let entry = await Database.getEntry(req.params.id);

   if(!entry) {
       res.status(ResponseCode.NotFound).send({ error: "not_found" }).end();
       return;
   }

   res.send(entry);

});

/**
 * Route to get unapproved entries
 */
router.get("/unapproved", auth(), async (req, res) => {

    let entries = await Entry.getUnapproved(req.query.page ? req.query.page : 0);

    res.send(entries);

});

/**
 * Route to create an entry
 */
router.post("/", validate(Models.baseForm), async (req, res) => {

    // Validation of metadata
    let valRes;

    switch(req.body.type) {

        case "group":
            valRes = validateManually(req.body, Models.groupMeta);
            break;

        case "therapist":
            valRes = validateManually(req.body, Models.therapistMeta);
            break;

        case "surgeon":
            valRes = validateManually(req.body, Models.surgeonMeta);
            break;

        case "hairremoval":
            valRes = validateManually(req.body, Models.hairRemovalMeta);
            break;
    }

    if (valRes !== true) {
        res.status(ResponseCode.UnprocessableEntity).json(valRes).end();
        return;
    }

    let entry = await Entry.addEntry(req.body);

    res.send(entry);


});

/**
 * Route to change the approve state of an entry
 */
router.patch("/:id/approve", auth(), validateId, async (req, res) => {

    let entry = await Database.getEntry(req.params.id);

    if (!entry) {
        res.status(ResponseCode.NotFound).send({ error: "not_found" }).end();
        return;
    }

    // Invert approved state
    let newApprovedState = !entry.approved;

    // Update entry with new approved state
    let updated = await Database.updateEntry(entry, { approved: newApprovedState });

    if (!updated) {
        res.status(ResponseCode.InternalServerError).send({ error: "not_updated" }).end();
    }

    res.send({ approved: newApprovedState }).end();

});

router.delete("/:id", auth(), validateId, async (req, res) => {

    let entry = await Database.getEntry(req.params.id);

    if(!entry) {
        res.status(ResponseCode.NotFound).send({ error: "not_found" }).end();
        return;
    }

    let deleted = await Database.deleteEntry(req.params.id);

    if(!deleted) {
        res.status(ResponseCode.InternalServerError).send({ error: "not_deleted" }).end();
    }

    res.send().end();

});
