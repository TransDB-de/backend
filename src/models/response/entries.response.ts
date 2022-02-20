import { DatabaseEntry } from "../database/entry.model.js"
import ResponseBody from "../response.js"


export interface PublicEntry extends Omit< DatabaseEntry<"out">, "approvedBy" | "approvedTimestamp" | "submittedTimestamp" | "location" | "blocked" | "approved"> {
	approvedBy?: never,
	approvedTimestamp?: never,
	submittedTimestamp?: never,
	blocked?: never,
	location?: never,
	approved: never
}


export interface QueriedEntries extends ResponseBody {
	entries: PublicEntry[] | null,
	locationName?: string,
	more: boolean
}

export interface AdminFilteredEntries extends ResponseBody {
	entries: DatabaseEntry<"out">[] | null,
	more: boolean
}
