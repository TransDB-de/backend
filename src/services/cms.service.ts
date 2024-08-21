import axios from "axios";
import { ECMSTicketType } from "../types/cms";
import { config } from "./config.service.js";

export async function createTicket(title: string, entryId: string | null, type: ECMSTicketType, description: string | null) {
	const newTicket = {
		title,
		description,
		type,
		entry_id: entryId
	};

	const url = new URL("/items/" + config.cms.ticket_collection, config.cms.url).href;

	try {
		await axios.post(url, newTicket, { headers: { Authorization: "Bearer " + config.cms.access_token} });
		return true;
	} catch(e) {
		return false;
	}
}