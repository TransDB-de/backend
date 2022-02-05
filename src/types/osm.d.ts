import type { GeoJsonPoint } from "../models/database/geodata.model"

export interface OSMSearch {
	type: "FeatureCollection",
	licence: string,
	features: OSMFeature[]
}

export interface OSMFeature {
	type: "Feature",
	properties: {
		place_id: string,
		osm_type: string,
		osm_id: string,
		display_name: string,
		place_rank: string,
		category: string,
		type: string,
		importance: number
	},
	bbox: number[],
	geometry: GeoJsonPoint
}
