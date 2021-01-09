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
    | users.CreateUser
    | users.LoginBody
    | users.ResetEmail
    | users.ResetUsername
    | users.UpdatePassword
    | undefined

export type PossibleResponse =
    entries.Entry
    | entries.Entry[]
    | entries.GeoData[]
    | entries.EntryApproved
    | users.User
    | users.User[]
    | users.NewUser
    | users.LoginResponse
    | boolean
    | DefaultResponse
    | Error
    | undefined

export type PossibleQuery = 
    entries.FilterQuery
    | { page: Page }
    | geo.GeoDataQuery
    | undefined


// ------ API ------

export type Route = {
    [method in "get" | "post" | "put" | "patch" | "delete"]: {
        [route: string]: {
            params?
            request?
            response?
            query?
        }
    }
}

export interface Default extends Route {
    get: {
        "/": {
            response: DefaultResponse
            query: entries.FilterQuery
        }
    }
}

export interface Users extends Route {
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

export interface Entries extends Route {
    get: {
        "/": {
            response: entries.Entry[] | Error
            query: entries.FilterQuery
        }

        "/:id": {
            response: entries.Entry | Error
            params: Id
        }

        "/unapproved": {
            response: entries.Entry[]
            query: {
                page: Page
            }
        }
    }

    post: {
        "/": {
            request: entries.NewApiEntry
            response: entries.Entry
        }
    }

    patch: {
        "/:id/approve": {
            params: Id
            response: entries.EntryApproved | Error
        }
    }

    delete: {
        "/:id": {
            params: Id
            response?: Error
        }
    }
}

export interface GeoData extends Route {
    get: {
        "/": {
            response: entries.GeoData[],
            query: geo.GeoDataQuery
        }
    }
}

export interface Api {
    "/": Default
    "/users": Users
    "/entries": Entries
    "/geodata": GeoData
}

export default Api