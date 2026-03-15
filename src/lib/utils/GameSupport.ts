import skillpages from "../editor/skills/skillpages.json";
import skillsDataV99 from "../../../static/data/generated/skills/v99/skills_complete.json";
import skillsDataV105 from "../../../static/data/generated/skills/v105/skills_complete.json";
import type {
	EditorSave,
	ExpansionTypeLabel,
	KnownClassName,
	SaveFormatId,
} from "../types/editor";
import type { SkillData } from "../editor/skills/skillTypes";

export type KnownSaveVersion = 99 | 105;

type SkillPagesByClass = Readonly<Record<string, readonly string[]>>;

type VersionCapabilities = {
	label: `v${KnownSaveVersion}`;
	classes: readonly KnownClassName[];
	classesRequiringExpansion: readonly KnownClassName[];
	skillsData: readonly SkillData[];
	skillPages: SkillPagesByClass;
};

const BASE_CLASSES = [
	"Amazon",
	"Assassin",
	"Barbarian",
	"Druid",
	"Necromancer",
	"Paladin",
	"Sorceress",
] as const satisfies readonly KnownClassName[];

const FEMALE_CLASSES = new Set<KnownClassName>(["Amazon", "Assassin", "Sorceress"]);

const DEFAULT_SKILL_PAGES = skillpages as SkillPagesByClass;
const SKILLS_DATA_V99 = skillsDataV99 as readonly SkillData[];
const SKILLS_DATA_V105 = skillsDataV105 as readonly SkillData[];

const VERSION_CAPABILITIES: Record<KnownSaveVersion, VersionCapabilities> = {
	99: {
		label: "v99",
		classes: BASE_CLASSES,
		classesRequiringExpansion: ["Druid", "Assassin"],
		skillsData: SKILLS_DATA_V99,
		skillPages: DEFAULT_SKILL_PAGES,
	},
	105: {
		label: "v105",
		classes: [...BASE_CLASSES, "Warlock"],
		classesRequiringExpansion: ["Druid", "Assassin", "Warlock"],
		skillsData: SKILLS_DATA_V105,
		skillPages: {
			...DEFAULT_SKILL_PAGES,
			Warlock: ["Chaos", "Eldritch", "Demon"],
		},
	},
};

const SKILL_INDEX_CACHE = new Map<string, Map<number, number>>();
const SAVE_EXPANSION_TYPES = new Set<ExpansionTypeLabel>(["Classic", "Expansion", "RotW"]);

export const KNOWN_SAVE_VERSIONS: readonly KnownSaveVersion[] = [99, 105];

export const DEFAULT_NEW_SAVE_VERSION: KnownSaveVersion =
	KNOWN_SAVE_VERSIONS[KNOWN_SAVE_VERSIONS.length - 1];

function toVersionNumber(version: number): number {
	if (!Number.isInteger(version)) {
		throw new Error(`Invalid save version: ${version}.`);
	}
	return version;
}

function isKnownSaveVersionNumber(version: number): version is KnownSaveVersion {
	return version === 99 || version === 105;
}

function getCapabilities(version: number): VersionCapabilities | null {
	const versionNumber = toVersionNumber(version);
	if (!isKnownSaveVersionNumber(versionNumber)) {
		return null;
	}
	return VERSION_CAPABILITIES[versionNumber];
}

function getUnknownVariantPayload(value: unknown): number | null {
	if (typeof value !== "string") {
		return null;
	}
	const match = /^Unknown\((\d+)\)$/.exec(value);
	return match == null ? null : Number(match[1]);
}

export function toExpansionType(value: unknown): ExpansionTypeLabel {
	if (typeof value !== "string" || !SAVE_EXPANSION_TYPES.has(value as ExpansionTypeLabel)) {
		throw new Error(`Invalid expansion type label: ${String(value)}.`);
	}
	return value as ExpansionTypeLabel;
}

export function getSaveExpansionType(save: EditorSave): ExpansionTypeLabel {
	return save.expansion_type;
}

export function isExpandedMode(expansionType: ExpansionTypeLabel): boolean {
	return expansionType !== "Classic";
}

export function getSaveFormatIdLabel(save: EditorSave): SaveFormatId {
	const format = save.meta.format;
	const unknownPayload = getUnknownVariantPayload(format);
	if (unknownPayload != null) {
		return `Unknown(${unknownPayload})`;
	}
	return format;
}

export function getSaveTargetVersion(save: EditorSave): KnownSaveVersion | null {
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

export function getSaveEditionLabel(save: EditorSave): string {
	const format = save.meta.format;
	if (format === "V99") {
		return "D2R Legacy";
	}
	if (format === "V105") {
		return "D2R RotW";
	}
	const unknownPayload = getUnknownVariantPayload(format);
	if (unknownPayload != null) {
		return `unknown (${unknownPayload})`;
	}
	return "unknown";
}

export function isKnownSaveVersion(version: number): version is KnownSaveVersion {
	return getCapabilities(version) != null;
}

export function getSupportedClasses(version: number): readonly KnownClassName[] {
	const capabilities = getCapabilities(version);
	return capabilities == null ? [] : capabilities.classes;
}

export function isClassSupportedForVersion(version: number, className: string): boolean {
	return getSupportedClasses(version).includes(className as KnownClassName);
}

export function getSupportedClass(
	version: number,
	className: string | null,
): KnownClassName | null {
	const classes = getSupportedClasses(version);
	if (classes.length === 0) {
		return null;
	}
	return classes.includes(className as KnownClassName) ? (className as KnownClassName) : classes[0];
}

export function getSkillsDataset(version: number): readonly SkillData[] | null {
	const capabilities = getCapabilities(version);
	return capabilities == null ? null : capabilities.skillsData;
}

export function isFemaleClass(className: string): boolean {
	return FEMALE_CLASSES.has(className as KnownClassName);
}

export function requiresExpansion(version: number, className: string): boolean {
	const capabilities = getCapabilities(version);
	if (capabilities == null) {
		return false;
	}
	return capabilities.classesRequiringExpansion.includes(className as KnownClassName);
}

function getFallbackSkillPageNames(classSkills: readonly SkillData[]): string[] {
	const pages = Array.from(new Set(classSkills.map((skill) => skill.page))).sort(
		(left, right) => left - right,
	);

	if (pages.length === 0) {
		return [];
	}
	return pages.map((page) => `Skill Page ${page}`);
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

function buildSkillIndex(version: number, className: string): Map<number, number> | null {
	const cacheKey = `${version}:${className}`;
	const cached = SKILL_INDEX_CACHE.get(cacheKey);
	if (cached != null) {
		return cached;
	}

	const skillsData = getSkillsDataset(version);
	if (skillsData == null) {
		return null;
	}

	const indexBySkillId = new Map<number, number>();
	for (const skill of skillsData) {
		if (skill.class !== className) {
			continue;
		}
		indexBySkillId.set(skill.id, skill.saveId);
	}
	SKILL_INDEX_CACHE.set(cacheKey, indexBySkillId);
	return indexBySkillId;
}

export function skillIdToSaveId(version: number, className: string, skillId: number): number {
	const indexBySkillId = buildSkillIndex(version, className);
	if (indexBySkillId == null) {
		return -1;
	}
	return indexBySkillId.get(skillId) ?? -1;
}
