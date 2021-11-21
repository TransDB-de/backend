import { Matches } from "class-validator"
import { RequestBody } from "../request.js"

export const idRegex = /^[0-9a-f]{24}$/i;

export class ObjectId {
	@Matches(idRegex)
	id !: string
}
