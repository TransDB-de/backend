import jwt from "jsonwebtoken";

import { config } from "./config.service.js";

import { LoginBody } from "../models/request/users.request.js";
import { cmsRequestFactory, fetchUsers, getManagementUsers, getOwnUser } from "./cms.service.js";
import axios from "axios";
import { CMSManagementUser, CMSUser } from "../types/cms.js";
import { PublicUser } from "../models/response/users.response.js";

export const userNameCache = new Map<string, string>();

export async function loadUserNameCache() {
	let users: CMSUser[] = [];

	try {
		users = await fetchUsers();
	} catch(e) {
		throw new Error("Failed to fetch users from cms");
	}

	for (const user of users) {
		const name = user.first_name + (user.last_name ? " " + user.last_name : "");

		userNameCache.set(user.id, name);
	}

	const legacyUsers = Object.entries<string>(config.legacyUsers);

	for (const [id, name] of legacyUsers) {
		userNameCache.set(id, name);
	}

	console.log("[UserService] user cache loaded");
}

/**
 * Function to log in a user
 * @param loginBody The body of the login request
 * @returns user object and token, or false if login failed
 */
export async function login(loginBody: LoginBody): Promise<{ user: PublicUser, token: string } | false> {
	const { url } = cmsRequestFactory("/auth/login");

	let accessToken = null;

	try {
		const res = await axios.post<{ data: { access_token: string } }>(url, { email: loginBody.username, password: loginBody.password });
		accessToken = res.data.data.access_token;
	} catch(e) {
		return false;
	}

	if (!accessToken) {
		return false;
	}

	let managementUser: CMSManagementUser | undefined;

	try {
		const u = await getOwnUser(accessToken);

		const m = await getManagementUsers()

		managementUser = m.find(m => m.user.id === u.id);
	} catch(e) {
		return false;
	}
	
	if (!managementUser) {
		return false;
	}

	if (managementUser.status !== "active") {
		return false;
	}

	let token = jwt.sign({ id: managementUser.user.id, admin: managementUser.admin }, config.jwt.secret, {
		expiresIn: config.jwt.expiresIn,
	});

	const username = managementUser.user.first_name + (managementUser.user.last_name ? " " + managementUser.user.last_name : "");

	const user: PublicUser = {
		id: managementUser.user.id,
		admin: managementUser.admin,
		username
	}

	return { user, token };
}
