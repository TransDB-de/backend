export interface AuthOptions {
    admin?: boolean
}

export interface TokenData {
    id: string,
    admin: boolean
}

// Extend express Request base interface, to include the field this middleware appends
declare global {
    namespace Express {
        interface Request {
            /** Request includes this field after the auth middleware was called */
            user?: TokenData
        }
    }
}
