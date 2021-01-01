let baseForm = {

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
            minimum: 5,
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
            minimum: 8,
            maximum: 100
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
        type: "integer"
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
            maximum: 4
        }
    },

};

let groupMeta = {

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
            maximum: 100
        }
    },

    minAge: {
        presence: false,
        type: "integer"
    }

}

let therapistMeta = {

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

let surgeonMeta = {

    offers: {
        presence: { allowEmpty: false },
        type: "array",
        exclusively: [
            "mastectomy", "vaginPI", "vaginCombined", "ffs", "penoid", "breast", "hyst", "orch", "clitPI", "bodyfem"
        ]
    }

}

let hairRemovalMeta = {

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

let filterQuery = {

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

    city: {
        presence: false,
        type: "string"
    },

    plz: {
        presence: false,
        type: "integer"
    },

    search: {
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

module.exports = { baseForm, groupMeta, therapistMeta, surgeonMeta, hairRemovalMeta, filterQuery };