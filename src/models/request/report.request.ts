import { Length } from "class-validator"
import { ObjectId } from "./objectId.request.js"

export class Report extends ObjectId {
	@Length(10, 1200)
	message !: string;
}
