function queryNumberParser(req, res, next) {

    for(let [key, value] of Object.entries(req.query)) {

        let parsed = parseFloat(value);

        if(!isNaN(parsed)) {
            req.query[key] = parsed;
        }

    }

    next();

}

module.exports = queryNumberParser;