import { Length, Matches } from "class-validator"
import { RequestBody } from "../request.js"
import { idRegex } from "./objectId.request.js"

export class Report extends RequestBody {
	@Matches(idRegex)
	id !: string;
	
	@Length(10, 1200)
	message !: string;
}
