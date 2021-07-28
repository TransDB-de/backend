import {objectId} from "./objectId.js";

export const reportBody = {

	entryId: objectId.id,

	message: {
		type: "string",
		presence: { allowEmpty: false },
		length: {
			minimum: 10,
			maximum: 800
		}
	}

}