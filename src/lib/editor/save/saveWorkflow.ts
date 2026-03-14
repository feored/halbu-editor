import { editorSkillsToBackendSkills } from "../skills/skillAdapters";
import { DEFAULT_SKILL_SLOT_COUNT } from "../skills/skillSlots";
import { getSaveTargetVersion } from "../../utils/GameSupport";
import type { BackendSkillPoints, CompatibilityIssue, EditorSave } from "../../types/editor";

export type SaveCommandPayload = Omit<EditorSave, "skills"> & {
	skills: BackendSkillPoints;
};

export function buildSaveCommandPayload(
	saveData: EditorSave,
	skillSlotCount = DEFAULT_SKILL_SLOT_COUNT,
): SaveCommandPayload {
	return {
		...saveData,
		skills: editorSkillsToBackendSkills(saveData.skills, skillSlotCount),
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
