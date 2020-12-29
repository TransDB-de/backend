// Import modules
const express = require("express");
const router = express.Router();

// Require services
const Entry = require("../services/entry");
const Database = require("../services/database");

// Require utils
const validate = require("../utils/validate");
const { validateId } = require("../utils/validate");
const auth = require("../utils/auth");
const queryNumberParser = require("../utils/queryNumberParser");

// Models for input validation
const { baseForm, groupMeta, therapistMeta, surgeonMeta, hairRemovalMeta, filterQuery } = require("../models/entry");

// Path in URL
router.path = "/entries";

/**
 * Base route to get and filter entries
 */
router.get("/", queryNumberParser, async (req, res) => {

    let valRes = validate.validate(req.query, filterQuery);

    if(valRes !== true) {
        res.status(422).send(valRes).end();
        return;
    }

    let data = await Entry.filter(req.query);

    res.send(data);

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
router.post("/", validate(baseForm), async (req, res) => {

    // Validation of metadata
    let valRes;

    if(req.body.type === "group") {
        valRes = validate.validate(req.body, groupMeta);
    } else if(req.body.type === "therapist") {
        valRes = validate.validate(req.body, therapistMeta);
    } else if(req.body.type === "surgeon") {
        valRes = validate.validate(req.body, surgeonMeta);
    } else if(req.body.type === "hairremoval") {
        valRes = validate.validate(req.body, hairRemovalMeta);
    }

    if(valRes !== true) {
        res.status(422).json(valRes).end();
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

    if(!entry) {
        res.status(404).send({ error: "not_found" }).end();
        return;
    }

    // Invert approved state
    let newApprovedState = !entry.approved;

    // Update entry with new approved state
    let updated = await Database.updateEntry(req.params.id, { approved: newApprovedState });

    if(!updated) {
        res.status(500).send({ error: "not_updated" }).end();
    }

    res.send({ approved: newApprovedState }).end();

});

router.delete("/:id", auth(), validateId, async (req, res) => {

    let entry = await Database.getEntry(req.params.id);

    if(!entry) {
        res.status(404).send({ error: "not_found" }).end();
        return;
    }

    // Update entry with new approved state
    let deleted = await Database.deleteEntry(req.params.id);

    if(!deleted) {
        res.status(500).send({ error: "not_deleted" }).end();
    }

    res.send().end();

});

module.exports = router;