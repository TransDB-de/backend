import { IDictionary } from "../api/api";

// validate js model utility module

/** makes all filters of a validate js model optional */
export function makeOptional(model: IDictionary): IDictionary {
	// deep copy
	let mod = JSON.parse(JSON.stringify(model));

	for (let [key, filter] of Object.entries(mod)) {
		if (typeof filter === 'object' && filter !== null) {
			(filter as IDictionary).presence = false;
		}
	}

	return mod;
}

/** nest all filters of a validate js model, in a parent with specified key */
export function nest(parent: string, model: IDictionary): IDictionary {
	let mod: IDictionary = {};

	for (let [key, val] of Object.entries(model)) {
		mod[`${parent}.${key}`] = val;
	}

	return mod;
}

/** merge intersecting fields of validate js models, prefering baseModel, and merging arrays */
export function merge(baseModel: IDictionary, ...mergeModels: IDictionary[]) {
	// deep copy
	let mod: IDictionary = JSON.parse(JSON.stringify(baseModel));

	const mergeToBase = (base: IDictionary, toMerge: IDictionary) => {

		for (let [key, val] of Object.entries(toMerge)) {
			let baseVal = base[key];

			if (baseVal === undefined) {
				base[key] = val;
			} else
			if (Array.isArray(baseVal) && Array.isArray(val)) {
				base[key] = [...baseVal, ...val];
			} else
			if (baseVal && val && typeof baseVal === 'object' && typeof val === 'object') {
				mergeToBase(baseVal, val);
			}
		}

	}

	mergeModels.forEach(m => {
		mergeToBase(mod, m);
	});

	return mod;
}
