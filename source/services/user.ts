import crypto from "crypto";
import jwt from "jsonwebtoken";
import { customAlphabet } from "nanoid";

import * as Database from "../services/database.js";
import { config } from "../services/config.js";

// Data model Interfaces
import { 
    CreateUser, User, NewApiUser, ResUser,
    ResetUsername, LoginBody, UpdatePassword, ResetEmail,
    Password
} from "../models/user";

const nanoid = customAlphabet('0123456789abcdefghijklmnopqurstuvxyz', 8);

/**
 * Function to add a new user
 * @returns A new user, or false if the user allready exists
 */
export async function addUser({ username, email, admin }: CreateUser) {

    // Get possible user from database to check if the user already exist
    let user = await Database.findUser({ $or: [ { username }, { email } ] });

    if (user !== null) {
        return false;
    }

    // Generate random password
    let password = nanoid();

    // Do a secure password hashing with scrypt
    let pwObject = await encryptPassword(password);

    let newUser = await Database.createUser(username, email, pwObject, admin) as User | NewApiUser;

    newUser.password = password;

    return newUser as NewApiUser;
}

/**
 * Function to log in a user
 * @returns user object and token, or false if login failed
 */
export async function login({ username, password }: LoginBody) {

    // Get the user
    let user = await Database.findUser({ $or: [ { username: username }, { email: username } ] });

    if (!user) {
        return false;
    }

    let pw = await encryptPassword(password, user.password.salt);

    // Cancel on wrong password
    if (pw.key !== user.password.key) {
        return false;
    }

    let token = jwt.sign({ id: user._id, admin: user.admin }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Set users last login date
    await Database.updateUser(user._id, { lastLogin: new Date() });

    delete user.password;

    return { user, token } as { user: ResUser, token: string };

}

/**
 * Reset the password of a user
 * @returns sucess
 */
export async function resetPassword(userId: string, updatePasswordBody: UpdatePassword) {

    let user = await Database.getUser(userId);

    let oldPassword = updatePasswordBody.old ?? "";
    let newPassword = updatePasswordBody.new;

    // Cancel if user not found
    if (!user) {
        return false;
    }

    let oldPW = await encryptPassword(oldPassword, user.password.salt);

    // Cancel if old password is not matching
    if (oldPW.key !== user.password.key) {
        return false;
    }

    let password = await encryptPassword(newPassword);

    return await Database.updateUser(userId, { password });

}

/**
 * Encrypt a password (string) with a 128 length key scrypt and a 16 bytes salt
 */
function encryptPassword(password: string, salt?: string): Promise<Password> {

    return new Promise((resolve, reject) => {

        // Generate 16 bytes salt as hex string to salt the password
        let buff = crypto.randomBytes(16);

        if (!salt) {
            salt = buff.toString("hex");
        }

        crypto.scrypt(password, salt, 128, (err, keyBuffer) => {

            if (err) throw reject(err);

            let key = keyBuffer.toString("hex");

            resolve({ key, salt });

        });

    });

}

/**
 * There is no registration so a default user has to be added if no one exist
 */
export async function generateDefaultUserIfRequired() {

    let users = await Database.getAllUsers();

    if (users.length < 1) {

        console.warn("[users] No users found in database!");

        let userEntry: CreateUser = {
            username: "admin",
            email: null,
            admin: true
        };

        let newUser = await addUser(userEntry);

        if (!newUser) {
            console.warn("Failed to create default admin user!");

            process.exit();
        }

        console.info(`Created default admin user: admin/${newUser.password}`);

    }

}