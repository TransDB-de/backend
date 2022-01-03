import {
	ArrayNotEmpty,
	IsBoolean,
	IsEmail,
	IsEmpty,
	IsIn,
	IsInt,
	IsNumber,
	IsObject,
	IsOptional,
	IsUrl,
	Length,
	ValidateNested
} from "class-validator"
import * as FilterLang from "@transdb-de/filter-lang"
import { ArrayExclusively, IsEmptyArray, KeyedArrayExclusively } from "../../util/customValidators.util.js"
import { allExcept, mergeArrays } from "../../util/array.util.js"
import { RequestBody, Query } from "../request.js"
import { Type } from "class-transformer"

const types = [
	"group", "therapist", "surveyor", "endocrinologist",
	"surgeon", "logopedics", "hairremoval", "urologist", "gynecologist", "GP"
] as const;

const accessibility = [ "yes", "no", "unknown" ] as const;

const attributes = {
	group: ["trans", "regularMeetings", "consulting", "activities"],
	surveyor: ["enby"],
	surgeon: ["selfPayedOnly"],
	endocrinologist: ["treatsNB"],
	hairremoval: ["insurancePay", "transfriendly", "hasDoctor"],
	therapist: ["selfPayedOnly", "youthOnly", "treatsNB"],
	urologist: ["treatsNB", "transFem", "transMasc"],
	gynecologist: ["treatsNB", "transFem", "transMasc"],
	GP: ["treatsNB"]
} as const;


const offers = {
	therapist: ["indication", "therapy"],
	surgeon: ["mastectomy", "vaginPI", "vaginCombined", "ffs", "penoid", "breast", "hyst", "orch", "clitPI", "bodyfem", "glottoplasty", "fms"],
	hairremoval: ["laser", "ipl", "electro", "electroAE"],
	urologist: ["hrt", "medication"],
	gynecologist: ["hrt", "medication"],
	GP: ["hrt", "medication"]
} as const;

export class Entry extends RequestBody {
	@IsIn(types)
	type !: typeof types[number];
	
	@Length(1, 160)
	name !: string;
	
	@IsOptional()
	@Length(2, 30)
	firstName ?: string;
	
	@IsOptional()
	@Length(2, 30)
	lastName ?: string;
	
	@IsOptional()
	@Length(5, 320)
	@IsEmail()
	email ?: string;
	
	@IsOptional()
	@Length(5, 500)
	@IsUrl()
	website ?: string;
	
	@IsOptional()
	@Length(5, 30)
	telephone ?: string;
	
	@IsOptional()
	@IsIn(accessibility)
	accessible ?: typeof accessibility[number];
	
	@ValidateNested()
	@Type(() => Address)
	address !: Address
	
	@ValidateNested()
	@Type(() => Meta)
	meta !: Meta
}


export class Address {
	@Length(2, 50)
	city !: string;
	
	@IsOptional()
	@Length(0, 10)
	plz ?: string;
	
	@IsOptional()
	@Length(0, 50)
	street ?: string;
	
	@IsOptional()
	@Length(0, 10)
	house ?: string;
}


export class Meta {
	@IsOptional()
	@IsEmptyArray({ groups: allExcept(types, ...Object.keys(attributes)) })
	@KeyedArrayExclusively(attributes)
	attributes ?: string[];
	
	@IsOptional({ groups: allExcept(types, ...Object.keys(offers)) })
	@IsEmptyArray({ groups: allExcept(types, ...Object.keys(offers)) })
	@ArrayNotEmpty({ groups: Object.keys(offers) })
	@KeyedArrayExclusively(offers)
	offers ?: string[];
	
	@IsEmpty({ groups: allExcept(types, "group") })
	@IsOptional({ groups: ["group"] })
	@Length(0, 280, { groups: ["group"] })
	specials ?: string;
	
	@IsEmpty({ groups: allExcept(types, "group") })
	@IsOptional({ groups: ["group"] })
	@IsNumber({}, { groups: ["group"] })
	minAge ?: number;
	
	@IsEmpty({ groups: allExcept(types, "therapist") })
	@IsIn(["therapist", "psychologist", "naturopath", "other"], { groups: ["therapist"] })
	subject ?: string;
}

export class EditEntry extends Entry {
	@IsBoolean()
	approved !: boolean;
	
	@IsBoolean()
	blocked !: boolean
}

export class FilterQuery extends Query {
	@IsEmpty({ groups: ["noCoords"] })
	@IsNumber({}, { groups: ["hasCoords"] })
	lat ?: number;
	
	@IsEmpty({ groups: ["noCoords"] })
	@IsNumber({}, { groups: ["hasCoords"] })
	long ?: number;
	
	@IsOptional()
	@IsIn(types)
	type ?: typeof types[number];
	
	@IsOptional()
	@ArrayExclusively( mergeArrays(offers) )
	offers ?: string[];
	
	@IsOptional()
	@ArrayExclusively( mergeArrays(attributes) )
	attributes ?: string[];
	
	@IsOptional()
	@Length(2, 120)
	location ?: string;
	
	@IsOptional()
	@Length(0, 120)
	text ?: string;
	
	@IsOptional()
	@IsNumber()
	page ?: number;
	
	@IsOptional()
	@IsIn(accessibility)
	accessible ?: typeof accessibility[number];
}

export class FilterFull {
	@IsObject()
	filter !: FilterLang.IntermediateFormat.AbstractFilters;
	
	@IsInt()
	page !: number;
}
