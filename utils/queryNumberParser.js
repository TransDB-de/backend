/**
 * Express.js middleware to parse numbers in the querystring of a request to an actual number (float)
 */
function queryNumberParser(req, res, next, fields) {

    for(let [key, value] of Object.entries(req.query)) {

        if(!fields.includes(key)) continue;

        let parsed = parseFloat(value);

        if(!isNaN(parsed)) {
            req.query[key] = parsed;
        }

    }

    next();

}

module.exports = (fields) => (req, res, next) => queryNumberParser(req, res, next, fields);