import skillPagesByClass from "$lib/editor/skills/skillsPages.json";
import skillsDataV99 from "../../../static/data/generated/skills/v99/skills_complete.json";
import skillsDataV105 from "../../../static/data/generated/skills/v105/skills_complete.json";
import type {
	EditorSave,
	ExpansionType,
	KnownClassName,
	SaveFormatId,
	SaveLayoutVersion,
} from "$lib/types/editor";
import type { SkillData } from "$lib/editor/skills/skillsTypes";

type VersionCapabilities = {
	classes: readonly { name: KnownClassName; requiredExpansion: ExpansionType }[];
	skillsData: readonly SkillData[];
	skillPages: Readonly<Record<string, readonly string[]>>;
	expansionTypes: readonly ExpansionType[];
};

const v99Classes = [
	{ name: "Amazon", requiredExpansion: "Classic" },
	{ name: "Assassin", requiredExpansion: "Expansion" },
	{ name: "Barbarian", requiredExpansion: "Classic" },
	{ name: "Druid", requiredExpansion: "Expansion" },
	{ name: "Necromancer", requiredExpansion: "Classic" },
	{ name: "Paladin", requiredExpansion: "Classic" },
	{ name: "Sorceress", requiredExpansion: "Classic" },
] satisfies ReadonlyArray<{ name: KnownClassName; requiredExpansion: ExpansionType }>;

const v105Classes = [
	...v99Classes,
	{ name: "Warlock", requiredExpansion: "RotW" },
] satisfies ReadonlyArray<{ name: KnownClassName; requiredExpansion: ExpansionType }>;

const femaleClasses = new Set<KnownClassName>(["Amazon", "Assassin", "Sorceress"]);
const expansionTypes = new Set<ExpansionType>(["Classic", "Expansion", "RotW"]);
const skillIndexByVersionAndClass = new Map<string, Map<number, number>>();

const versionCapabilities: Record<SaveLayoutVersion, VersionCapabilities> = {
	99: {
		classes: v99Classes,
		skillsData: skillsDataV99 as readonly SkillData[],
		skillPages: skillPagesByClass as Readonly<Record<string, readonly string[]>>,
		expansionTypes: ["Classic", "Expansion"],
	},
	105: {
		classes: v105Classes,
		skillsData: skillsDataV105 as readonly SkillData[],
		skillPages: {
			...(skillPagesByClass as Readonly<Record<string, readonly string[]>>),
			Warlock: ["Chaos", "Eldritch", "Demon"],
		},
		expansionTypes: ["Classic", "Expansion", "RotW"],
	},
};

function getCapabilities(version: number): VersionCapabilities | null {
	if (version !== 99 && version !== 105) {
		return null;
	}
	return versionCapabilities[version];
}

function getUnknownVariantPayload(value: unknown): number | null {
	if (typeof value !== "string") {
		return null;
	}
	const match = /^Unknown\((\d+)\)$/.exec(value);
	return match == null ? null : Number(match[1]);
}

function getFallbackSkillPageNames(classSkills: readonly SkillData[]): string[] {
	const pages = Array.from(new Set(classSkills.map((skill) => skill.page))).sort(
		(left, right) => left - right,
	);
	return pages.map((page) => `Skill Page ${page}`);
}

function buildSkillIndex(version: number, className: string): Map<number, number> | null {
	const cacheKey = `${version}:${className}`;
	const cachedIndex = skillIndexByVersionAndClass.get(cacheKey);
	if (cachedIndex != null) {
		return cachedIndex;
	}

	const skillsData = getSkillsDataset(version);
	if (skillsData == null) {
		return null;
	}

	const indexBySkillId = new Map<number, number>();
	for (const skill of skillsData) {
		if (skill.class === className) {
			indexBySkillId.set(skill.id, skill.saveId);
		}
	}
	skillIndexByVersionAndClass.set(cacheKey, indexBySkillId);
	return indexBySkillId;
}

