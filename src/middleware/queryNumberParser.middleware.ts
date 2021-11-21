import { NextFunction, Request, Response } from "express";
import IDictionary from "../types/dictionary";

/**
 * Express.js Middleware to parse numbers in the querystring of a request to an actual number (float).
 */
function _queryNumberParser(req: Request, res: Response, next: NextFunction, fields: string[]) {
	if (req.query) {
		let query = req.query as IDictionary;
		
		for (let [ key, value ] of Object.entries(query)) {
			if ( !fields.includes(key) ) continue;
			
			let parsed = parseFloat(value as string);
			
			if ( !isNaN(parsed) ) {
				query[ key ] = parsed;
			}
			
		}
		
	}
	
	next();
}


/**
 * Parses the given fields of a querystring to an actual number (float)
 * @param fields Array of query fields to parse
 * @returns Middleware
 */
export default function queryNumberParser(...fields: string[]) {
	return (req: Request, res: Response, next: NextFunction) => _queryNumberParser(req, res, next, fields);
}
