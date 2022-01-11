/**
 * Returns a new array containing all values from the given array, except those specified in args
 * @param array Array to filter
 * @param args Values to filter
 * @returns New filtered Array
 */
export function allExcept(array: readonly string[], ...args : string[]) {
	var new_arr = array.filter(val => !args.includes(val));
	return new_arr;
}


interface ArrayDict {
	[key: string]: readonly string[]
}

/**
 * Merges child string arrays of an object into a single string array
 * @param dictionary 
 * @returns New merged array
 */
export function mergeArrays(dictionary: ArrayDict) {
	let new_arr: string[] = [];
	
	for (let key in dictionary) {
		new_arr = [...new_arr, ...dictionary[key]]
	}
	
	return new_arr;
}
