import { Length } from "class-validator"
import { Query } from "../request.js"

export class SearchGeoLocation extends Query {
	@Length(1, 200)
	search !: string;
}
