export enum ECMSTicketType {
	NEW = "new-entry",
	REPORT = "report",
	EDIT = "edit",
	OTHER = "other"
}

export interface CMSUser {
	id: string;
	first_name: string;
	last_name: string;
}

export interface CMSUsersGQLResponse {
	data: {
		users: CMSUser[];
	}
}

export interface CMSUserMeGQLResponse {
	data: {
		users_me: CMSUser;
	}
}

export interface CMSManagementUser {
	user: CMSUser;
	status: "active" | "inactive";
	admin: boolean;
}

export interface CMSManagementUsersGQLResponse {
	data: {
		management_users: CMSManagementUser[];
	}
}