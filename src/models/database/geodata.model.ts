import { ObjectId } from "mongodb";

export interface GeoJsonPoint {
	type: "Point",
	coordinates: [number, number]
}


export interface GeoData {
	_id: string | ObjectId,
	level: number,
	name: string,
	ascii: string,
	plz: string,
	location: GeoJsonPoint | null,
	referenceLocation: GeoJsonPoint | null
}

export interface GeoPlace {
	name: string,
	location: GeoJsonPoint
}
