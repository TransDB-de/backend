import axios from "axios"
import { config } from "./config.service.js"
import { DatabaseEntry } from "../models/database/entry.model.js"
import { reportTypeMapping, typeMapping } from "../models/entryMapping.js";

/**
 * Send a Discord webhook to notify the creation of a new entry
 * @param name Name of am entry
 * @param type Type of ann entry
 */
export async function sendNewEntryNotification(name: string, type: string): Promise<void> {

	if (!config.discordWebhookURL) return;

	let embed: any = {
		title: "📥 Neuer Eintrag",
		description: "Ein neuer Eintrag wurde eingereicht und wartet auf Freischaltung.",
		color: 15241160,
		timestamp: new Date(),
		footer: {
			icon_url: "https://transdb.de/logo.png",
			text: "Trans*DB Systembenachrichtigung"
		},
		fields: [
			{
				name: "Name des Eintrags",
				value: name
			},
			{
				name: "Typ",
				value: typeMapping[type]
			}
		]
	}

	try {
		await axios.post(config.discordWebhookURL, {embeds: [embed]});
	} catch (e: any) {
		console.error(`Error while sending Discord webhook! Status Code: ${e.message}`);
	}

}

/**
 * Send a Discord webhook representing the report as an embed
 * @param entry Entry object
 * @param type Type of the report
 * @param message Message
 */
export async function sendReport(entry: DatabaseEntry<"out">, type: keyof typeof reportTypeMapping, message: string): Promise<boolean> {

	if (!config.discordWebhookURL) return false;


	let embed: any = {
		title: "📣 Neue Meldung",
		url: config.reportEntryURL + entry._id,
		color: 6595835,
		timestamp: new Date(),
		footer: {
			icon_url: "https://transdb.de/logo.png",
			text: "Trans*DB Systembenachrichtigung"
		},
		fields: [
			{
				name: "Art der Meldung",
				value: reportTypeMapping[type]
			},
			{
				name: typeMapping[entry.type],
				value: entry.name
			},
			{
				name: "Nachricht",
				value: message
			}
		]
	}

	try {
		await axios.post(config.discordWebhookURL, {embeds: [embed]});
		return true;
	} catch (e: any) {
		console.error(`Error while sending Discord webhook! Status Code: ${e.message}`);
		return false;
	}

}