import type IDictionary from "../types/dictionary"

/**
 * Removes all null properties from an object recursively.
 * @param obj object to remove empty properties from
 * @returns filtered object without null properties
 */
export default function removeEmptyUtil<T extends object>(obj: T): Partial<T> {
	let entries = Object.entries(obj);
	
	entries = entries.filter(([_, v]) => v != null);
	entries = entries.map(([k, v]) => [k, v === Object(v) ? removeEmptyUtil(v) : v]);
	
	return Object.fromEntries(entries) as Partial<T>;
}
