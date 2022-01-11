import { RequestBody } from "../request.js"
import { Length, IsEmail, IsBoolean } from "class-validator"


const usernameLength: [number, number] = [4, 16];
const passwordLength: [number, number] = [8, 1024];


export class CreateUser extends RequestBody {
	@Length(...usernameLength)
	username !: string;
	
	@IsEmail()
	email !: string;
	
	@IsBoolean()
	admin !: boolean;
}


export class LoginBody extends RequestBody {
	@Length(...usernameLength)
	username !: string;
	
	@Length(...passwordLength)
	password !: string;
}


export class UpdatePassword extends RequestBody {
	@Length(...passwordLength)
	old !: string;
	
	@Length(...passwordLength)
	new !: string;
}


export class UpdateEmail extends RequestBody {
	@IsEmail()
	email !: string;
}


export class UpdateUsername extends RequestBody {
	@Length(...usernameLength)
	username !: string;
}
