// third-party modules
import express from "express";

import * as Api from "../api/api.js";

// services
import * as Database from "../services/database.js";
import * as User from "../services/user.js";

// utils
import validate from "../utils/validate.js";
import auth from "../utils/auth.js";
import { ResponseCode } from "../utils/restResponseCodes.js";

import { createUser, loginBody, resetEmail, resetUsername, updatePassword } from "../models/user.js";

export const router = express.Router() as IRouter<Api.Users>;

// Path in URL
export const path = "/users";

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

    let register = await User.addUser(req.body);

    // Return an error if the user already exist
    if(register === false) {
        res.status(ResponseCode.Conflict).send({ error: "user_exist" });
        return;
    }

    // Registration successful
    res.send(register);

});

/*
* Route to log in a user
* */
router.post("/me/login", validate(loginBody), async (req, res) => {

    let login = await User.login(req.body);

    if (!login) {
        res.status(ResponseCode.Unauthorized).send({ error: "wrong_credentials" });
        return;
    }

    res.send(login);

});

/*
* Route to reset the users password
* */
router.put("/me/password", auth(), validate(updatePassword), async (req, res) => {

    let reset = await User.resetPassword(req.user.id, req.body);

    if(reset) {
        res.status(ResponseCode.OK).end();
    } else {
        res.status(ResponseCode.BadRequest).send({ error: "invalid_verification" });
    }

});

/*
* Update email
* */
router.put("/me/email", auth(), validate(resetEmail), async (req, res) => {


    let user = await Database.findUser({ email: req.body.email });

    if (!user) {

        await Database.updateUser(req.user.id, { email: req.body.email });
        res.status(ResponseCode.OK).end();

    } else {
        res.status(ResponseCode.Unauthorized).send({ error: "user_exist" });
    }


});

/*
* Update username
* */
router.put("/me/username", auth(), validate(resetUsername), async (req, res) => {


    let user = await Database.findUser({ username: req.body.username });

    if(!user){

        await Database.updateUser(req.user.id, { username: req.body.username });
        res.status(ResponseCode.OK).end();

    }else{
        res.status(ResponseCode.Unauthorized).send({ error: "user_exist" });
    }


});

/*
* Delete a user
* */
router.delete("/:id", auth({ admin: true }), async (req, res) => {

    let user = await Database.getUser(req.params.id);

    if(!user) {
        res.status(ResponseCode.NotFound).send({ error: "not_found" });
        return;
    }

    await Database.deleteUser(req.params.id);
    res.status(ResponseCode.OK).end();


});
