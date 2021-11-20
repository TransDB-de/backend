import { ObjectId } from "mongodb"

/**
 * User object as stored in database
 * 
 * The User<"in"> and User<"out"> variants exist because some fields change type
 * when mongodb outputs them.
 * 
 * "in" is for Users which go into the database, or **in**putted Users.
 * 
 * "out" is for Users which are returned by the database, or **out**putted Users.
 */
export interface DatabaseUser<io extends "in" | "out"> {
	_id?: io extends "in" ? ObjectId : string,
	username: string,
	password: Password,
	email: string,
	registerDate: Date,
	lastLogin: null | Date,
	admin: boolean
}

/** Encrypted password with salt, as stored in database */
export interface Password {
	key: string,
	salt: string
}

export interface DatabaseNewUser extends Omit<DatabaseUser<"out">, "password"> {
	password: string
}