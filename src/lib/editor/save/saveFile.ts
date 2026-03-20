import { invoke } from "@tauri-apps/api/core";
import { message, save as pickSavePath } from "@tauri-apps/plugin-dialog";
import { getErrorMessage } from "$lib/utils/errorMessage";
import { get as getSetting, Key as SettingKey } from "$lib/utils/settings";
import { toBackendSave } from "$lib/types/saveConverter";

import type { EditorSave, SaveLayoutVersion } from "$lib/types/editor";
import type { BackendEditorSave, SaveCommandResult } from "$lib/types/backend";

type SaveCharacterWriteParams = {
	save: EditorSave;
	sourceBackendSave: BackendEditorSave;
	sourceLayoutVersion: SaveLayoutVersion | null;
	targetVersion: SaveLayoutVersion;
	sourcePath: string | null;
	pendingFolder: string | null;
	saveAs: boolean;
	forceSave: boolean;
};

export type SaveCharacterResult = {
	filePath: string;
	forceSaveUsed: boolean;
	updatedBackendSave: BackendEditorSave;
};

export type SaveCharacterOptions = {
	targetVersion?: SaveLayoutVersion | null;
	saveAs?: boolean;
	forceSave?: boolean;
};

export async function saveCharacterFile(
	params: SaveCharacterWriteParams,
): Promise<SaveCharacterResult | null> {
	const isCrossVersionSave = params.targetVersion !== params.save.version;
	const hasSourcePath = params.sourcePath != null && params.sourcePath.length > 0;
	const hasPendingFolder = params.pendingFolder != null && params.pendingFolder.length > 0;

	const saveFolder = getSetting(SettingKey.SaveFolder).trim();
	const fileName = params.save.character.name.toLowerCase().endsWith(".d2s")
		? params.save.character.name
		: `${params.save.character.name}.d2s`;
	const pendingPath =
		params.pendingFolder == null || params.pendingFolder.length < 1
			? null
			: `${params.pendingFolder}${params.pendingFolder.endsWith("\\") || params.pendingFolder.endsWith("/") ? "" : "\\"}${fileName}`;
	const suggestedPath =
		saveFolder.length < 1
			? fileName
			: `${saveFolder}${saveFolder.endsWith("\\") || saveFolder.endsWith("/") ? "" : "\\"}${fileName}`;
	const defaultPath = params.sourcePath ?? pendingPath ?? suggestedPath;
	const needsPicker =
		params.saveAs || isCrossVersionSave || (!hasSourcePath && !hasPendingFolder && saveFolder.length < 1);

	let filePath: string | null;
	if (!needsPicker && params.sourcePath != null) {
		filePath = params.sourcePath;
	} else if (!needsPicker && pendingPath != null) {
		filePath = pendingPath;
	} else if (!needsPicker) {
		filePath = suggestedPath;
	} else {
		const suffix =
			isCrossVersionSave && !params.forceSave ? `_v${params.targetVersion}` : "";
		filePath =
			(await pickSavePath({
				defaultPath: suffix.length > 0 ? defaultPath.replace(/\.d2s$/i, `${suffix}.d2s`) : defaultPath,
				filters: [{ name: "D2R Save File", extensions: ["d2s"] }],
			})) ?? null;
	}

	if (filePath == null) {
		return null;
	}

	const backendSave = toBackendSave(
		params.sourceBackendSave,
		params.save,
		params.sourceLayoutVersion,
	);
	backendSave.version = params.targetVersion;
	backendSave.meta.format = params.targetVersion === 99 ? "V99" : "V105";

	try {
		const result = await invoke<SaveCommandResult>("save_file_as_version", {
			path: filePath,
			save: backendSave,
			targetVersion: params.targetVersion,
			ignoreCompatibilityChecks: params.forceSave,
			backupSourcePath: params.saveAs ? filePath : (params.sourcePath ?? filePath),
			backupConfig: {
				enabled: getSetting(SettingKey.BackupsEnabled),
				backupsPerCharacter: getSetting(SettingKey.BackupsPerCharacter),
			},
		});

		if ((result.cleanupWarning ?? "").length > 0) {
			console.warn(`[backup cleanup warning] ${result.cleanupWarning}`);
		}

		return {
			filePath,
			forceSaveUsed: params.forceSave,
			updatedBackendSave: backendSave,
		};
	} catch (error) {
		const detail = getErrorMessage(error, "Unknown error");
		await message(detail, { title: "Save failed", kind: "error" });
		throw error;
	}
}
