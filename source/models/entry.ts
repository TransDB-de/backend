export const baseForm = {

    type: {
        presence: { allowEmpty: false },
        type: "string",
        inclusion: [
            "group", "therapist", "endocrinologist", "surgeon", "logopedics", "hairremoval"
        ]
    },

    name: {
        presence: { allowEmpty: false },
        type: "string",
        length: {
            minimum: 1,
            maximum: 50
        }
    },

    firstName: {
        presence: false,
        type: "string",
        length: {
            minimum: 2,
            maximum: 30
        }
    },

    lastName: {
        presence: false,
        type: "string",
        length: {
            minimum: 2,
            maximum: 30
        }
    },

    email: {
        presence: { allowEmpty: false },
        type: "string",
        email: true
    },

    website: {
        presence: false,
        url: true,
        type: "string",
        length: {
            minimum: 3,
            maximum: 500
        }
    },

    telephone: {
        presence: false,
        type: "string",
        length: {
            minimum: 5,
            maximum: 30
        }
    },

    city: {
        presence: { allowEmpty: false },
        type: "string"
    },

    plz: {
        presence: { allowEmpty: false },
        type: "string"
    },

    street: {
        presence: { allowEmpty: false },
        type: "string"
    },

    house: {
        presence: { allowEmpty: false },
        type: "string",
        length: {
            minimum: 1,
            maximum: 10
        }
    },

}

export const groupMeta = {

    attributes: {
        presence: { allowEmpty: false },
        type: "array",
        exclusively: [
            "trans", "regularMeetings", "consulting", "activities"
        ]
    },

    specials: {
        presence: false,
        type: "string",
        length: {
            minimum: 0,
            maximum: 280
        }
    },

    minAge: {
        presence: false,
        type: "integer"
    }

}

export const therapistMeta = {

    subject: {
        presence: { allowEmpty: false },
        type: "string",
        inclusion: [
            "therapist", "psychologist"
        ]
    },

    offers: {
        presence: { allowEmpty: false },
        type: "array",
        exclusively: [
            "indication", "therapy", "expertise"
        ]
    }

}

export const surgeonMeta = {

    offers: {
        presence: { allowEmpty: false },
        type: "array",
        exclusively: [
            "mastectomy", "vaginPI", "vaginCombined", "ffs", "penoid", "breast", "hyst", "orch", "clitPI", "bodyfem"
        ]
    }

}

export const hairRemovalMeta = {

    attributes: {
        type: "array",
        exclusively: ["insurancePay", "transfrendly", "hasDoctor"]
    },

    offers: {
        presence: { allowEmpty: false },
        type: "array",
        exclusively: [
            "laser", "ipl", "electro", "electroAE"
        ]
    }

}

export const filterQuery = {

    lat: {
        presence: false,
        type: "number",
        requires: "long"
    },

    long: {
        presence: false,
        requires: "lat"
    },

    type: {
        type: "string",
        inclusion: [
            "group", "therapist", "endocrinologist", "surgeon", "logopedics", "hairremoval"
        ]
    },

    location: {
        presence: false,
        type: "string",
        length: {
            minimum: 2,
            maximum: 120,
        }
    },

    page: {
        presence: false,
        type: "integer"
    }

}
