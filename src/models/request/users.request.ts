import Request from "../request.js"
import { Length, IsEmail, IsBoolean } from "class-validator"


const usernameLength: [number, number] = [4, 16];
const passwordLength: [number, number] = [8, 1024];


export class CreateUser extends Request {
	@Length(...usernameLength)
	username !: string;
	
	@IsEmail()
	email !: string;
	
	@IsBoolean()
	admin !: boolean;
}


export class LoginBody extends Request {
	@Length(...usernameLength)
	username !: string;
	
	@Length(...passwordLength)
	password !: string;
}


export class UpdatePassword extends Request {
	@Length(...passwordLength)
	old !: string;
	
	@Length(...passwordLength)
	new !: string;
}


export class ResetEmail extends Request {
	@IsEmail()
	email !: string;
}


export class ResetUsername extends Request {
	@Length(...usernameLength)
	username !: string;
}
