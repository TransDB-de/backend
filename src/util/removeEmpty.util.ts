// Source: https://stackoverflow.com/questions/286141/remove-blank-attributes-from-an-object-in-javascript

/**
 * Removes all (recursively) empty properties (null) from an object.
 * @param obj the object to remove empty properties from
 * @returns the object without null properties
 */
export default function removeEmptyUtil(obj: object): object {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([k, v]) => [k, v === Object(v) ? removeEmptyUtil(v) : v])
    );
}