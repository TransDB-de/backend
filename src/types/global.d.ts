import * as express from "express"
import {ResponseErrorCode} from "../models/response/error.response.js";
import {ValidationError} from "class-validator";

declare module "express" {
	interface IRequest<Body = {}, Query = {}, Params = {}> extends express.Request<Params, {}, Body, Query> {
		/** Request includes this field after the auth middleware was called */
		user?: TokenData
	}
	
	interface IResponse<Body = {}> extends express.Response<Body> {
		error?: (err: ResponseErrorCode, problems?: ValidationError[]) => void
	}
}
