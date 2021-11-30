import {registerDecorator, ValidationOptions, ValidationArguments} from "class-validator";

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