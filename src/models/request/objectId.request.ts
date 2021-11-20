import { Matches } from "class-validator"
import Request from "../request.js"


export class ObjectId extends Request {
	@Matches(/^[0-9a-f]{24}$/i)
	id !: string
}
