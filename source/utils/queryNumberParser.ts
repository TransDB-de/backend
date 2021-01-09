/**
 * Express.js Middleware to parse numbers in the querystring of a request to an actual number (float).
 * Needs to be on every route, where the query is expected to cotain at least one "number" type.
 * Mutates Request to type NumberParsedRequest
 */
export const queryNumberParser: IMiddleware = (req, res, next) => {

    for (let [ key, value ] of Object.entries(req.query)) {

        let parsed = parseFloat(value as string);

        if ( !isNaN(parsed) ) {
            (req).query[ key ] = parsed;
        }

    }

    next();

}

// double export to support both default, and named imports
export default queryNumberParser;
