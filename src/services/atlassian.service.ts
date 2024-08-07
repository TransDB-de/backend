import axios from "axios";
import { DatabaseEntry } from "../models/database/entry.model";
import { reportTypeMapping } from "../models/entryMapping";
import IDictionary from "../types/dictionary";
import { config } from "./config.service.js";

export async function createReportTicket(entry: DatabaseEntry<"out">, type: keyof typeof reportTypeMapping, message: string) {
	const customFields = new Map<string, unknown>();
	customFields.set(config.atlassian.customFieldReportType, { id: config.atlassian.customfieldReportTypeMapping[type] });
	customFields.set(config.atlassian.customfieldURL, config.reportEntryURL + entry._id);
	
	const body: IDictionary = {
		fields: {
			issuetype: {
				id: config.atlassian.issueTypes.report
			},
			summary: entry.name,
			project: {
				id: config.atlassian.projectId,
			},
			description: {
				content: [
					{
						content: [
							{
							text: message,
							type: "text"
							}
						],
						type: "paragraph"
					}
				],
				type: "doc",
				version: 1
			},
			...Object.fromEntries(customFields.entries())
		}
	}

	try {
		await axios.post(config.atlassian.apiURL, body, {
			auth: {
				username: config.atlassian.username,
				password: config.atlassian.key,
			}
		});
		return true;
	} catch (e: any) {
		console.error(`Error while creating atlassian jira ticket! Status Code: ${e.message}`);
		return false;
	}
}

export async function newEntryTicket(name: string) {
	const body: IDictionary = {
		fields: {
			issuetype: {
				id: config.atlassian.issueTypes.newEntry
			},
			summary: name,
			project: {
				id: config.atlassian.projectId,
			}
		}
	}

	try {
		await axios.post(config.atlassian.apiURL, body, {
			auth: {
				username: config.atlassian.username,
				password: config.atlassian.key,
			}
		});
		return true;
	} catch (e: any) {
		console.error(`Error while creating atlassian jira ticket! Status Code: ${e.message}`);
		return false;
	}
}