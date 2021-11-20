import { Request, Response } from "express"
import { validate, ValidationError, ValidatorOptions } from "class-validator"
import { plainToInstance } from "class-transformer"
import { Entry } from "../models/request/entries.request.js"
import { StatusCode } from "../types/httpStatusCodes";

export interface ValidationMiddlewareOptions {
	validationGroupFromEntryType: boolean;
	skipMissingProperties: boolean;
}

async function validateBody(req: Request, res: Response, next: any, schema: any, options?: ValidationMiddlewareOptions) {
	req.body = plainToInstance(schema, req.body);

	const validatorOptions: ValidatorOptions = {
		always: true,
		whitelist: true,
		forbidNonWhitelisted: true,
		skipMissingProperties: options.skipMissingProperties
	};

	if (options.validationGroupFromEntryType && req.body instanceof Entry) validatorOptions.groups = [req.body.type];

	let errors: ValidationError[] = await validate(req.body, validatorOptions);
	
	if (errors.length < 1) return next();
	
	return res.status( StatusCode.UnprocessableEntity ).json({ error: "validation_error", problems: errors });
}

export function validator(schema: any, options?: ValidationMiddlewareOptions) {
	return (req: Request, res: Response, next: any) => validateBody(req, res, next, schema, options);
}
