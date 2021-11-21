import { DatabaseUser } from "../../models/database/user.model.js"
import ResponseBody from "../../models/response.js"

export type PublicUser = Pick< DatabaseUser<"out">, "username" | "email" | "registerDate" | "lastLogin" | "admin">


export interface PasswordReset extends ResponseBody {
	password: string;
}