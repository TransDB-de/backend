let createUser = {

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

let loginBody = {

    username: {
        presence: { allowEmpty: false },
        type: "string"
    },

    password: {
        presence: { allowEmpty: false },
        type: "string"
    }

}

let updatePassword = {

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

let resetEmail = {

    email: {
        presence: { allowEmpty: false },
        type: "string",
        email: true
    }

}

let resetUsername = {

    username: {
        presence: { allowEmpty: false },
        type: "string",
        length: {
            minimum: 4,
            maximum: 16
        }
    }

}

module.exports = { createUser, loginBody, resetEmail, resetUsername, updatePassword };