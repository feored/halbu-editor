import { toBackendSkills } from "../skills/skillAdapters";
import { DEFAULT_SKILL_SLOT_COUNT } from "../skills/skillSlots";
import { getSaveTargetVersion } from "../../utils/GameSupport";
import type {
	BackendSkillPoints,
	CompatibilityIssue,
	EditorSave,
	EncodableSaveFormatId,
	KnownClassName,
} from "../../types/editor";

export type SaveCommandPayload = Omit<EditorSave, "skills" | "character" | "meta"> & {
	skills: BackendSkillPoints;
	character: Omit<EditorSave["character"], "class"> & {
		class: KnownClassName | { Unknown: number };
	};
	meta: Omit<EditorSave["meta"], "format"> & {
		format: EncodableSaveFormatId | { Unknown: number };
	};
};

function formatIdForVersion(version: number): "V99" | "V105" {
	if (version === 99) {
		return "V99";
	}
	if (version === 105) {
		return "V105";
	}
	throw new Error(`Unsupported target save version: ${version}.`);
}

function parseUnknownEnumLabel(value: string): number | null {
	const match = /^Unknown\((\d+)\)$/.exec(value);
	return match == null ? null : Number(match[1]);
}

function toBackendEnumLabel<KnownLabel extends string>(
	value: string,
): KnownLabel | { Unknown: number } {
	const unknownPayload = parseUnknownEnumLabel(value);
	if (unknownPayload != null) {
		return { Unknown: unknownPayload };
	}
	return value as KnownLabel;
}

export function buildSaveCommandPayload(
	saveData: EditorSave,
	sourceLayoutVersion: number | null = null,
	skillSlotCount = DEFAULT_SKILL_SLOT_COUNT,
): SaveCommandPayload {
	const sourceFormatLabel =
		sourceLayoutVersion != null &&
		parseUnknownEnumLabel(saveData.meta.format) != null
			? formatIdForVersion(sourceLayoutVersion)
			: saveData.meta.format;

	return {
		...saveData,
		character: {
			...saveData.character,
			class: toBackendEnumLabel<KnownClassName>(saveData.character.class),
		},
		meta: {
			...saveData.meta,
			format: toBackendEnumLabel<EncodableSaveFormatId>(sourceFormatLabel),
		},
		skills: toBackendSkills(saveData.skills, skillSlotCount),
	};
}

export function resolveTargetVersion(
	saveData: EditorSave,
	selectedCompatibilityTargetVersion: number | null,
	explicitTargetVersion: number | null | undefined = null,
): number | null {
	if (explicitTargetVersion != null) {
		return explicitTargetVersion;
	}
	if (selectedCompatibilityTargetVersion != null) {
		return selectedCompatibilityTargetVersion;
	}
	return getSaveTargetVersion(saveData);
}

export function applyTargetVersionToSave(saveData: EditorSave, targetVersion: number): void {
	saveData.version = targetVersion;
	saveData.meta.format = formatIdForVersion(targetVersion);
}

export function getBlockingCompatibilityIssues(
	issues: readonly CompatibilityIssue[],
): CompatibilityIssue[] {
	return issues.filter((issue) => issue.blocking);
}

export function buildBlockingCompatibilityMessage(
	targetVersion: number,
	blockingIssues: readonly CompatibilityIssue[],
): string {
	const details = blockingIssues.map((issue) => `- ${issue.message}`).join("\n");
	return `Cannot save to v${targetVersion} because of blocking compatibility issues:\n${details}`;
}

export function buildSavePathContext(
	saveData: EditorSave,
	currentSourcePath: string | null,
	targetVersion: number,
) {
	const isCrossVersionSave = targetVersion !== saveData.version;
	const defaultNameSuffix = isCrossVersionSave ? `_v${targetVersion}` : "";
	const defaultPath = currentSourcePath ?? `${saveData.character.name}${defaultNameSuffix}`;
	const hasSourcePath = currentSourcePath != null && currentSourcePath.length > 0;
	const forcePicker = !hasSourcePath || isCrossVersionSave;
	return {
		defaultPath,
		forcePicker,
		isCrossVersionSave,
	};
}

export function resolveBackupSourcePath(
	selectedFilePath: string,
	currentSourcePath: string | null,
	saveAs: boolean,
): string {
	if (saveAs) {
		return selectedFilePath;
	}
	return currentSourcePath ?? selectedFilePath;
}
