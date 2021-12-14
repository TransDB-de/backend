import axios from "axios"
import axiosRateLimit from "axios-rate-limit"

import { GeoJsonPoint } from "../models/database/geodata.model.js"

import { config } from "./config.service.js"

import { DatabaseAddress } from "../models/database/entry.model.js"


const axiosRl = axiosRateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 1100 });

/**
 * Get the coordinates in geojson format from address
 * @returns legacy coordinates array or null if request failed
 */
export async function getGeoByAddress(address: DatabaseAddress) {
	
	let data;
	
	try {
		let response = await axiosRl.get( config.osm.apiUrl, {
			params: {
				city: address.city,
				postalcode: address.plz,
				street: address.house + " " + address.street,
				format: "geojson"
			},
			headers: {
				"user-agent": config.osm.userAgent
			}
		});
		
		data = response.data?.features[0];
		
	} catch (e) {
		return null;
	}
	
	if ( !data || !data.geometry ) {
		return null
	}
	
	return data.geometry as GeoJsonPoint;
	
}

// double export to support named and default exports
export default getGeoByAddress;
