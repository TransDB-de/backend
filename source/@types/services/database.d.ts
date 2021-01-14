import { Entry } from "../api/entries"

// Types for services/database.ts

/** Entry object for new database entry */
export type NewDbEntry = Omit<Entry, keyof { _id }>

/** User object as stored in database */
export type User = {
    _id: string | number
    username: string,
    password: Password,
    email: string,
    registerDate: Date,
    lastLogin: null | Date,
    admin: boolean
}

/** User object for new database entries */
export type NewDbUser = Omit<User, keyof { _id }>

/** Encrypted password with salt, as stored in database */
export interface Password {
    key: string,
    salt: string
}
