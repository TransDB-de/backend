import { registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";

/**
 * Decorator
 * 
 * Validates if an array contains only the given values
 * @param exclusively Array of values with the exclusively allowed values for incoming arrays
 */
export function ArrayExclusively(exclusively: readonly string[], validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: "arrayExclusively",
			target: object.constructor,
			propertyName: propertyName,
			constraints: [exclusively],
			options: {...validationOptions, message: `Array should exclusively contain these values: ${exclusively.join(", ")}`},
			validator: {
				validate(value: any, args: ValidationArguments) {
					if (!Array.isArray(value)) return false;
					
					for (let valueElement of value) {
						if (!args.constraints[0].includes(valueElement)) {
							return false;
						}
					}
					return true;
				}
			}
		});
	};
}

/**
 * Decorator
 * 
 * Validates if an object is an empty array
 * 
 * @param validationOptions ClassValidator options
 */
export function IsEmptyArray(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: "isEmptyArray",
			target: object.constructor,
			propertyName: propertyName,
			constraints: [],
			options: {...validationOptions, message: `Should be an empty Array`},
			validator: {
				validate(value: any, args: ValidationArguments) {
					return Array.isArray(value) && value.length === 0;
				}
			}
		});
	};
}

/**
 * Decorator
 * 
 * ArrayExclusively Validator, which extracts it's constraints from an object,
 * and automatically assings groups based on the objects keys
 * @param arrayObj Object containing an array per key with the exclusively allowed values
 */
export function KeyedArrayExclusively(arrayObj: {[key: string]: readonly string[]}) {
	return function (object: Object, propertyName: string) {
		for (const key in arrayObj) {
			const exclusively = arrayObj[key];
			const validationOptions = { groups: [key] };
			
			registerDecorator({
				name: "arrayExclusively",
				target: object.constructor,
				propertyName: propertyName,
				constraints: [exclusively],
				options: {...validationOptions, message: `Array should exclusively contain these values: ${exclusively.join(", ")}`},
				validator: {
					validate(value: any, args: ValidationArguments) {
						if (!Array.isArray(value)) return false;
						
						for (let valueElement of value) {
							if (!args.constraints[0].includes(valueElement)) {
								return false;
							}
						}
						return true;
					}
				}
			});
		}
	};
}
