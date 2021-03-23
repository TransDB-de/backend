import { Entry as DBEntry, User as DBUser } from "../services/database.js";
import { User as ApiUser } from "../api/users"
import { Entry as ApiEntry } from "../api/entries"

/*
This utility module provides various functions to filter outgoing data.
The filters ensure that no sensitive data is leaked
*/

/**
 * Filters an user to remove data which should never be returned by the api
 * @param user the user object to filter
 */
export function filterUser(user: Partial< DBUser<"out"> >): asserts user is ApiUser {
	delete user.password;
}

/**
 * Utility for filtering multiple users at once
 * @param users array of users to filter
 * @see filterUser(user)
 */
export function filterUsers(users: Partial< DBUser<"out"> >[]): asserts users is ApiUser[] {
	for (let user of users) {
		filterUser(user);
	}
}

/**
 * Filters an entry to remove data which should not be returned by the public api
 * @param entry entry to filter
 */
export function filterEntry(entry: Partial< DBEntry<"out"> >): asserts entry is ApiEntry {
	delete entry.approvedBy;
}

/**
 * Utility to filter mutliple entries at once
 * @param entries array of entries to filter
 * @see filterEntry(entry)
 */
export function filterEntries(entries: Partial< DBEntry<"out"> >[]): asserts entries is ApiEntry[] {
	for (let entry of entries) {
		filterEntry(entry);
	}
}
