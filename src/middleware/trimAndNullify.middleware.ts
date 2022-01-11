import { IRequest, IResponse, NextFunction } from "express"
import type IDictionary from "../types/dictionary"

function trimAndNullifiyValues(obj: IDictionary): IDictionary {
	for (const key in obj) {
		const val = obj[key];
		
		if (val === undefined || val === null) continue;
		
		if (typeof val === "string") {
			let value: string | null = val.trim();
			
			if (value === "") {
				value = null;
			}
			
			obj[key] = value;
		} else if (typeof val === "object" && !Array.isArray(val)) {
			obj[key] = trimAndNullifiyValues(val);
		}
	}
	
	return obj;
}

/**
 * Middleware to trim and nullify all values in the request body.
 */
export default function trimAndNullifyMiddleware(req: IRequest, res: IResponse, next: NextFunction) {
	if (req.body) {
		req.body = trimAndNullifiyValues(req.body);
	}
	
	next();
}