export function toExpansionType(value: unknown): ExpansionType {
	if (typeof value !== "string" || !expansionTypes.has(value as ExpansionType)) {
		throw new Error(`Invalid expansion type label: ${String(value)}.`);
	}
	return value as ExpansionType;
}

export function getSaveFormatIdLabel(save: EditorSave): SaveFormatId {
	const unknownPayload = getUnknownVariantPayload(save.metadata.formatId);
	if (unknownPayload != null) {
		return `Unknown(${unknownPayload})`;
	}
	return save.metadata.formatId;
}

export function getSaveEditionLabel(save: EditorSave): string {
	if (save.metadata.formatId === "V99") {
		return "D2R Legacy";
	}
	if (save.metadata.formatId === "V105") {
		return "RotW";
	}
	const unknownPayload = getUnknownVariantPayload(save.metadata.formatId);
	if (unknownPayload != null) {
		return `unknown (${unknownPayload})`;
	}
	return "unknown";
}

export function isUnknownSaveFormat(save: EditorSave): boolean {
	return getUnknownVariantPayload(save.metadata.formatId) != null;
}

export function getSupportedClasses(
	version: number,
): readonly { name: KnownClassName; requiredExpansion: ExpansionType }[] {
	const capabilities = getCapabilities(version);
	return capabilities == null ? [] : capabilities.classes;
}

export function getSupportedClassesForExpansionType(
	version: number,
	expansionType: ExpansionType,
): readonly { name: KnownClassName; requiredExpansion: ExpansionType }[] {
	const capabilities = getCapabilities(version);
	if (capabilities == null) {
		return [];
	}

	let validExpansionTypes: readonly ExpansionType[] = ["Classic"];
	if (expansionType === "Expansion") {
		validExpansionTypes = ["Classic", "Expansion"];
	}
	if (expansionType === "RotW") {
		validExpansionTypes = ["Classic", "Expansion", "RotW"];
	}

	return capabilities.classes.filter((classInfo) =>
		validExpansionTypes.includes(classInfo.requiredExpansion),
	);
}

export function getSupportedClassNames(version: number): readonly KnownClassName[] {
	return getSupportedClasses(version).map((classInfo) => classInfo.name);
}

export function isClassSupportedForVersion(version: number, className: string): boolean {
	return getSupportedClassNames(version).includes(className as KnownClassName);
}

export function getSupportedExpansionTypes(version: number): readonly ExpansionType[] {
	const capabilities = getCapabilities(version);
	return capabilities == null ? [] : capabilities.expansionTypes;
}

export function getSupportedClass(version: number, className: string | null): KnownClassName | null {
	const supportedClassNames = getSupportedClassNames(version);
	if (supportedClassNames.length === 0) {
		return null;
	}
	return supportedClassNames.includes(className as KnownClassName)
		? (className as KnownClassName)
		: supportedClassNames[0];
}

export function getSkillsDataset(version: number): readonly SkillData[] | null {
	const capabilities = getCapabilities(version);
	return capabilities == null ? null : capabilities.skillsData;
}

export function isFemaleClass(className: string): boolean {
	return femaleClasses.has(className as KnownClassName);
}

export function getSkillPageNames(
	version: number,
	className: string,
	classSkills: readonly SkillData[] = [],
): readonly string[] {
	const capabilities = getCapabilities(version);
	if (capabilities == null) {
		return getFallbackSkillPageNames(classSkills);
	}
	const mappedPages = capabilities.skillPages[className];
	if (mappedPages != null && mappedPages.length > 0) {
		return mappedPages;
	}
	return getFallbackSkillPageNames(classSkills);
}

export function skillIdToSaveId(version: number, className: string, skillId: number): number {
	const indexBySkillId = buildSkillIndex(version, className);
	if (indexBySkillId == null) {
		return -1;
	}
	return indexBySkillId.get(skillId) ?? -1;
}
