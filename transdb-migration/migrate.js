#!/usr/bin/env node
// Usage: node migrate.js <input.json> [--output-dir <dir>] [--tickets <tickets.json>]

const fs = require("fs");
const path = require("path");

// ---------- Helpers ----------

function oid(hex) {
	return { $oid: hex };
}

function date(isoString) {
	return { $date: isoString };
}

function parseTimestamp(value) {
	if (value === null || value === undefined) {
		return null;
	}
	// mongoexport Legacy/Canonical: { "$numberLong": "1700000000000" }
	if (typeof value === "object" && value.$numberLong !== undefined) {
		return new Date(parseFloat(value.$numberLong)).toISOString();
	}
	// mongoexport Relaxed (v2): plain number in Millisekunden
	if (typeof value === "number") {
		return new Date(value).toISOString();
	}
	// ISO-String Fallback
	if (typeof value === "string") {
		return new Date(value).toISOString();
	}
	return null;
}

function activity(entryId, type, timestamp, userId = null, comment = null) {
	const doc = {
		entryId: oid(entryId),
		type,
		timestamp: timestamp !== null ? date(timestamp) : null,
	};

	if (userId !== null) {
		doc.userId = userId;
	}
	if (comment !== null) {
		doc.comment = comment;
	}

	return doc;
}

// Converts a plain object to MongoDB ArrayOfArrays format as required by
// BsonDictionaryOptions(DictionaryRepresentation.ArrayOfArrays) in EntryActivity.
function attachments(obj) {
	return Object.entries(obj);
}

// ---------- Mapping tables ----------

const typeMap = {
	group: "Group",
	therapist: "Therapist",
	endocrinologist: "Endocrinologist",
	surgeon: "Surgeon",
	logopedics: "Logopedics",
	hairremoval: "Hairremoval",
	urologist: "Urologist",
	gynecologist: "Gynecologist",
	GP: "GP",
	pharmacy: "Pharmacy",
	cryo: "Cryo",
	// surveyor (Gutachter) intentionally omitted — obsolete since SBGG replaced TSG
};

const titleMap = {
	dr: "Dr",
	prof: "Prof",
	prof_dr: "ProfDr",
};

const attributeMap = {
	trans: "Trans",
	regularMeetings: "RegularMeetings",
	consulting: "Consulting",
	activities: "Activities",
	remote: "Remote",
	enby: "TreatsEnby",
	treatsNB: "TreatsEnby",
	selfPayedOnly: "SelfPayedOnly",
	youthOnly: "YouthOnly",
	insurancePay: "InsurancePay",
	transfriendly: "Transfriendly",
	hasDoctor: "HasDoctor",
	transFem: "TransFem",
	transMasc: "TransMasc",
	shipping: "Shipping",
	singleUseVials: "SingleUseVials",
	reuseVial: "ReuseVial",
	prefilled: "Prefilled",
};

const offerMap = {
	mastectomy: "Mastectomy",
	vaginPI: "VaginPI",
	vaginCombined: "VaginCombined",
	ffs: "Ffs",
	penoid: "Penoid",
	breast: "Breast",
	hyst: "Hyst",
	orch: "Orch",
	clitPI: "ClitPI",
	bodyfem: "Bodyfem",
	glottoplasty: "Glottoplasty",
	fms: "Fms",
	laser: "Laser",
	ipl: "Ipl",
	electro: "Electro",
	electroAE: "ElectroAE",
	indication: "Indication",
	therapy: "Therapy",
	hrt: "Hrt",
	medication: "Medication",
	eInjection: "EInjection",
	cpa: "Cpa",
	freezesSperm: "FreezesSperm",
	freezesEggs: "FreezesEggs",
};

const subjectMap = {
	therapist: "Therapist",
	psychologist: "Psychologist",
	naturopath: "Naturopath",
	other: "Other",
};

// ---------- Arguments ----------

if (process.argv.length < 3) {
	console.error("Usage: node migrate.js <input.json> [--output-dir <dir>]");
	process.exit(1);
}

const inputFile = process.argv[2];
let outputDir = path.dirname(path.resolve(inputFile));
let ticketsFile = null;

for (let i = 3; i < process.argv.length - 1; i++) {
	if (process.argv[i] === "--output-dir") {
		outputDir = process.argv[i + 1];
	}
	if (process.argv[i] === "--tickets") {
		ticketsFile = process.argv[i + 1];
	}
}

// ---------- Convert ----------

const docs = JSON.parse(fs.readFileSync(inputFile, "utf8"));
const entries = [];
const activities = [];
const submittedActivityByEntryId = {};
const approvedActivityByEntryId = {};
let warnings = 0;
let skipped = 0;

