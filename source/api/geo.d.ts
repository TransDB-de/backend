export interface GeoDataQuery {
	search: string
}

export interface GeoJsonPoint {
	type: "Point",
	coordinates: [number, number]
}

export interface GeoPlace {
	name: string,
	location: GeoJsonPoint
}
