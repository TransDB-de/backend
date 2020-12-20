// Import modules
const express = require("express");
const router = express.Router();

// Require services
const Database = require("../services/database");
const User = require("../services/user");

// Require utils
const validate = require("../utils/validate");
const auth = require("../utils/auth");

const { createUser, loginBody, resetEmail, resetUsername, updatePassword } = require("../models/user");

// Path in URL
router.path = "/users";

/*
* Route to list all users
* */
router.get("/", auth({ admin: true }), async (req, res) => {

    let users = await Database.getAllUsers();

    res.send(users);

});

/*
* Route to create a user
* */
router.post("/", auth({ admin: true }), validate(createUser), async (req, res) => {

    let register = await User.addUser(req.body.username, req.body.email, req.body.admin);

    // Return an error if the user already exist
    if(register === false) {
        res.status(409).send({ error: "user_exist" });
        return;
    }

    // Registration successful
    res.send(register);

});

/*
* Route to log in a user
* */
router.post("/me/login", validate(loginBody), async (req, res) => {

    let login = await User.login(req.body.username, req.body.password);

    if(!login) {
        res.status(401).send({ error: "wrong_credentials" });
        return;
    }

    res.send(login);

});

/*
* Route to reset the users password
* */
router.put("/me/password", auth(), validate(updatePassword), async (req, res) => {

    let reset = await User.resetPassword(req.user.id, req.body.old, req.body.new);

    if(reset) {
        res.status(200).end();
    } else {
        res.status(400).send({ error: "invalid_verification" });
    }

});

/*
* Update email
* */
router.put("/me/email", auth(), validate(resetEmail), async (req, res) => {


    let user = await Database.findUser({ email: req.body.email });

    if(!user){

        await Database.updateUser(req.user.id, { $set: { email: req.body.email } });
        res.status(200).end();

    }else{
        res.status(409).send({ error: "user_exist" });
    }


});

/*
* Update username
* */
router.put("/me/username", auth(), validate(resetUsername), async (req, res) => {


    let user = await Database.getUser({ username: req.body.username });

    if(!user){

        await Database.updateUser(req.user.id, { $set: { username: req.body.username } });
        res.status(200).end();

    }else{
        res.status(409).send({ error: "user_exist" });
    }


});

/*
* Delete a user
* */
router.delete("/:id", auth({ admin: true }), async (req, res) => {

    let user = await Database.getUser(req.params.id);

    if(!user) {
        res.status(404).send({ error: "not_found" });
        return;
    }

    await Database.deleteUser(req.params.id);
    res.status(200).end();


});

module.exports = router;