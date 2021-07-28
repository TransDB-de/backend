/** validate.js create user post request validation schema */
export const createUser = {

	username: {
		presence: { allowEmpty: false },
		type: "string",
		length: {
			minimum: 4,
			maximum: 16
		}
	},

	email: {
		presence: { allowEmpty: false },
		type: "string",
		email: true
	},

	admin: {
		presence: { allowEmpty: false },
		type: "boolean"
	}

}

/** validate.js user login post request validation schema */
export const loginBody = {

	username: {
		presence: { allowEmpty: false },
		type: "string"
	},

	password: {
		presence: { allowEmpty: false },
		type: "string"
	}

}

/** validate.js password post request validation schema */
export const updatePassword = {

	old: {
		type: "string",
		length: {
			minimum: 8,
			maximum: 1024
		}
	},

	new: {
		presence: { allowEmpty: false },
		type: "string",
		length: {
			minimum: 8,
			maximum: 1024
		}
	}

}

/** validate.js reset email post request validation schema */
export const resetEmail = {

	email: {
		presence: { allowEmpty: false },
		type: "string",
		email: true
	}

}

/** validate.js reset username post request validation schema */
export const resetUsername = {

	username: {
		presence: { allowEmpty: false },
		type: "string",
		length: {
			minimum: 4,
			maximum: 16
		}
	}

}
