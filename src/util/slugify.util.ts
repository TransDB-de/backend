/**
 * Returns regex matching the lowercase numbers and letters only ignoring all other chars
 * @param string The string to slugify
 * @returns RegExp containing the slug
 */
export default function slugify(input: string): RegExp {
	// purge region specific letter combinations, which might be a drop-in for a special char
	input = input.replace(/oe|ae|ue|ss/gi, ".*");
	
	return new RegExp(input.replace(/[^a-z0-9]/gi, ".*").toLowerCase());
}
