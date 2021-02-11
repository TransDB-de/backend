// third-party modules
import * as express from "express";

// services
import * as Entry from "../services/entry.js";
import * as Database from "../services/database.js";

import * as Api from "../api/api";

// utils
import validate, { validateId, validateManually } from "../utils/validate.js";
import auth from "../utils/auth.js";
import queryNumberParser from "../utils/queryNumberParser.js";
import queryArrayParser from "../utils/queryArrayParser.js";
import { ResponseCode } from "../utils/restResponseCodes.js";

// models for input validation
import * as Models from "../models/entry.js";
import { entryEdit } from "../models/entry/edit.js";

// Path in URL
export const path = "/entries";

export const router = express.Router() as IRouter<Api.Entries>;


/**
 * Base route to get and filter entries
 */
router.get("/",
    queryNumberParser(["lat", "long", "page"]),
    queryArrayParser(["offers", "attributes"]),
    async (req, res) => {

        let valRes = validateManually( req.query, Models.filterQuery );

        if(valRes !== true) {
            res.status(ResponseCode.UnprocessableEntity).send(valRes).end();
            return;
        }

        let data = await Entry.filter( req.query );

        res.send(data);
    }
);

/**
 * Route to get unapproved entries
 */
router.get("/unapproved", auth(), async (req, res) => {

    let unapprovedEntries = await Entry.getUnapproved(req.query.page ? req.query.page : 0);

    res.send(unapprovedEntries);

});

/**
 * Route to download a backup file of the database
 */
router.get("/backup", auth({ admin: true }), async (req, res) => {

    let exported = await Database.exportEntries();

    if (!exported) {
        res.status(ResponseCode.InternalServerError).send({ error: "backup_failed" }).end();
        return;
    }

    res.download(exported);

});

/**
 * Route to get full fitlered entries for admins
 */
router.post("/full", auth({ admin: true }), async (req, res) => {

    let entries = await Entry.filterWithFilterLang(req.body);

    if (entries === null) {
        res.status(ResponseCode.UnprocessableEntity).send({ error: "compilation_failed" }).end();
        return;
    }

    res.send(entries);

});

/**
 * Route to create an entry
 */
router.post("/", validate(Models.baseEntry), async (req, res) => {

    // Validation of metadata
    let valRes: true | any;

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

// ------ Parameter Routes ------
// routes containing parameters must always be defined last

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
 * Route to change the approve state of an entry
 */
router.patch("/:id/approve", auth(), validateId, async (req, res) => {

    let entry = await Database.getEntry(req.params.id);

    if (!entry) {
        res.status(ResponseCode.NotFound).send({ error: "not_found" }).end();
        return;
    }

    // Update entry with new approved state
    try {
        await Entry.approve(entry, req.user!.id, req.query.approve);
    }
    catch {
        res.status(ResponseCode.InternalServerError).send({ error: "not_updated" }).end();
        return;
    }

    res.send({ approved: req.query.approve ?? true }).end();

});

router.patch("/:id/edit", auth({admin: true}), validateId, validate(entryEdit), async (req, res) => {

    let entry = await Database.getEntry(req.params.id);

    if(!entry) {
        res.status(ResponseCode.NotFound).send({ error: "not_found" }).end();
        return;
    }

    let updated = await Database.updateEntry(entry, req.body);

    if(!updated) {
        res.status(ResponseCode.InternalServerError).send({ error: "not_edited" }).end();
    }

    res.send().end();

});

router.patch("/:id/updateGeo", auth({admin: true}), validateId, async (req, res) => {

    let entry = await Database.getEntry(req.params.id);

    if(!entry) {
        res.status(ResponseCode.NotFound).send({ error: "not_found" }).end();
        return;
    }

    Database.setGeolocation(entry);

    res.send().end();

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
