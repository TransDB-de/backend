import {IsIn, Length, Matches} from "class-validator"
import { RequestBody } from "../request.js"
import { idRegex } from "./objectId.request.js"

const types = [
	"edit", "report", "other"
] as const;

export class Report extends RequestBody {
	@Matches(idRegex)
	id !: string;
	
	@IsIn(types)
	type !: typeof types[number];
	
	@Length(10, 1200)
	message !: string;
}
