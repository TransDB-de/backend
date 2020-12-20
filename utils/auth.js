const jwt = require("jsonwebtoken");
const Config = require("../services/config");

// Middleware to authenticate and authorize users with jsonwebtoken
function authMiddleware(req, res, next, options = {}) {

    // Match the auth header with RegExp
    let bearer = /Bearer (.+)/.exec(req.headers.authorization);

    // Check match of the header
    if(!bearer) {
        res.status(401).send({ error: "invalid_authorization_header" }).end();
        return;
    }
    // Get jwt from match
    let token = bearer[1];

    // Try to verify the jwt
    try {
        token = jwt.verify(token, Config.config.jwt.secret);
    } catch(err) {
        res.status(401).send({ error: "unauthorized" }).end();
        return;
    }

    // Check permissions
    if(options.admin && !token.admin) {
        res.status(403).send({ error: "no_admin" }).end();
        return;
    }

    // Set token payload to req.user
    req.user = token;

    next();

}

module.exports = (options) => (req, res, next) => authMiddleware(req, res, next, options);