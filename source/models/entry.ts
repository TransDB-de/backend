export const baseForm = {

    type: {
        presence: { allowEmpty: false },
        type: "string",
        inclusion: [
            "group", "therapist", "surveyor", "endocrinologist", "surgeon", "logopedics", "hairremoval"
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
        presence: false,
        type: "string",
        email: true,
        length: {
            minimum: 5,
            maximum: 320
        }
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
    }

}

export const address = {
    city: {
        presence: { allowEmpty: false },
        type: "string"
    },

    plz: {
        presence: false,
        type: "string"
    },

    street: {
        presence: false,
        requires: "city",
        type: "string"
    },

    house: {
        presence: false,
        requires: "street",
        type: "string",
        length: {
            minimum: 1,
            maximum: 10
        }
    }
}

export const baseEntry = {
    ...baseForm,
    ...address
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
            "indication", "therapy"
        ]
    }

}

export const surveyorMeta = {

    attributes: {
        type: "array",
        exclusively: ["enby"]
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
        exclusively: ["insurancePay", "transfriendly", "hasDoctor"]
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
            "group", "therapist", "surveyor", "endocrinologist", "surgeon", "logopedics", "hairremoval"
        ]
    },

    offers: {
        presence: false,
        type: "array",
        exclusively: [
            "indication", "therapy", "mastectomy", "vaginPI", "vaginCombined", "ffs", "penoid", "breast",
            "hyst", "orch", "clitPI", "bodyfem", "laser", "ipl", "electro", "electroAE"
        ]
    },

    attributes: {
        presence: false,
        type: "array",
        exclusively: [
            "trans", "regularMeetings", "consulting", "activities", "insurancePay", "transfriendly", "hasDoctor", "enby"
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

    text: {
        presence: false,
        type: "string",
        length: {
            minimum: 2,
            maximum: 120
        }
    },

    page: {
        presence: false,
        type: "integer"
    }

}
