import { invoke } from "@tauri-apps/api/core";
import { message, save as pickSavePath } from "@tauri-apps/plugin-dialog";
import { getErrorMessage } from "$lib/utils/errorMessage";
import { get as getSetting, Key as SettingKey } from "$lib/utils/settings";
import { toBackendSave } from "$lib/types/converters";

import type { EditorSave, SaveLayoutVersion } from "$lib/types/editor";
import type {
	BackendEditorSave,
	CompatibilityIssue,
	SaveCommandResult,
} from "$lib/types/backend";

export type SaveCharacterOptions = {
	targetVersion?: SaveLayoutVersion | null;
	saveAs?: boolean;
	forceConvert?: boolean;
};

export type SaveCharacterResult = {
	filePath: string;
	forceConvertUsed: boolean;
	refreshedCompatibilityIssues: CompatibilityIssue[] | null;
	updatedBackendSave: BackendEditorSave;
};

export function applyTargetVersion(save: EditorSave, targetVersion: SaveLayoutVersion): void {
	save.version = targetVersion;
	save.metadata.formatId = targetVersion === 99 ? "V99" : "V105";
}

export function getBlockingCompatibilityIssues(
	issues: readonly CompatibilityIssue[],
): CompatibilityIssue[] {
	return issues.filter((issue) => issue.blocking);
}

export function buildBlockingCompatibilityMessage(
	targetVersion: SaveLayoutVersion,
	blockingIssues: readonly CompatibilityIssue[],
): string {
	const details = blockingIssues.map((issue) => `- ${issue.message}`).join("\n");
	return `Cannot save to v${targetVersion} because of blocking compatibility issues:\n${details}`;
}

function buildSavePath(
	save: EditorSave,
	sourcePath: string | null,
	targetVersion: SaveLayoutVersion,
): { defaultPath: string; forcePicker: boolean } {
	const isCrossVersionSave = targetVersion !== save.version;
	const suffix = isCrossVersionSave ? `_v${targetVersion}` : "";
	const defaultPath = sourcePath ?? `${save.character.name}${suffix}`;
	const hasSourcePath = sourcePath != null && sourcePath.length > 0;
	return {
		defaultPath,
		forcePicker: !hasSourcePath || isCrossVersionSave,
	};
}

export async function checkSaveCompatibility(
	save: EditorSave,
	targetVersion: SaveLayoutVersion,
	sourceLayoutVersion: SaveLayoutVersion | null,
	sourceBackendSave: BackendEditorSave,
): Promise<CompatibilityIssue[]> {
	return invoke<CompatibilityIssue[]>("check_save_compatibility", {
		save: toBackendSave(sourceBackendSave, save, sourceLayoutVersion),
		targetVersion,
	});
}

