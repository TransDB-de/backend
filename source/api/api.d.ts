import * as entries from "./entries.js"
import * as users from "./users.js"
import * as geo from "./geo.js"
import Id from "./objectId.js"

type Page = number;

interface DefaultResponse {
    [key: string]: string
}

interface IDictionary {
    [key: string]: any
}

export interface Error {
    error: string,
    location?: string,
    problems?: string | Problem[] | IDictionary
}

export interface Problem {
    field: string,
    violated: string,
    expect: string
}


export type PossileParams = Id | undefined

export type PossibleRequest =
    entries.NewApiEntry
    | entries.EntryEdit
    | entries.FilterFull
    | users.CreateUser
    | users.LoginBody
    | users.ResetEmail
    | users.ResetUsername
    | users.UpdatePassword

export type PossibleResponse =
    entries.Entry
    | entries.Entry[]
    | entries.QueriedEntries
    | entries.GeoData[]
    | entries.EntryApproved
    | entries.FilteredEntries
    | entries.UnapprovedEntries
    | users.User
    | users.User[]
    | users.NewUser
    | users.LoginResponse
    | geo.GeoPlace[]
    | DefaultResponse
    | Error

export type PossibleQuery = 
    entries.FilterQuery
    | entries.ApproveQuery
    | { page: Page }
    | geo.GeoDataQuery


// ------ API ------

export type BaseRoute = {
    [method in "get" | "post" | "put" | "patch" | "delete"]: {
        [route: string]: {
            params?: any
            request?: any
            response?: any
            query?: any
        }
    }
}

/**
 * Requests avalible in the apis default route
 */
export interface Default extends BaseRoute {
    get: {
        "/": {
            response: DefaultResponse
            query: entries.FilterQuery
        }
    }
}

/**
 * Requests avalible in the apis "/users" route
 */
export interface Users extends BaseRoute {
    get: {
        "/": {
            response: users.User[]
        }
    }

    post: {
        "/": {
            request: users.CreateUser
            response: users.NewUser | Error
        }

        "/me/login": {
            request: users.LoginBody
            response: users.LoginResponse | Error
        }
    }

    put: {
        "/me/password": {
            request: users.UpdatePassword
            response?: Error
        }

        "/me/email": {
            request: users.ResetEmail
            response?: Error
        }

        "/me/username": {
            request: users.ResetUsername
            response?: Error
        }
    }

    delete: {

        "/:id": {
            params: Id
            response?: Error
        }
    }
}

/**
 * Requests avalible in the apis "/entries" route
 */
export interface Entries extends BaseRoute {
    get: {
        "/": {
            response: entries.QueriedEntries | Error
            query: entries.FilterQuery
        }

        "/:id": {
            response: entries.Entry | Error | null
            params: Id
        }

        "/unapproved": {
            response: entries.UnapprovedEntries | Error
            query: {
                page: Page
            }
        }

        "/backup": {
            response: any | Error
        }
    }

    post: {
        "/full": {
            request: entries.FilterFull
            response: entries.FilteredEntries | Error
        }

        "/": {
            request: entries.NewApiEntry
            response: entries.Entry | Error
        }
    }

    patch: {
        "/:id/approve": {
            params: Id
            query: entries.ApproveQuery
            response: entries.EntryApproved | Error
        }

        "/:id/edit": {
            params: Id
            request: entries.EntryEdit
            response?: Error
        }

        "/:id/updateGeo": {
            params:Id
            response?: Error
        }
    }

    delete: {
        "/:id": {
            params: Id
            response?: Error
        }
    }
}

/**
 * Requests avalible in the apis "/geodata" route
 */
export interface GeoData extends BaseRoute {
    get: {
        "/": {
            query: geo.GeoDataQuery
            response?: geo.GeoPlace[]
        }
    }
}
