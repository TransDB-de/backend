import { GeoJsonPoint } from "../api/geo.js";
import FilterLang from "filter-lang";

interface _BaseForm {
    type: string,
    name: string,
    firstName: string | null,
    lastName: string | null,
    email: string,
    website: string | null,
    telephone: string | null
}

/** Entry object as returned by get requests */
export interface Entry extends _BaseForm {
    _id: string,
    approved?: boolean,
    address: Address,
    location: GeoJsonPoint | null,
    distance?: number,
    meta: GroupMeta | TherapistMeta | SurveyorMeta | SurgeonMeta | HairRemovalMeta
}

/** Partial Entry object, used to edit fields of an enrty */
export interface EntryEdit extends Partial<
    Omit<Entry, "_id" | "location" | "distance">
> {}

/** Entry object as sent to admins in detail view */
export interface FullEntry extends Entry {
    submittedTimestamp?: number,
    approvedTimestamp?: number,
    /** Username of user who approved this entry */
    approvedBy?: string
}

export interface QueriedEntries {
    entries: Entry[] | null
    locationName: string,
    more: boolean
}

export interface GeoData {
    lat: number,
    lon: number,
    name: string
}

/** Api format of new entry post request */
export type NewApiEntry = BaseForm & GroupMeta & SurveyorMeta & TherapistMeta & SurgeonMeta & HairRemovalMeta;

export interface Address {
    city: string,
    plz: string,
    street: string,
    house: string
}

export type BaseForm = _BaseForm & Address;

export interface GroupMeta {
    attributes: [
        "trans", "regularMeetings", "consulting", "activities"
    ] | null,
    specials: string | null,
    minAge: string | null
}

export interface TherapistMeta {
    subject: string[] | null,
    offers: string[] | null,
}

export interface SurveyorMeta {
    attributes: string[] | null,
}

export interface SurgeonMeta {
    offers: string[] | null
}

export interface HairRemovalMeta {
    attributes: string[] | null,
    offers: string[] | null
}

export interface FilterQuery {
    lat?: number,
    long?: number,
    type: string,
    offers?: string[],
    attributes?: string[],
    location?: string,
    text?: string,
    page?: number
}

export interface ApproveQuery {
    approve?: boolean
}

export interface EntryApproved {
    approved: boolean
}

export interface FilterFull {
    filter: FilterLang.IntermediateFormat.AbstractFilters
    page: number
}

export interface FilteredEntries {
    entries: FullEntry[]
    more: boolean
}

export interface UnapprovedEntries {
    entries: Entry[]
    more: boolean
}
