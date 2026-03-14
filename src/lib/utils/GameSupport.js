import skillpages from "../editor/skills/skillpages.json";
import skillsDataV99 from "../../../static/data/generated/skills/v99/skills_complete.json";
import skillsDataV105 from "../../../static/data/generated/skills/v105/skills_complete.json";

const BASE_CLASSES = [
	"Amazon",
	"Assassin",
	"Barbarian",
	"Druid",
	"Necromancer",
	"Paladin",
	"Sorceress",
];

const FEMALE_CLASSES = new Set(["Amazon", "Assassin", "Sorceress"]);

const VERSION_CAPABILITIES = {
	99: {
		label: "v99",
		classes: BASE_CLASSES,
		classesRequiringExpansion: ["Druid", "Assassin"],
		skillsData: skillsDataV99,
		skillPages: skillpages,
	},
	105: {
		label: "v105",
		classes: [...BASE_CLASSES, "Warlock"],
		classesRequiringExpansion: ["Druid", "Assassin", "Warlock"],
		skillsData: skillsDataV105,
		skillPages: {
			...skillpages,
			Warlock: ["Chaos", "Eldritch", "Demon"],
		},
	},
};

const SKILL_INDEX_CACHE = new Map();
const SAVE_EXPANSION_TYPES = new Set(["Classic", "Expansion", "RotW"]);

export const KNOWN_SAVE_VERSIONS = (
	Object.keys(VERSION_CAPABILITIES)
		.map(Number)
		.sort((a, b) => a - b)
);

export const DEFAULT_NEW_SAVE_VERSION = KNOWN_SAVE_VERSIONS[KNOWN_SAVE_VERSIONS.length - 1];

function normalizeVersion(version) {
	if (!Number.isInteger(version)) {
		throw new Error(`Invalid save version: ${version}.`);
	}
	return version;
}

function getCapabilities(version) {
	const normalizedVersion = normalizeVersion(version);
	return VERSION_CAPABILITIES[normalizedVersion] ?? null;
}

function unknownVariantPayload(value) {
	if (typeof value !== "string") {
		return null;
	}
	const match = /^Unknown\((\d+)\)$/.exec(value);
	return match == null ? null : Number(match[1]);
}

export function parseExpansionTypeLabel(value) {
	if (typeof value !== "string" || !SAVE_EXPANSION_TYPES.has(value)) {
		throw new Error(`Invalid expansion type label: ${String(value)}.`);
	}
	return value;
}

export function getSaveExpansionType(save) {
	return save.expansion_type;
}

export function isExpandedMode(expansionType) {
	return expansionType !== "Classic";
}

export function getSaveFormatIdLabel(save) {
	const format = save.meta.format;
	const unknownPayload = unknownVariantPayload(format);
	if (unknownPayload != null) {
		return `Unknown(${unknownPayload})`;
	}
	return format;
}

export function getSaveTargetVersion(save) {
	const format = save.meta.format;
	if (format === "V99") {
		return 99;
	}
	if (format === "V105") {
		return 105;
	}
	const version = save.version;
	return version === 99 || version === 105 ? version : null;
}

export function getSaveEditionLabel(save) {
	const format = save.meta.format;
	if (format === "V99") {
		return "D2R Legacy";
	}
	if (format === "V105") {
		return "D2R RotW";
	}
	const unknownPayload = unknownVariantPayload(format);
	if (unknownPayload != null) {
		return `unknown (${unknownPayload})`;
	}
	return "unknown";
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
	return classValue;
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
		new Set(classSkills.map((skill) => skill.page))
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
	if (mapped != null && mapped.length > 0) {
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
		index.set(skill.id, skill.saveId);
	}
	SKILL_INDEX_CACHE.set(key, index);
	return index;
}

export function skillIdToSaveId(version, className, skillId) {
	const index = buildSkillIndex(version, className);
	if (index == null) {
		return -1;
	}
	return index.get(skillId) ?? -1;
}