for (const doc of docs) {
	const entryId = doc._id.$oid;

	// Type
	const mappedType = typeMap[doc.type];
	if (!mappedType) {
		console.error(`[ERROR] Unknown type "${doc.type}" on entry "${doc.name}", skipping`);
		skipped++;
		continue;
	}

	// Timestamps
	const submittedAt = parseTimestamp(doc.submittedTimestamp);

	let approvedAt = null;
	let approvedBy = null;
	if (doc.approvedTimestamp != null) {
		approvedAt = parseTimestamp(doc.approvedTimestamp);

		if (doc.approvedBy?.$oid) {
			approvedBy = doc.approvedBy.$oid ?? null;
		} else {
			approvedBy = doc.approvedBy ?? null;
		}
	}

	// Accessible: "yes"/"no"/"unknown" -> bool?
	const accessibleMap = { yes: true, no: false };
	const accessible = doc.accessible in accessibleMap ? accessibleMap[doc.accessible] : null;

	// Meta
	const meta = doc.meta ?? {};

	const attributes = (meta.attributes ?? []).flatMap((key) => {
		if (attributeMap[key]) {
			return [attributeMap[key]];
		}
		console.error(`[WARN] Unknown attribute '${key}' on entry ${entryId}`);
		warnings++;
		return [];
	});

	const offers = (meta.offers ?? []).flatMap((key) => {
		if (offerMap[key]) {
			return [offerMap[key]];
		}
		console.error(`[WARN] Unknown offer '${key}' on entry ${entryId}`);
		warnings++;
		return [];
	});

	// Address
	const address = {
		city: doc.address.city,
		plz: doc.address.plz ?? null,
		street: doc.address.street ?? null,
		house: doc.address.house ?? null,
	};

	// Location (GeoJSON pass-through)
	const location = doc.location
		? { type: "Point", coordinates: doc.location.coordinates }
		: null;

	// Contact person (only set if at least one field is present)
	const hasContact = doc.academicTitle || doc.firstName || doc.lastName;
	const contact = hasContact
		? {
			academicTitle: titleMap[doc.academicTitle] ?? null,
			firstName: doc.firstName ?? null,
			lastName: doc.lastName ?? null,
		}
		: null;

	// Build entry document
	const entry = {
		_id: oid(entryId),
		status: {
			approved: doc.approved ?? false,
			blocked: doc.blocked ?? false,
			archived: false,
		},
		type: mappedType,
		name: doc.name,
		contact,
		email: doc.email ?? null,
		telephone: doc.telephone ?? null,
		website: doc.website ?? null,
		accessible,
		address,
		location,
		attributes,
		offers,
		specials: meta.specials ?? null,
		subject: subjectMap[meta.subject] ?? null,
	};

	if (doc.possibleDuplicate != null) {
		const duplicateMatch = {
			entryId: oid(doc.possibleDuplicate.$oid),
			probability: 0,
		};
		entry.possibleDuplicate = duplicateMatch;
		activities.push({
			...activity(entryId, "DuplicateDetected", submittedAt),
			attachments: attachments({ PossibleDuplicate: duplicateMatch }),
		});
	}

	entries.push(entry);

	// Activities
	const submittedActivity = activity(entryId, "Submitted", submittedAt);
	submittedActivityByEntryId[entryId] = submittedActivity;
	activities.push(submittedActivity);

	if (approvedAt !== null) {
		const approvedActivity = activity(entryId, "Approved", approvedAt, approvedBy);
		approvedActivityByEntryId[entryId] = approvedActivity;
		activities.push(approvedActivity);
	}

	if (doc.blocked) {
		activities.push(activity(entryId, "Blocked", null, null));
	}

}

// ---------- Tickets ----------

const reportTypeMap = {
	"report": "Report",
	"edit": "Edit",
	"other": "Other",
};

if (ticketsFile) {
	const tickets = JSON.parse(fs.readFileSync(ticketsFile, "utf8"));
	let ticketActivities = 0;

	for (const ticket of tickets) {
		if (!ticket.entry_id) {
			console.error(`[WARN] Ticket #${ticket.id} ("${ticket.title}") has no entry_id, skipping`);
			warnings++;
			continue;
		}
		
		if (ticket.type === "new-entry") {
			const submitted = submittedActivityByEntryId[ticket.entry_id];
			if (!submitted) {
				console.error(`[WARN] new-entry ticket #${ticket.id} references unknown entry ${ticket.entry_id}, skipping`);
				warnings++;
				continue;
			}
			const cms = attachments({ CmsTicketId: String(ticket.id) });
			submitted.attachments = cms;
			const approved = approvedActivityByEntryId[ticket.entry_id];
			if (approved) approved.attachments = cms;
			ticketActivities++;
			continue;
		}

		const reportType = reportTypeMap[ticket.type];
		if (!reportType) {
			console.error(`[WARN] Ticket #${ticket.id} has unknown type "${ticket.type}", skipping`);
			warnings++;
			continue;
		}

		const act = activity(ticket.entry_id, "Reported", ticket.date_created, null, ticket.description);
		act.attachments = attachments({
			ReportType: reportType,
			CmsTicketId: String(ticket.id),
		});
		activities.push(act);
		ticketActivities++;
	}

	console.log(`  + ${ticketActivities} ticket activities from ${ticketsFile}`);
}

// ---------- Write output ----------

fs.mkdirSync(outputDir, { recursive: true });

const entriesPath = path.join(outputDir, "entries.json");
const activitiesPath = path.join(outputDir, "activities.json");
fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
fs.writeFileSync(activitiesPath, JSON.stringify(activities, null, 2));

const warningNote = warnings > 0 ? `, ${warnings} warnings` : "";
const skippedNote = skipped > 0 ? `, ${skipped} skipped` : "";
console.log(`Done: ${entries.length} entries, ${activities.length} activities${warningNote}${skippedNote}`);
console.log(`  → ${entriesPath}`);
console.log(`  → ${activitiesPath}`);
