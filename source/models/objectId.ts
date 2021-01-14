export const objectId = {

    id: {
        presence: { allowEmpty: false },
        format: {
            pattern: "^[0-9a-fA-F]{24}$"
        }
    }

}
