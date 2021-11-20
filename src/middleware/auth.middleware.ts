import {Request, Response, NextFunction} from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";

import { config } from "../services/config.service.js";

import { StatusCode } from "../types/httpStatusCodes.js";

import { AuthOptions, TokenData } from "../types/auth";
export { AuthOptions, TokenData };

// Middleware to authenticate and authorize users with jsonwebtoken
function _authMiddleware(req: Request, res: Response, next: Function, options: AuthOptions) {

	if (!req.headers.authorization) {
		res.status( StatusCode.Unauthorized ).send({ error: "no_authorization_header" }).end();
		
		return;
	}

	// Match the auth header with RegExp
	let bearer = /Bearer (.+)/.exec(req.headers.authorization);

	// Check match of the header
	if (!bearer) {
		res.status( StatusCode.Unauthorized ).send({ error: "invalid_authorization_header" }).end();

		return;
	}

	// Get jwt from match
	let token = bearer[1];
	let decodedToken: TokenData;

	// Try to verify the jwt
	try {
		decodedToken = jwt.verify(token, config.jwt.secret) as TokenData;
	} catch(err) {
		res.status( StatusCode.Unauthorized ).send({ error: "unauthorized" }).end();

		return;
	}

	// Check permissions
	if (options.admin && !decodedToken.admin) {
		res.status( StatusCode.Forbidden ).send({ error: "no_admin" }).end();
		
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
export default function authMiddleware(options: AuthOptions = {}) {
	return (req: Request, res: Response, next: NextFunction) => _authMiddleware(req, res, next, options);
}
