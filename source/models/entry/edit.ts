import { baseForm, address, therapistMeta, groupMeta, hairRemovalMeta } from "../entry.js";
import { makeOptional, merge, nest } from "../../utils/model.js";

export const entryEdit = {
	...makeOptional(baseForm),
	...nest("address", makeOptional(address)),
	...nest("meta",
		merge(
			makeOptional(therapistMeta),
			makeOptional(groupMeta),
			makeOptional(hairRemovalMeta)
		)
	)
};
