import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const posix = path.posix;

const importerExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".svelte"]);
const resolveExtensions = [".ts", ".js", ".svelte", ".json", ".css", ".mjs", ".cjs"];
const skipDirectories = new Set([
	".git",
	".svelte-kit",
	"coverage",
	"dist",
	"node_modules",
	"target",
]);

const repoFiles = new Set();
const repoFilesByLower = new Map();
const importers = [];

walk(root);

for (const file of repoFiles) {
	repoFilesByLower.set(file.toLowerCase(), file);
}

const failures = [];

for (const importer of importers) {
	const content = fs.readFileSync(path.join(root, importer), "utf8");
	const specifiers = new Set();

	for (const match of content.matchAll(/\bfrom\s*["']([^"']+)["']/g)) {
		specifiers.add(match[1]);
	}

	for (const match of content.matchAll(/^\s*import\s*["']([^"']+)["']/gm)) {
		specifiers.add(match[1]);
	}

	for (const match of content.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
		specifiers.add(match[1]);
	}

	for (const specifier of specifiers) {
		const targetBase = getTargetBase(importer, specifier);
		if (targetBase == null) {
			continue;
		}

		const candidates = getCandidates(targetBase, specifier);
		if (candidates.some((candidate) => repoFiles.has(candidate))) {
			continue;
		}

		const matches = [...new Set(
			candidates
				.map((candidate) => repoFilesByLower.get(candidate.toLowerCase()) ?? null)
				.filter((candidate) => candidate != null),
		)];

		if (matches.length > 0) {
			failures.push({
				importer,
				specifier,
				matches,
			});
		}
	}
}

if (failures.length > 0) {
	console.error("Import path case mismatches found:\n");
	for (const failure of failures) {
		console.error(`${failure.importer}`);
		console.error(`  import: ${failure.specifier}`);
		console.error(`  actual: ${failure.matches.join(", ")}`);
		console.error("");
	}
	process.exit(1);
}

console.log(`Import path casing is clean across ${importers.length} source files.`);

function walk(currentPath) {
	for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
		if (skipDirectories.has(entry.name)) {
			continue;
		}

		const nextPath = path.join(currentPath, entry.name);
		if (entry.isDirectory()) {
			walk(nextPath);
			continue;
		}

		const relativePath = posix.normalize(path.relative(root, nextPath).replace(/\\/g, "/"));
		repoFiles.add(relativePath);

		if (importerExtensions.has(path.extname(entry.name))) {
			importers.push(relativePath);
		}
	}
}

function getTargetBase(importer, specifier) {
	const cleanSpecifier = specifier.split("?")[0].split("#")[0];

	if (cleanSpecifier === "$lib") {
		return "src/lib";
	}

	if (cleanSpecifier.startsWith("$lib/")) {
		return posix.normalize(`src/lib/${cleanSpecifier.slice(5)}`);
	}

	if (cleanSpecifier.startsWith("./") || cleanSpecifier.startsWith("../")) {
		return posix.normalize(posix.join(posix.dirname(importer), cleanSpecifier));
	}

	return null;
}

function getCandidates(targetBase, specifier) {
	if (path.extname(specifier.split("?")[0].split("#")[0]).length > 0) {
		return [targetBase];
	}

	const candidates = [];
	for (const extension of resolveExtensions) {
		candidates.push(`${targetBase}${extension}`);
		candidates.push(`${targetBase}/index${extension}`);
	}
	return candidates;
}
