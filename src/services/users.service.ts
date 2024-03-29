import crypto from "crypto"
import jwt from "jsonwebtoken"
import { customAlphabet } from "nanoid"

import * as Database from "./database.service.js"
import { config } from "./config.service.js"

import { filterUser } from "../util/filter.util.js"

// Data Interfaces
import { DatabaseNewUser, DatabaseUser, Password } from "../models/database/user.model.js"
import { CreateUser } from "../models/request/users.request.js"
import { LoginBody, UpdatePassword } from "../models/request/users.request.js"
import { PublicUser } from "../models/response/users.response.js"

const nanoid = customAlphabet('0123456789abcdefghijklmnopqurstuvxyz', 8);

/**
 * Function to add a new user
 * @param createUser The body of the user creation request
 * @returns A new user, or false if the user allready exists
 */
export async function addUser(createUser: CreateUser): Promise<DatabaseNewUser | null> {
	
	const { username, email, admin } = createUser;
	
	// Get possible user from database to check if the user already exist
	let user = await Database.findUser({ $or: [ { username }, { email } ] });
	
	if (user !== null) {
		return null;
	}
	
	// Generate random password
	let password = nanoid();
	
	// Do a secure password hashing with scrypt
	let pwObject = await encryptPassword(password);
	
	let tmpUser = await Database.createUser(username, email, pwObject, admin);
	
	let {password: omit, ...newUser} = tmpUser;
	(newUser as DatabaseNewUser).password = password
	
	return newUser as DatabaseNewUser;
}

/**
 * Function to log in a user
 * @param loginBody The body of the login request
 * @returns user object and token, or false if login failed
 */
export async function login(loginBody: LoginBody) {
	
	const { username, password } = loginBody;
	
	// Get the user
	let user = await Database.findUser({ $or: [ { username: username }, { email: username } ] }) as DatabaseUser<"out">;
	
	if (!user) {
		return false;
	}
	
	let pw = await encryptPassword(password, user.password.salt);
	
	// Cancel on wrong password
	if (!crypto.timingSafeEqual(
		Buffer.from(pw.key, "utf-8"),
		Buffer.from(user.password.key, "utf-8")
	)) {
		return false;
	}
	
	let token = jwt.sign({ id: user._id, admin: user.admin }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
	
	// Set users last login date
	await Database.updateUser(user._id!, { lastLogin: new Date() });
	
	filterUser(user);
	
	return { user, token } as { user: PublicUser, token: string };
}

/**
 * Reset the password of a user
 * @param userId The id of the user whos password to reset
 * @param updatePasswordBody The body of the update password request
 * @returns success
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
 * Gives the user a new random generated password and returns it
 * @param userId
 */
export async function resetPasswordDirectly(userId: string): Promise<string|boolean> {
	
	let password = nanoid();
	
	let pwObject = await encryptPassword(password);
	
	let res = await Database.updateUser(userId, { password: pwObject });
	
	if (!res) {
		return false;
	}
	
	return password;
	
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
			
			resolve({ key, salt: salt as string });
			
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
			email: "",
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
