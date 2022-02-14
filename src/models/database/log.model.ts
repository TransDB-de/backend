import type { ObjectId } from "mongodb"
import type { DatabaseEntry } from "./entry.model"
import type { DatabaseUser } from "./user.model"
import type { primitive } from "../../types/dictionary"

export type LogType = "error" | "warning" | "info" | "user" | "entry";

export type LogEvent = "created" | "updated" | "deleted" | "approved" | "blocked" | null;

export interface DatabaseLog<io extends "in" | "out"> {
	_id?: io extends "in" ? ObjectId : string,
	type: LogType,
	event: LogEvent,
	message: string | null,
	timestamp: Date,
	user?: io extends "in" ? ObjectId : string,
	details?: LogDetail[],
	undoData?: DatabaseEntry<"out"> | DatabaseUser<"out">
}

export type LogDetail = {
	field: string,
	before: primitive,
	after: primitive
}
