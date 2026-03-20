import skillPagesJson from "$lib/editor/skills/skillsPages.json";
import skills99Json from "../../../static/data/generated/skills/v99/skills_complete.json";
import skills105Json from "../../../static/data/generated/skills/v105/skills_complete.json";
import type { SkillData } from "$lib/editor/skills/skillsTypes";
import type {
	EditorSave,
	ExpansionType,
	KnownClassName,
	SaveFormatId,
	SaveLayoutVersion,
} from "$lib/types/editor";

type SupportedClass = {
	name: KnownClassName;
	requiredExpansion: ExpansionType;
};

const CLASSES_99: readonly SupportedClass[] = [
	{ name: "Amazon", requiredExpansion: "Classic" },
	{ name: "Assassin", requiredExpansion: "Expansion" },
	{ name: "Barbarian", requiredExpansion: "Classic" },
	{ name: "Druid", requiredExpansion: "Expansion" },
	{ name: "Necromancer", requiredExpansion: "Classic" },
	{ name: "Paladin", requiredExpansion: "Classic" },
	{ name: "Sorceress", requiredExpansion: "Classic" },
];

const CLASSES_105: readonly SupportedClass[] = [
	...CLASSES_99,
	{ name: "Warlock", requiredExpansion: "RotW" },
];

const SKILLS_99 = skills99Json as readonly SkillData[];
const SKILLS_105 = skills105Json as readonly SkillData[];

const SKILL_PAGES_99 = skillPagesJson as Readonly<Record<string, readonly string[]>>;
const SKILL_PAGES_105: Readonly<Record<string, readonly string[]>> = {
	...SKILL_PAGES_99,
	Warlock: ["Chaos", "Eldritch", "Demon"],
};

const EXPANSION_TYPES = new Set<ExpansionType>(["Classic", "Expansion", "RotW"]);
const FEMALE_CLASSES = new Set<KnownClassName>(["Amazon", "Assassin", "Sorceress"]);
const saveIdsByVersionAndClass = new Map<string, Map<number, number>>();

function getUnknownPayload(value: unknown): number | null {
	if (typeof value !== "string") {
		return null;
	}

	const match = /^Unknown\((\d+)\)$/.exec(value);
	return match == null ? null : Number(match[1]);
}

function getClasses(version: number): readonly SupportedClass[] {
	switch (version) {
		case 99:
			return CLASSES_99;
		case 105:
			return CLASSES_105;
		default:
			return [];
	}
}

function getSkillPages(version: number): Readonly<Record<string, readonly string[]>> {
	switch (version) {
		case 99:
			return SKILL_PAGES_99;
		case 105:
			return SKILL_PAGES_105;
		default:
			return {};
	}
}

function getFallbackSkillPages(classSkills: readonly SkillData[]): string[] {
	const pages = [...new Set(classSkills.map((skill) => skill.page))].sort(
		(left, right) => left - right,
	);

	return pages.map((page) => `Skill Page ${page}`);
}

function getSkillIds(version: number, className: string): Map<number, number> | null {
	const cacheKey = `${version}:${className}`;
	const cached = saveIdsByVersionAndClass.get(cacheKey);
	if (cached != null) {
		return cached;
	}

	const skills = getSkillsDataset(version);
	if (skills == null) {
		return null;
	}

	const saveIds = new Map<number, number>();
	for (const skill of skills) {
		if (skill.class === className) {
			saveIds.set(skill.id, skill.saveId);
		}
	}

	saveIdsByVersionAndClass.set(cacheKey, saveIds);
	return saveIds;
}

export function toExpansionType(value: unknown): ExpansionType {
	if (typeof value !== "string" || !EXPANSION_TYPES.has(value as ExpansionType)) {
		throw new Error(`Invalid expansion type label: ${String(value)}.`);
	}

	return value as ExpansionType;
}

export function getSaveFormatIdLabel(save: EditorSave): SaveFormatId {
	const payload = getUnknownPayload(save.metadata.formatId);
	return payload == null ? save.metadata.formatId : `Unknown(${payload})`;
}

export function getSaveEditionLabel(save: EditorSave): string {
	switch (save.metadata.formatId) {
		case "V99":
			return "D2R Legacy";
		case "V105":
			return "RotW";
		default: {
			const payload = getUnknownPayload(save.metadata.formatId);
			return payload == null ? "unknown" : `unknown (${payload})`;
		}
	}
}

export function isUnknownSaveFormat(save: EditorSave): boolean {
	return getUnknownPayload(save.metadata.formatId) != null;
}

export function getSupportedClassesForExpansionType(
	version: number,
	expansionType: ExpansionType,
): readonly SupportedClass[] {
	const classes = getClasses(version);
	const allowedExpansions =
		expansionType === "Classic"
			? ["Classic"]
			: expansionType === "Expansion"
				? ["Classic", "Expansion"]
				: ["Classic", "Expansion", "RotW"];

	return classes.filter((classInfo) =>
		allowedExpansions.includes(classInfo.requiredExpansion),
	);
}

export function getSupportedClassNames(version: number): readonly KnownClassName[] {
	return getClasses(version).map((classInfo) => classInfo.name);
}

export function isClassSupportedForVersion(version: number, className: string): boolean {
	return getClasses(version).some((classInfo) => classInfo.name === className);
}

export function getSupportedExpansionTypes(version: number): readonly ExpansionType[] {
	switch (version) {
		case 99:
			return ["Classic", "Expansion"];
		case 105:
			return ["Classic", "Expansion", "RotW"];
		default:
			return [];
	}
}

export function getSupportedClass(version: number, className: string | null): KnownClassName | null {
	const classes = getClasses(version);
	if (classes.length < 1) {
		return null;
	}

	return classes.some((classInfo) => classInfo.name === className)
		? (className as KnownClassName)
		: classes[0].name;
}

export function getSkillsDataset(version: number): readonly SkillData[] | null {
	switch (version) {
		case 99:
			return SKILLS_99;
		case 105:
			return SKILLS_105;
		default:
			return null;
	}
}

export function isFemaleClass(className: string): boolean {
	return FEMALE_CLASSES.has(className as KnownClassName);
}

export function getSkillPageNames(
	version: number,
	className: string,
	classSkills: readonly SkillData[] = [],
): readonly string[] {
	const pages = getSkillPages(version)[className];
	if (pages != null && pages.length > 0) {
		return pages;
	}

	return getFallbackSkillPages(classSkills);
}

export function skillIdToSaveId(version: number, className: string, skillId: number): number {
	const saveIds = getSkillIds(version, className);
	if (saveIds == null) {
		return -1;
	}

	return saveIds.get(skillId) ?? -1;
}