export async function saveCharacterFile(params: {
	save: EditorSave;
	sourceBackendSave: BackendEditorSave;
	parserLayoutVersion: SaveLayoutVersion | null;
	selectedTargetVersion: SaveLayoutVersion | null;
	suggestedTargetVersion: SaveLayoutVersion | null;
	currentTargetVersion: SaveLayoutVersion | null;
	canForceConvert: boolean;
	compatibilityPending: boolean;
	compatibilityError: string | null;
	sourcePath: string | null;
	input?: SaveCharacterOptions;
}): Promise<SaveCharacterResult | null> {
	const input = params.input ?? {};
	const explicitTargetVersion = input.targetVersion ?? null;
	const saveAs = input.saveAs === true || input.forceConvert === true;
	const forceConvert = input.forceConvert === true;
	const isUnknownFormat = params.save.metadata.formatId.startsWith("Unknown(");
	const sourceLayoutVersion = isUnknownFormat ? params.parserLayoutVersion : null;
	const targetVersion =
		explicitTargetVersion === 99 || explicitTargetVersion === 105
			? explicitTargetVersion
			: params.selectedTargetVersion === 99 || params.selectedTargetVersion === 105
				? params.selectedTargetVersion
				: params.save.version === 99 || params.save.version === 105
					? params.save.version
					: null;

	if (isUnknownFormat && targetVersion == null) {
		const suggestion =
			params.suggestedTargetVersion == null
				? "Select an output format (v99 or v105) in Conversion before saving."
				: `Suggested target is v${params.suggestedTargetVersion}. Confirm or change it in Conversion before saving.`;
		await message(`This save uses an unknown source format. ${suggestion}`, {
			title: "Save blocked",
			kind: "warning",
		});
		return null;
	}

	if (forceConvert) {
		if (!params.canForceConvert) {
			await message(
				"Force conversion is only available when compatibility results are current and include blocking issues.",
				{ title: "Force save blocked", kind: "warning" },
			);
			return null;
		}

		if (params.compatibilityPending || (params.compatibilityError ?? "").length > 0) {
			await message(
				"Force conversion is unavailable while compatibility checks are pending or failed.",
				{ title: "Force save blocked", kind: "warning" },
			);
			return null;
		}
	}

	if (targetVersion == null) {
		await message(
			"No compatible output format was selected for this save. Choose v99 or v105.",
			{ title: "Save blocked", kind: "warning" },
		);
		return null;
	}

	let compatibilityIssues: CompatibilityIssue[] = [];
	try {
		compatibilityIssues = await checkSaveCompatibility(
			params.save,
			targetVersion,
			sourceLayoutVersion,
			params.sourceBackendSave,
		);
	} catch (error) {
		const detail = getErrorMessage(error, "Compatibility check failed.");
		await message(detail, { title: "Save blocked", kind: "error" });
		throw error;
	}

	const blockingIssues = getBlockingCompatibilityIssues(compatibilityIssues);
	if (blockingIssues.length > 0 && !forceConvert) {
		await message(buildBlockingCompatibilityMessage(targetVersion, blockingIssues), {
			title: "Save blocked",
			kind: "warning",
		});
		return null;
	}

	if (forceConvert && blockingIssues.length < 1) {
		await message("Blocking issues are no longer present. Use normal Save As.", {
			title: "Force save not needed",
			kind: "info",
		});
		return null;
	}

	const savePath = buildSavePath(params.save, params.sourcePath, targetVersion);
	const forcePicker = saveAs || savePath.forcePicker;
	const filePath =
		!forcePicker && params.sourcePath != null && params.sourcePath.length > 0
			? params.sourcePath
			: ((await pickSavePath({
				defaultPath: savePath.defaultPath,
				filters: [{ name: "D2R Save File", extensions: ["d2s"] }],
			})) ?? null);
	if (filePath == null) {
		return null;
	}

	const backupSourcePath = saveAs ? filePath : (params.sourcePath ?? filePath);
	const backendSave = toBackendSave(params.sourceBackendSave, params.save, sourceLayoutVersion);
	backendSave.version = targetVersion;
	backendSave.meta.format = targetVersion === 99 ? "V99" : "V105";

	const backupsEnabled = getSetting(SettingKey.BackupsEnabled);
	const backupsPerCharacter = getSetting(SettingKey.BackupsPerCharacter);

	try {
		const result = await invoke<SaveCommandResult>("save_file_as_version", {
			path: filePath,
			save: backendSave,
			targetVersion,
			ignoreCompatibilityChecks: forceConvert,
			backupSourcePath,
			backupConfig: {
				enabled: backupsEnabled,
				backupsPerCharacter,
			},
		});

		applyTargetVersion(params.save, targetVersion);
		if ((result.cleanupWarning ?? "").length > 0) {
			console.warn(`[backup cleanup warning] ${result.cleanupWarning}`);
		}

		return {
			filePath,
			forceConvertUsed: forceConvert,
			refreshedCompatibilityIssues:
				targetVersion === params.currentTargetVersion ? compatibilityIssues : null,
			updatedBackendSave: structuredClone(backendSave),
		};
	} catch (error) {
		const detail = getErrorMessage(error, "Unknown error");
		await message(detail, { title: "Save failed", kind: "error" });
		throw error;
	}
}
