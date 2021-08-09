
/**
 * Converts an input string to an "ascii" string, as used in OpenGeoDB data.
 * Removes special characters, and makes all letters upper case.
 * Example: "Düsseldorf" becomes "DUESSELDORF".
 * @param input string to convert
 */
export function convertToAscii(input: string): string {
	// special conversion cases
	let str = input;

	str = str.replace(/ß|ẞ/g, "ss"); // Match both, as the i flag does not catch capital ß
	str = str.replace(/ä/ig, "ae");
	str = str.replace(/ö/ig, "oe");
	str = str.replace(/ü/ig, "ue");
	
	str = str.replace(/sankt/ig, "ST.");

	// remove additional accents
	let norm = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	// OpenGeoDB stores all "ascii" names in upper case
	return norm.toUpperCase();
}
