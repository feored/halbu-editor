import skillpages from "../tabs/skills/skillpages.json";
import skillsDataV99 from "../../../static/data/generated/skills/v99/skills_complete.json";
import skillsDataV105 from "../../../static/data/generated/skills/v105/skills_complete.json";

const BASE_CLASSES = Object.freeze([
	"Amazon",
	"Assassin",
	"Barbarian",
	"Druid",
	"Necromancer",
	"Paladin",
	"Sorceress",
]);

const FEMALE_CLASSES = new Set(["Amazon", "Assassin", "Sorceress"]);

const VERSION_CAPABILITIES = Object.freeze({
	99: Object.freeze({
		label: "v99",
		classes: BASE_CLASSES,
		classesRequiringExpansion: Object.freeze(["Druid", "Assassin"]),
		skillsData: skillsDataV99,
		skillPages: skillpages,
	}),
	105: Object.freeze({
		label: "v105",
		classes: Object.freeze([...BASE_CLASSES, "Warlock"]),
		classesRequiringExpansion: Object.freeze(["Druid", "Assassin", "Warlock"]),
		skillsData: skillsDataV105,
		skillPages: Object.freeze({
			...skillpages,
			Warlock: Object.freeze(["Chaos", "Eldritch", "Demon"]),
		}),
	}),
});

const SKILL_INDEX_CACHE = new Map();

export const KNOWN_SAVE_VERSIONS = Object.freeze(
	Object.keys(VERSION_CAPABILITIES)
		.map(Number)
		.sort((a, b) => a - b)
);

export const DEFAULT_NEW_SAVE_VERSION = KNOWN_SAVE_VERSIONS[KNOWN_SAVE_VERSIONS.length - 1];

function normalizeVersion(version) {
	const parsed = Number(version);
	return Number.isFinite(parsed) ? parsed : NaN;
}

function getCapabilities(version) {
	const normalizedVersion = normalizeVersion(version);
	return VERSION_CAPABILITIES[normalizedVersion] ?? null;
}

export function getVersionLabel(version) {
	const caps = getCapabilities(version);
	return caps == null ? `unknown (${version})` : caps.label;
}

export function formatIdLabel(formatValue) {
	if (typeof formatValue === "string") {
		return formatValue;
	}
	if (formatValue && typeof formatValue === "object" && "Unknown" in formatValue) {
		return `Unknown (${formatValue.Unknown})`;
	}
	return String(formatValue ?? "Unknown");
}

export function getSaveEditionLabel(save) {
	const format = save?.meta?.format;
	if (format === "V99") {
		return "D2R";
	}
	if (format === "V105") {
		return "ROTW";
	}
	if (format && typeof format === "object" && "Unknown" in format) {
		return `unknown (${format.Unknown})`;
	}

	const version = normalizeVersion(save?.version);
	if (version === 99) {
		return "D2R";
	}

	if (version === 105) {
		return "ROTW";
	}

	return `unknown (${save?.version ?? "?"})`;
}

export function isKnownSaveVersion(version) {
	return getCapabilities(version) != null;
}

export function getSupportedClasses(version) {
	const caps = getCapabilities(version);
	return caps == null ? [] : caps.classes;
}

export function isClassSupportedForVersion(version, className) {
	return getSupportedClasses(version).includes(className);
}

export function normalizeClassForVersion(version, className) {
	const classes = getSupportedClasses(version);
	if (classes.length === 0) {
		return null;
	}
	return classes.includes(className) ? className : classes[0];
}

export function getSkillsDataset(version) {
	const caps = getCapabilities(version);
	return caps == null ? null : caps.skillsData;
}

export function classLabel(classValue) {
	if (typeof classValue === "string") {
		return classValue;
	}
	if (classValue && typeof classValue === "object" && "Unknown" in classValue) {
		return `Unknown (${classValue.Unknown})`;
	}
	return String(classValue ?? "Unknown");
}

export function isFemaleClass(className) {
	return FEMALE_CLASSES.has(className);
}

export function requiresExpansion(version, className) {
	const caps = getCapabilities(version);
	if (caps == null) {
		return false;
	}
	return caps.classesRequiringExpansion.includes(className);
}

function deriveSkillPageNames(classSkills) {
	const pages = Array.from(
		new Set(classSkills.map((skill) => Number(skill.page)).filter(Number.isFinite))
	).sort((a, b) => a - b);

	if (pages.length === 0) {
		return [];
	}
	return pages.map((page) => `Skill Page ${page}`);
}

export function getSkillPageNames(version, className, classSkills = []) {
	const caps = getCapabilities(version);
	if (caps == null) {
		return deriveSkillPageNames(classSkills);
	}

	const mapped = caps.skillPages[className];
	if (Array.isArray(mapped) && mapped.length > 0) {
		return mapped;
	}
	return deriveSkillPageNames(classSkills);
}

function buildSkillIndex(version, className) {
	const key = `${version}:${className}`;
	if (SKILL_INDEX_CACHE.has(key)) {
		return SKILL_INDEX_CACHE.get(key);
	}

	const skillsData = getSkillsDataset(version);
	if (skillsData == null) {
		return null;
	}

	const index = new Map();
	for (const skill of skillsData) {
		if (skill.class !== className) {
			continue;
		}
		index.set(Number(skill.id), Number(skill.saveId));
	}
	SKILL_INDEX_CACHE.set(key, index);
	return index;
}

export function skillIdToSaveId(version, className, skillId) {
	const index = buildSkillIndex(version, className);
	if (index == null) {
		return -1;
	}
	return index.get(Number(skillId)) ?? -1;
}
