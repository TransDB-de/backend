import { Controller, Get, Middleware, Post, Put, Delete } from "@overnightjs/core"
import { IRequest, IResponse } from "express"
import rateLimit from "express-rate-limit"

import authenticate from "../middleware/auth.middleware.js"
import { LoginBody, CreateUser, UpdatePassword, UpdateEmail, UpdateUsername } from "../models/request/users.request.js"
import validate, { validateId } from "../middleware/validation.middleware.js"
import { StatusCode } from "../types/httpStatusCodes.js"
import { PasswordReset, PublicUser } from "../models/response/users.response.js"
import { DatabaseNewUser } from "../models/database/user.model.js"


import * as Database from "../services/database.service.js"
import * as UserService from "../services/users.service.js"
import { ObjectId } from "../models/request/objectId.request.js"
import { config } from "../services/config.service.js"

const loginRateLimiter = rateLimit({
	windowMs: config.rateLimit.login.timeframeMinutes * 60 * 1000,
	max: config.rateLimit.login.maxRequests,
});

@Controller("users")
export default class UsersController {
	@Get("/")
	@Middleware(authenticate({ admin: true }))
	async adminGetAllUsers(req: IRequest, res: IResponse<PublicUser[]>) {
		let users = await Database.getAllUsers();
		
		res.send(users);
	}
	
	@Post("/")
	@Middleware( authenticate({ admin: true }) )
	@Middleware( validate(CreateUser) )
	async adminCreateUser(req: IRequest<CreateUser>, res: IResponse<DatabaseNewUser>) {
		let register = await UserService.addUser(req.body);
		
		if (!register) return res.error!("user_exists");
		
		res.send(register);
	}
	
	@Post("me/login")
	@Middleware( loginRateLimiter )
	@Middleware( validate(LoginBody) )
	async login(req: IRequest<LoginBody>, res: IResponse) {
		let login = await UserService.login(req.body);
		
		if (!login) return res.error!("wrong_credentials");
		
		res.send(login);
	}
	
	@Put("me/password")
	@Middleware( authenticate() )
	@Middleware ( validate(UpdatePassword) )
	async updatePassword(req: IRequest<UpdatePassword>, res: IResponse) {
		let reset = await UserService.resetPassword(req.user?.id ?? "", req.body);
		
		if (!reset) return res.error!("invalid_verification");
			
		res.status(StatusCode.OK).end();
	}
	
	@Put("me/email")
	@Middleware( authenticate() )
	@Middleware( validate(UpdateEmail) )
	async updateEmail(req: IRequest<UpdateEmail>, res: IResponse) {
		let user = await Database.findUser({ email: req.body.email });
		
		if (user) return res.error!("user_exists");
		
		await Database.updateUser(req.user!.id, { email: req.body.email });
		res.status(StatusCode.OK).end();
	}
	
	@Put("me/username")
	@Middleware( authenticate() )
	@Middleware( validate(UpdateUsername) )
	async updateUsername(req: IRequest<UpdateUsername>, res: IResponse) {
		let user = await Database.findUser({ username: req.body.username });
		
		if (user) return res.error!("user_exists");
		
		await Database.updateUser(req.user!.id, { username: req.body.username });
		res.status(StatusCode.OK).end();
	}
	
	@Put(":id/password")
	@Middleware( authenticate({ admin: true }) )
	async resetPassword(req: IRequest<UpdatePassword, {}, {id: string}>, res: IResponse<PasswordReset>) {
		let user = await Database.getUser(req.params.id);
		
		if (!user) return res.error!("not_found");
		
		let reset = await UserService.resetPasswordDirectly(req.params.id);
		
		if(!reset) return res.error!("reset_failed");
		
		res.send({ password: reset as string });
	}
	
	@Delete(":id")
	@Middleware( authenticate({ admin: true }) )
	@Middleware ( validateId )
	async deleteUser(req: IRequest<{}, {}, ObjectId>, res: IResponse) {
		let user = await Database.getUser(req.params.id);
		
		if (!user) return res.error!("not_found");
		
		await Database.deleteUser(req.params.id);
		res.status(StatusCode.OK).end();
	}
}
