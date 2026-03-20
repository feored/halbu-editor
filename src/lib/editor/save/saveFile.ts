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
	const needsPicker = params.saveAs || !hasSourcePath || isCrossVersionSave;

	let filePath: string | null;
	if (!needsPicker && params.sourcePath != null) {
		filePath = params.sourcePath;
	} else {
		const suffix = isCrossVersionSave ? `_v${params.targetVersion}` : "";
		const defaultPath = params.sourcePath ?? `${params.save.character.name}${suffix}`;
		filePath =
			(await pickSavePath({
				defaultPath,
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
