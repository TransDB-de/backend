import { PublicUser } from "../models/response/users.response";
import { PublicEntry } from "../models/response/entries.response";
import { DatabaseEntry } from "../models/database/entry.model";

/*
This utility module provides various functions to filter outgoing data.
The filters ensure that no sensitive data is leaked
*/

/**
 * Filters an entry to remove data which should not be returned by the public api
 * @param entry entry to filter
 */
export function filterEntry(entry: Partial< DatabaseEntry<"out"> >): asserts entry is PublicEntry {
	delete entry.approvedBy;
	delete entry.approvedTimestamp;
	delete entry.submittedTimestamp;
	delete entry.location;
	delete entry.blocked;
}

/**
 * Utility to filter mutliple entries at once
 * @param entries array of entries to filter
 * @see filterEntry(entry)
 */
export function filterEntries(entries: Partial< DatabaseEntry<"out"> >[]): asserts entries is PublicEntry[] {
	for (let entry of entries) {
		filterEntry(entry);
	}
}
