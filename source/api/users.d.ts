/** Body of create user post request */
export interface CreateUser {
    username: string,
    email: string,
    /** Whether or not this user is an admin */
    admin: boolean
}

/** Body of login post request */
export interface LoginBody {
    /** username or email */
    username: string,
    password: string,
}

/** Body of response on successful login */
export interface LoginResponse {
    user: User,
    token: string
}

/** Body of update password post request */
export interface UpdatePassword {
    old?: string,
    new: string
}

export interface ResetPasswordResponse {
    password: string | boolean
}

/** Body of reset email post request */
export interface ResetEmail {
    email: string
}

/** Body of reset username post request */
export interface ResetUsername {
    username: string
}

/** User object as sent in get requests */
export type User = {
    _id: string,
    username: string,
    password?: never,
    email: string,
    registerDate: Date,
    lastLogin: null | Date,
    admin: boolean
}

/** Just created user, with generated plaintext password */
export type NewUser = {
    username: string,
    password: string,
    email: string,
    registerDate: Date,
    lastLogin: null | Date,
    admin: boolean
}
