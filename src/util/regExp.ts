/*
This module provide utility methods for dealing with Regular Expressions
*/

/**
 * Makes a regular expression from a user provided input string.
 * Escapes the user input, so no regular expressions can be injected.
 * @param string string to convert
 * @param flags flags to set on RegExp
 */
 export function stringToRegex(string: string, flags?: string): RegExp {
	const escapedStr = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(escapedStr, flags);
}
