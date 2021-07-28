import validate from "validate.js";

import { objectId } from "../models/objectId.js";

import { ResponseCode } from "./restResponseCodes.js";


// simple utility interface for object with string key
interface IDictionary {
	[key: string]: any
}

/**
 * Function to validate an object manually with a schema
 * @param data Data object to validate
 * @param schema validate.js schema
 * @returns true if validation passed
 */
export function validateManually(data: Object, schema: Object) {

	let errors = validate(data, schema, { format: "detailed" });

	if (!Array.isArray(errors)) {
		return true;
	}

	errors =  errors.map((err) => {
		return { field: err.attribute, violated: err.validator, expect: err.options };
	});

	return { error: "validation_error", problems: errors };

}

// ------ Validate.js Custom Validators ------

// Custom validator for checking if an array contains only elements from options array
validate.validators.exclusively = function (value: any, options: any): string | null {

	if (!Array.isArray(value)) {
		return null;
	}

	for (let valueElement of value) {
		if (!options.includes(valueElement)) {
			return "has elements that are not in options";
		}
	}

	return null;

}

// Custom validator for checking if another value also exist
validate.validators.requires = function (value: any, options: any, key: any, attributes: any): string | null {

	if (!Array.isArray(options)) {
		options = new Array(options);
	}

	for (let required of options) {

		if (!(required in attributes) && value) {
			return "requires " + options.join(" and ");
		}

	}

	return null;

}

// ------ Express.js Route Validators ------

// Middleware to validate custom fields in Request body
function _validationMiddleware(req: IRequest, res: IResponse, next: Function, schema: Object) {

	let errors: IDictionary[] | undefined = validate(req.body, schema, { format: "detailed" });

	// Go next if there is no errors
	if( errors === undefined ){
		return next();
	}

	errors = errors.map((err) => {
		return { field: err.attribute, violated: err.validator, expect: err.options };
	});

	return res.status( ResponseCode.UnprocessableEntity ).json({ error: "validation_error", problems: errors });

}

/**
 * Express.js Middleware builder.
 * The returned Middleware validates custom fields in Request body
 * @param schema validate.js schema
 * @returns Express.js Middleware using given validate.js schema
 */
export function validateMiddleware(schema: Object): IMiddleware {
	return (req, res, next) => _validationMiddleware(req, res, next, schema);
}

/** Express.js Middleware to validate MongoDB's ObjectID in url params */
export const validateId: IMiddleware = function (req, res, next) {

	let errors = validate({ id: req.params?.id }, objectId, { format: "detailed" });

	// Go next if there is no errors
	if(!Array.isArray(errors)){
		return next();
	}

	return res.status( ResponseCode.UnprocessableEntity ).json({ error: "validation_error", location: "params", problems: [
			{ field: "id", violated: "format", expect: "ObjectId" }
		]
	});

}

// double export to support named and default exports
export default validateMiddleware;
