import {
  Controller,
  Middleware,
  Post,
} from "@overnightjs/core";
import { IRequest, IResponse } from "express";
import rateLimit from "express-rate-limit";

import {
  LoginBody,
} from "../models/request/users.request.js";
import validate from "../middleware/validation.middleware.js";

import * as UserService from "../services/users.service.js";
import { config } from "../services/config.service.js";

const loginRateLimiter = rateLimit({
  windowMs: config.rateLimit.login.timeframeMinutes * 60 * 1000,
  max: config.rateLimit.login.maxRequests,
});

@Controller("access")
export default class UsersController {
  @Post("login")
  @Middleware(loginRateLimiter)
  @Middleware(validate(LoginBody))
  async login(req: IRequest<LoginBody>, res: IResponse) {
    let login = await UserService.login(req.body);

    if (!login) return res.error!("wrong_credentials");

    res.send(login);
  }
}
