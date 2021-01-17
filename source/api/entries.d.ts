import { GeoJsonPoint } from "../api/geo.js";

interface _BaseForm {
    type: string,
    name: string,
    firstName?: string,
    lastName?: string,
    email: string,
    website?: string,
    telephone?: string
}

/** Entry object as stored in database and returned by get requests */
export interface Entry extends _BaseForm {
    _id: string | number,
    approved: boolean,
    address: Address,
    location: GeoJsonPoint | null,
    meta: GroupMeta & TherapistMeta & SurgeonMeta & HairRemovalMeta
}

export interface QueriedEntries {
    entries: Entry[] | null
    name: string
}

export interface GeoData {
    lat: number,
    lon: number,
    name: string
}

/** Api format of new entry post request */
export type NewApiEntry = BaseForm & GroupMeta & TherapistMeta & SurgeonMeta & HairRemovalMeta;

export interface Address {
    city: string,
    plz: string,
    street: string,
    house: string
}

export type BaseForm = _BaseForm & Address;

export interface GroupMeta {
    attributes?: [
        "trans", "regularMeetings", "consulting", "activities"
    ],
    specials?: string,
    minAge?: string
}

export interface TherapistMeta {
    subject?: string[],
    offers?: string[],
}

export interface SurgeonMeta {
    offers?: string[]
}

export interface HairRemovalMeta {
    attributes?: string[],
    offers?: string[]
}

export interface FilterQuery {
    lat?: number,
    long?: number,
    type: string,
    location?: string,
    page?: number
}

export interface EntryApproved {
    approved: boolean
}
