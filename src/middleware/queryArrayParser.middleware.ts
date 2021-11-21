import { NextFunction, Request, Response } from "express";
import IDictionary from "../types/dictionary";

/**
 * Express.js Middleware to parse query parameters always as array.
 * If the query param is present multiple times, express does this automatically, but if we want an array when a param exists only once, express passes a string.
 * To avoid getting a string this middleware will format it into an array.
 */
function _queryArrayParser(req: Request, res: Response, next: NextFunction, fields: string[]) {
	if (req.query) {
		let query = req.query as IDictionary;
		
		for (let [ key, value ] of Object.entries(query)) {
			
			if ( !fields.includes(key) ) continue;
			
			if( !Array.isArray(value) && typeof value !== 'object') {
				query[ key ] = [value];
			}
			
		}
		
	}
	
	next();
}


/**
 * Parses query parameters to always be an array
 * @param fields Array of query fields to parse
 * @returns Middleware
 */
export default function queryArrayParser(...fields: string[]){
	return (req: Request, res: Response, next: NextFunction) => _queryArrayParser(req, res, next, fields);
}
