import { NextFunction } from "express";
import { IDictionary } from "../api/api";

/**
 * Express.js Middleware to parse query parameters always as array.
 * If the query param is present multiple times, express do it automatically, but if we want an array but a param exists only once, its a string.
 * To avoid getting a string, this middleware will format it into an array.
 */
function _queryArrayParser(req: IRequest, res: IResponse, next: NextFunction, fields: Array<string>) {

    if (req.query) {
        let query = req.query as IDictionary;

        for (let [ key, value ] of Object.entries(query)) {
            if ( !fields.includes(key) ) continue;

            if(!Array.isArray(value)) {
                query[ key ] = [value];
            }

        }

    }

    next();

}


/**
 * Express.js Middleware builder.
 * The returned Middleware to parses query parameters always as array
 * @param fields Array of query fields to parse
 */
export function queryArrayParser(fields: Array<string>): IMiddleware {
    return (req, res, next) => _queryArrayParser(req, res, next, fields);
}

// double export to support both default, and named imports
export default queryArrayParser;
