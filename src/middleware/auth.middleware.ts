import { IRequest, IResponse, NextFunction } from "express"
import jwt, { TokenExpiredError } from "jsonwebtoken"

import { StatusCode } from "../types/httpStatusCodes.js"
import { AuthOptions, TokenData } from "../types/auth"
export { AuthOptions, TokenData }

import { config } from "../services/config.service.js"

// Middleware to authenticate and authorize users with jsonwebtoken
function _authMiddleware(req: IRequest, res: IResponse, next: NextFunction, options: AuthOptions) {
	
	if (!req.headers.authorization) {
		res.error!("invalid_authorization_header")
		
		return;
	}
	
	// Match the auth header with RegExp
	let bearer = /Bearer (.+)/.exec(req.headers.authorization);
	
	// Check match of the header
	if (!bearer) {
		res.error!("invalid_authorization_header");
		
		return;
	}
	
	// Get jwt from match<
	let token = bearer[1];
	let decodedToken: TokenData;
	
	// Try to verify the jwt
	try {
		decodedToken = jwt.verify(token, config.jwt.secret) as TokenData;
	} catch(err) {
		res.error!("unauthorized");
		
		return;
	}
	
	// Check permissions
	if (options.admin && !decodedToken.admin) {
		res.error!("no_admin");
		
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
export default function authenticate(options: AuthOptions = {}) {
	return (req: IRequest, res: IResponse, next: NextFunction) => _authMiddleware(req, res, next, options);
}
