import fs from "fs";
import path from "path";

export function loadGQLFiles<K>(queriesPath: string) {
	const files = fs.readdirSync(queriesPath);
	const queries = new Map<K, { query: string }>();

	for (const file of files) {
		const p = path.join(queriesPath, file);
		const raw = fs.readFileSync(p, "utf8");

		queries.set(file.split(".")[0] as K, { query: raw });
	}

	return queries;
}