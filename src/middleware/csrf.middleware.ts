import { IRequest, IResponse, NextFunction } from "express"
import jwt from "jsonwebtoken"

import { CSRFTokenData } from "../types/auth"
export { CSRFTokenData }

import { config } from "../services/config.service.js"

export default function csrfMiddleware(req: IRequest, res: IResponse, next: NextFunction) {
	let token = req.headers["x-csrf-token"];
	
	if (!token) {
		res.error!("invalid_csrf_token");
		return;
	}
	
	try {
		jwt.verify(token as string, config.csrfProtection.secret) as CSRFTokenData;
	} catch(err) {
		res.error!("invalid_csrf_token");
		return;
	}
	next();
}
