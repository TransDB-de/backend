import { DatabaseUser } from "../../models/database/user.model.js"
import ResponseBody from "../../models/response.js"

export interface PublicUser extends Pick< DatabaseUser<"out">, "username" | "email" | "registerDate" | "lastLogin" | "admin"> {
	password?: never;
}


export interface PasswordReset extends ResponseBody {
	password: string;
}
