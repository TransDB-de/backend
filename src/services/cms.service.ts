import axios from "axios";
import { CMSManagementUser, CMSManagementUsersGQLResponse, CMSUser, CMSUserMeGQLResponse, type CMSUsersGQLResponse, ECMSTicketType } from "../types/cms.js";
import { config } from "./config.service.js";
import { loadGQLFiles } from "../util/graphql.util.js";

type GQLQueryNames = "users" | "user-me" | "management-users";

const gqlQueries = loadGQLFiles<GQLQueryNames>("./src/graphql/");

export function cmsRequestFactory(path: string, accessToken?: string) {
	const url = new URL(path, config.cms.url).href;

	const token = accessToken ? accessToken : config.cms.access_token;

	const options = { headers: { Authorization: "Bearer " + token } };

	return {
		url,
		options
	}
}

export async function createTicket(title: string, entryId: string | null, type: ECMSTicketType, description: string | null) {
	const newTicket = {
		title,
		description,
		type,
		entry_id: entryId
	};

	const { url, options } = cmsRequestFactory("/items/" + config.cms.ticket_collection);

	try {
		await axios.post(url, newTicket, options);
		return true;
	} catch(e) {
		return false;
	}
}

export async function fetchUsers(): Promise<CMSUser[]> {
	const query = gqlQueries.get("users");
	const { url, options } = cmsRequestFactory("/graphql/system");

	const res = await axios.post<CMSUsersGQLResponse>(url, query, options);
	return res.data.data.users;
}

export async function getOwnUser(accessToken: string): Promise<CMSUser> {
	const query = gqlQueries.get("user-me");
	const { url, options } = cmsRequestFactory("/graphql/system", accessToken);

	const res = await axios.post<CMSUserMeGQLResponse>(url, query, options);
	return res.data.data.users_me;
}

export async function getManagementUsers(): Promise<CMSManagementUser[]> {
	const query = gqlQueries.get("management-users");
	const { url, options } = cmsRequestFactory("/graphql");

	const res = await axios.post<CMSManagementUsersGQLResponse>(url, query, options);
	return res.data.data.management_users;
}