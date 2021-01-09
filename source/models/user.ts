import MongoDB from "mongodb";


/** Body of create user post request */
export interface CreateUser {
    username: string,
    email: string,
    /** Whether or not this user is an admin */
    admin: boolean
}

/** validate.js create user post request validation schema */
export const createUser = {

    username: {
        presence: { allowEmpty: false },
        type: "string",
        length: {
            minimum: 4,
            maximum: 16
        }
    },

    email: {
        presence: { allowEmpty: false },
        type: "string",
        email: true
    },

    admin: {
        presence: { allowEmpty: false },
        type: "boolean"
    }

}

/** Body of login post request */
export interface LoginBody {
    /** username or email */
    username: string,
    password: string,
}

/** validate.js user login post request validation schema */
export const loginBody = {

    username: {
        presence: { allowEmpty: false },
        type: "string"
    },

    password: {
        presence: { allowEmpty: false },
        type: "string"
    }

}

/** Body of update password post request */
export interface UpdatePassword {
    old?: string,
    new: string
}

/** validate.js password post request validation schema */
export const updatePassword = {

    old: {
        type: "string",
        length: {
            minimum: 8,
            maximum: 1024
        }
    },

    new: {
        presence: { allowEmpty: false },
        type: "string",
        length: {
            minimum: 8,
            maximum: 1024
        }
    }

}

/** Body of reset email post request */
export interface ResetEmail {
    email: string
}

/** validate.js reset email post request validation schema */
export const resetEmail = {

    email: {
        presence: { allowEmpty: false },
        type: "string",
        email: true
    }

}

/** Body of reset username post request */
export interface ResetUsername {
    username: string
}

/** validate.js reset username post request validation schema */
export const resetUsername = {

    username: {
        presence: { allowEmpty: false },
        type: "string",
        length: {
            minimum: 4,
            maximum: 16
        }
    }

}

/** User object as stored in database */
export interface User {
    _id: string | number | MongoDB.ObjectID,
    username: string,
    email: string,
    password: Password,
    registerDate: Date,
    lastLogin: null | Date,
    admin: boolean
}

/** User object as sent in get requests */
export type ResUser = {
    password: never
} & Omit<User, keyof {password}>

/** Just created user, with generated plaintext password */
export type NewApiUser = {
    password: string,
} & Omit<User, keyof {password}>

/** User object for new database entries */
export type NewDbUser = Omit<User, keyof{_id}>

/** Encrypted password with salt, as stored in database */
export interface Password {
    key: string,
    salt: string
}
