import { NextFunction } from "express";
import { PossibleQuery } from "../api/api.js";

/**
 * Express.js Middleware to parse numbers in the querystring of a request to an actual number (float).
 */
function _queryNumberParser(req: IRequest, res, next: NextFunction, fields: Array<string>) {

    for (let [ key, value ] of Object.entries(req.query)) {
        if ( !fields.includes(key) ) continue;

        let parsed = parseFloat(value as string);

        if ( !isNaN(parsed) ) {
            req.query[ key ] = parsed;
        }

    }

    next();

}


/**
 * Express.js Middleware builder.
 * The returned Middleware to parses the given fields of a querystring to an actual number (float).
 * @param fields Array of query fields to parse
 */
export function queryNumberParser(fields: Array<string>): IMiddleware {
    return (req, res, next) => _queryNumberParser(req, res, next, fields);
}

// double export to support both default, and named imports
export default queryNumberParser;
