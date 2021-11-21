import { DatabaseEntry } from "../database/entry.model.js"
import ResponseBody from "../response.js"


export type PublicEntry = Omit< DatabaseEntry<"out">, "approvedBy" >


export interface QueriedEntries extends ResponseBody {
	entries: PublicEntry[] | null
	locationName?: string
	more: boolean
}

export interface AdminFilteredEntries extends ResponseBody {
	entries: DatabaseEntry<"out">[] | null
	more: boolean
}
