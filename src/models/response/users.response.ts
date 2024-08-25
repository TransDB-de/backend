import ResponseBody from "../../models/response.js"

export interface PublicUser extends ResponseBody {
	id: string;
	username: string;
	admin: boolean;
}
