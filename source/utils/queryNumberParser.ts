import { NextFunction } from "express";
import { IDictionary } from "../api/api";

/**
 * Express.js Middleware to parse numbers in the querystring of a request to an actual number (float).
 */
function _queryNumberParser(req: IRequest, res: IResponse, next: NextFunction, fields: Array<string>) {

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
 * Express.js Middleware builder.
 * The returned Middleware to parses the given fields of a querystring to an actual number (float).
 * @param fields Array of query fields to parse
 */
export function queryNumberParser(fields: Array<string>): IMiddleware {
    return (req, res, next) => _queryNumberParser(req, res, next, fields);
}

// double export to support both default, and named imports
export default queryNumberParser;
