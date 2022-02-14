import { createLogEvent, getLogEventsRaw } from "./database.service.js"

import type { LogType, LogEvent, DatabaseLog, LogDetail } from "../models/database/log.model"
import { ObjectId } from "mongodb"
import type { DatabaseEntry } from "../models/database/entry.model"


export async function log(type: LogType, message: string): Promise<void> {
	let log: DatabaseLog<"in"> = {
		type,
		message,
		event: null,
		timestamp: new Date()
	}
	
	createLogEvent(log);
}

export async function logError(message: string): Promise<void> { log("error", message); }
export async function logWarning(message: string): Promise<void> { log("warning", message); }
export async function logInfo(message: string): Promise<void> { log("info", message); }

export async function logEntryDeleted(entry: DatabaseEntry<"out">, userId: string): Promise<void> {
	let log: DatabaseLog<"in"> = {
		type: "entry",
		event: "deleted",
		message: null,
		timestamp: new Date(),
		user: new ObjectId(userId),
		undoData: entry
	}
	
	createLogEvent(log);
}

export async function logEntryUpdated(entry: DatabaseEntry<"out">, updater: Partial<DatabaseEntry<"out">>, user: string) {
	let log: DatabaseLog<"in"> = {
		type: "entry",
		event: "updated",
		message: null,
		timestamp: new Date(),
		user: new ObjectId(user),
	}
	
	let detials: LogDetail[] = [];
	
	
	
	log.details = detials;
	
	createLogEvent(log);
}