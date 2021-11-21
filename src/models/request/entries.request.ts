import { IsEmail, isEmpty, IsEmpty, IsIn, IsNotEmpty, IsNumber, IsOptional, IsUrl, Length, ValidateNested } from "class-validator"
import * as FilterLang from "@transdb-de/filter-lang"
import { ArrayExclusively, IsEmptyArray } from "../../util/customValidators.js"
import { allExcept, mergeArrays } from "../../util/arrayUtils.js"
import { RequestBody, Query } from "../request.js"

const types = [
	"group", "therapist", "surveyor", "endocrinologist",
	"surgeon", "logopedics", "hairremoval"
] as const;


const accessibility = [ "yes", "no", "unkown" ] as const;


const attributes = {
	group: ["trans", "regularMeetings", "consulting", "activities"],
	surveyor: ["enby"],
	endocrinologist: ["treatsNB"],
	hairremoval: ["insurancePay", "transfriendly", "hasDoctor"],
} as const;


const offers = {
	therapist: ["indication", "therapy"],
	surgeon: ["mastectomy", "vaginPI", "vaginCombined", "ffs", "penoid", "breast", "hyst", "orch", "clitPI", "bodyfem", "glottoplasty", "fms"],
	hairremoval: ["laser", "ipl", "electro", "electroAE"]
} as const;


export class Entry extends RequestBody {
	@IsIn(types)
	type !: typeof types[number];
	
	@Length(1, 100)
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
	@Length(5, 320)
	@IsUrl()
	website ?: string;
	
	@IsOptional()
	@Length(5, 30)
	telephone ?: string;
	
	@IsOptional()
	@IsIn(accessibility)
	accessible ?: typeof accessibility[number];
	
	@ValidateNested()
	address !: Address
	
	@ValidateNested()
	meta !: Meta
}


export class Address {
	@Length(1, 50)
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
	@IsEmptyArray({ groups: allExcept(types, "group", "surveyor", "endocrinologist", "hairremoval") })
	@ArrayExclusively(attributes.group, { groups: ["group"] })
	@ArrayExclusively(attributes.surveyor, { groups: ["surveyor"] })
	@ArrayExclusively(attributes.endocrinologist, { groups: ["endocrinologist"] })
	@ArrayExclusively(attributes.hairremoval, { groups: ["hairremoval"] })
	attributes !: string[];
	
	@IsEmptyArray({ groups: allExcept(types, "therapist", "surgeon", "hairremoval") })
	@ArrayExclusively(offers.therapist, { groups: ["therapist"] })
	@ArrayExclusively(offers.surgeon, { groups: ["surgeon"] })
	@ArrayExclusively(offers.hairremoval, { groups: ["hairremoval"] })
	offers !: string[];
	
	@IsEmpty({ groups: allExcept(types, "group") })
	@IsOptional({ groups: ["group"] })
	@Length(0, 280)
	specials ?: string;
	
	@IsEmpty({ groups: allExcept(types, "group") })
	@IsOptional({ groups: ["group"] })
	@IsNumber({}, { groups: ["group"] })
	minAge ?: number;
	
	@IsEmpty({ groups: allExcept(types, "therapist") })
	@IsIn(["therapist", "psychologist"], { groups: ["therapist"] })
	subject ?: string;
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
	@Length(2, 120)
	text ?: string;
	
	@IsOptional()
	@IsNumber()
	page ?: number;
	
	@IsOptional()
	@IsIn(accessibility)
	accessible ?: typeof accessibility[number];
}

export interface FilterFull { filter: FilterLang.IntermediateFormat.AbstractFilters, page: number }
