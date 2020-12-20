const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Mongo = require("mongodb");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet('0123456789abcdefghijklmnopqurstuvxyz', 8);

const Database = require("../services/database");
const Config = require("../services/config");


class UserService {

    /**
     * Function to add a new user
     * @param username
     * @param email
     * @param admin
     * @returns {Promise<{user}|boolean>}
     */
    static async addUser(username, email, admin) {

        // Get possible user from database to check if the user already exist
        let user = await Database.getUser({ $or: [ { username }, { email } ] });

        if(user !== null) {
            return false;
        }

        // Generate random password
        let password = nanoid(8);

        // Do a secure password hashing with scrypt
        let pwObject = await UserService.encryptPassword(password);

        let newUser = await Database.createUser(username, email, pwObject, admin);

        newUser.password = password;

        return newUser;

    }

    /**
     * Function to log in a user
     * @param identifier
     * @param password
     * @returns {Promise<{user, token}|boolean>}
     */
    static async login(identifier, password) {

        // Get the user
        let user = await Database.getUser({ $or: [ {username: identifier }, { email: identifier } ] });

        if(!user) {
            return false;
        }

        let pw = await UserService.encryptPassword(password, user.password.salt);

        // Cancel on wrong password
        if(pw.key !== user.password.key) {
            return false;
        }

        let token = jwt.sign({ id: user._id, admin: user.admin }, Config.config.jwt.secret, { expiresIn: Config.config.jwt.expiresIn });

        // Set users last login date
        await Database.updateUser({ _id: new Mongo.ObjectID(user._id) }, { $set: { lastLogin: new Date() } });

        delete user.password;
        delete user.token;

        return { user, token };

    }

    /**
     * Reset the password of a user
     * @param userId
     * @param oldPassword
     * @param newPassword
     * @returns {Promise<boolean>}
     */
    static async resetPassword(userId, oldPassword, newPassword) {

        let user = await Database.getUser({ _id: new Mongo.ObjectID(userId) });

        // Cancel if user not found
        if(!user) {
            return false;
        }

        let oldPW = await UserService.encryptPassword(oldPassword, user.password.salt)

        // Cancel if old password is not matching
        if(oldPW.key !== user.password.key) {
            return false;
        }

        let password = await UserService.encryptPassword(newPassword);

        let updated = await Database.updateUser({ _id: new Mongo.ObjectID(userId) }, { $set: { password } });

        return !!updated.modifiedCount;

    }

    /**
     * Encrypt a password (string) with a 128 length key scrypt and a 16 bytes salt
     * @param password
     * @param salt (optional)
     * @returns {Promise<{key, salt}|err>}
     */
    static encryptPassword(password, salt) {

        return new Promise((resolve, reject) => {

            // Generate 16 bytes salt as hex string to salt the password
            let buff = crypto.randomBytes(16);

            if(!salt) {
                salt = buff.toString("hex");
            }

            crypto.scrypt(password, salt, 128, (err, key) => {

                if (err) throw reject(err);

                key = key.toString("hex");

                resolve({ key, salt });

            });

        });

    }

    /**
     * There is no registration so a default user has to be added if no one exist
     * @returns {Promise<void>}
     */
    static async generateDefaultUserIfRequired() {

        let users = await Database.getAllUsers();

        if(users.length < 1) {

            let newUser = await UserService.addUser("admin", null, true);

            console.warn("[users] No users found in database!");
            console.info(`Created default admin user: admin/${newUser.password}`);

        }

    }

}

module.exports = UserService;