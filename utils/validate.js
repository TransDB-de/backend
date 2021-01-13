const validate = require("validate.js");
const objectId = require("../models/objectId");

// Custom validator for checking if an array contains only elements from options array
validate.validators.exclusively = function (value, options) {

    if(!Array.isArray(value)) {
        return "is not an array";
    }

    for(let valueElement of value) {
        if(!options.includes(valueElement)) {
            return "has elements that are not in options"
        }
    }

    return null;

}

// Custom validator for checking if another value also exist
validate.validators.requires = function (value, options, key, attributes) {

    if(!Array.isArray(options)) {
        options = new Array(options);
    }

    for(let required of options) {

        if(!(required in attributes) && value) {
            return "requires " + options.join(" and ");
        }

    }

    return null;

}

// Middleware to validate custom fields in body
function validationMiddleware(req, res, next, schema){

    let errors = validate(req.body, schema, { format: "detailed" });

    // Go next if there is no errors
    if(!Array.isArray(errors)){
        return next();
    }

    errors = errors.map((err) => {
        return { field: err.attribute, violated: err.validator, expect: err.options };
    });

    return res.status(422).json({ error: "validation_error", problems: errors });

}

// Function to validate an object manually with a schema
function validateManually(data, schema) {

    let errors = validate(data, schema, { format: "detailed" });

    if(!Array.isArray(errors)){
        return true;
    }

    errors =  errors.map((err) => {
        return { field: err.attribute, violated: err.validator, expect: err.options };
    });

    return { error: "validation_error", problems: errors };

}

// Middleware to validate MongoDB's ObjectID in url params
function validateId(req, res, next) {

    let errors = validate({ id: req.params.id }, objectId, { format: "detailed" });

    // Go next if there is no errors
    if(!Array.isArray(errors)){
        return next();
    }

    return res.status(422).json({ error: "validation_error", location: "params", problems: [
            { field: "id", violated: "format", expect: "ObjectId" }
        ]
    });

}


// Export functions
module.exports = (schema) => (req, res, next) => validationMiddleware(req, res, next, schema);
module.exports.validate = validateManually;
module.exports.validateId = validateId;