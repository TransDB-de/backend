import jwt, { TokenExpiredError } from "jsonwebtoken";

import { config } from "../services/config.js";

import { ResponseCode } from "./restResponseCodes.js";

import { AuthOptions, TokenData } from "../@types/utils/auth";
export { AuthOptions, TokenData };

// Middleware to authenticate and authorize users with jsonwebtoken
function _authMiddleware(req: IRequest, res: IResponse, next: Function, options: AuthOptions) {

    // Match the auth header with RegExp
    let bearer = /Bearer (.+)/.exec(req.headers.authorization);

    // Check match of the header
    if (!bearer) {
        res.status( ResponseCode.Unauthorized ).send({ error: "invalid_authorization_header" }).end();

        return;
    }

    // Get jwt from match
    let token = bearer[1];
    let decodedToken: TokenData;

    // Try to verify the jwt
    try {
        decodedToken = jwt.verify(token, config.jwt.secret) as TokenData;
    } catch(err) {
        res.status( ResponseCode.Unauthorized ).send({ error: "unauthorized" }).end();

        return;
    }

    // Check permissions
    if (options.admin && !decodedToken.admin) {
        res.status( ResponseCode.Forbidden ).send({ error: "no_admin" }).end();
        
        return;
    }

    // Set token payload to req.user
    req.user = decodedToken;

    next();

}

/**
 * Express.js Middleware builder.
 * The returned Middleware authenticates and authorizes users with jsonwebtoken,
 * by mutating the Request to "DecodedRequest".
 * @returns Express.js Middleware using given AuthOptions
 */
export function authMiddleware(options: AuthOptions = {}): IMiddleware {
    return (req, res, next) => _authMiddleware(req, res, next, options);
}

// double export to support named and default exports
export default authMiddleware;
