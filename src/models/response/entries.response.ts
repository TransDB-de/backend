import { DatabaseEntry } from "../database/entry.model.js"
import Response from "../response.js"


export type PublicEntry = Omit< DatabaseEntry<"out">, "approvedBy" >


export interface QueriedEntries extends Response {
	entries: PublicEntry[] | null
	locationName: string
	more: boolean
}

export interface AdminFilteredEntries extends Response {
	entries: DatabaseEntry<"out">[] | null
	more: boolean
}
