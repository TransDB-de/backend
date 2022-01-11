import { ObjectId } from "mongodb"

export interface CollectionMeta <io extends "in" | "out"> {
	_id ?: io extends "in" ? ObjectId : string
	about: string
}

export interface EntriesCollectionMeta<io extends "in" | "out"> extends CollectionMeta<io> {
	lastChangeTimestamp: number,
	lastExportTimestamp: number
}

export const enum CollectionMetaUpdateType {
	Changed,
	Exported
}
