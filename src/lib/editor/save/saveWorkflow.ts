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
	ValidationReport,
} from "$lib/types/backend";

type SaveCharacterParams = {
	save: EditorSave;
	sourceBackendSave: BackendEditorSave;
	parserLayoutVersion: SaveLayoutVersion | null;
	selectedTargetVersion: SaveLayoutVersion | null;
	suggestedTargetVersion: SaveLayoutVersion | null;
	sourcePath: string | null;
	input?: SaveCharacterOptions;
};

export type SaveCharacterOptions = {
	targetVersion?: SaveLayoutVersion | null;
	saveAs?: boolean;
	forceConvert?: boolean;
};

export type SaveCharacterResult = {
	filePath: string;
	forceConvertUsed: boolean;
	updatedBackendSave: BackendEditorSave;
};

type SaveAnalysisResult = {
	validationReport: ValidationReport;
	validationError: string | null;
	compatibilityIssues: CompatibilityIssue[];
	compatibilityError: string | null;
};

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

export async function validateSave(
	save: EditorSave,
	sourceLayoutVersion: SaveLayoutVersion | null,
	sourceBackendSave: BackendEditorSave,
): Promise<ValidationReport> {
	return invoke<ValidationReport>("validate_save", {
		save: toBackendSave(sourceBackendSave, save, sourceLayoutVersion),
	});
}

export async function analyzeSave(
	save: EditorSave,
	targetVersion: SaveLayoutVersion | null,
	sourceLayoutVersion: SaveLayoutVersion | null,
	sourceBackendSave: BackendEditorSave,
): Promise<SaveAnalysisResult> {
	const validationPromise = validateSave(save, sourceLayoutVersion, sourceBackendSave).then(
		(report) => ({ ok: true as const, report }),
		(error) => ({ ok: false as const, error }),
	);

	const compatibilityPromise =
		targetVersion == null
			? Promise.resolve(null)
			: checkSaveCompatibility(save, targetVersion, sourceLayoutVersion, sourceBackendSave).then(
					(issues) => ({ ok: true as const, issues }),
					(error) => ({ ok: false as const, error }),
				);

	const [validationResult, compatibilityResult] = await Promise.all([
		validationPromise,
		compatibilityPromise,
	]);

	return {
		validationReport:
			validationResult.ok === true ? validationResult.report : { issues: [] },
		validationError:
			validationResult.ok === true ? null : getErrorMessage(validationResult.error, "Validation check failed."),
		compatibilityIssues:
			compatibilityResult?.ok === true ? compatibilityResult.issues : [],
		compatibilityError:
			compatibilityResult == null || compatibilityResult.ok === true
				? null
				: getErrorMessage(compatibilityResult.error, "Compatibility check failed."),
	};
}

export async function saveCharacterFile(params: SaveCharacterParams): Promise<SaveCharacterResult | null> {
	const input = params.input ?? {};
	const saveAs = input.saveAs === true || input.forceConvert === true;
	const forceConvert = input.forceConvert === true;
	const isUnknownFormat = params.save.metadata.formatId.startsWith("Unknown(");
	const sourceLayoutVersion = isUnknownFormat ? params.parserLayoutVersion : null;

	const targetVersion =
		[input.targetVersion, params.selectedTargetVersion, params.save.version].find(
			(v) => v === 99 || v === 105,
		) ?? null;

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

	if (targetVersion == null) {
		await message(
			"No compatible output format was selected for this save. Choose v99 or v105.",
			{ title: "Save blocked", kind: "warning" },
		);
		return null;
	}

	const analysis = await analyzeSave(
		params.save,
		targetVersion,
		sourceLayoutVersion,
		params.sourceBackendSave,
	);

	if (analysis.validationError != null) {
		await message(analysis.validationError, { title: "Save blocked", kind: "error" });
		throw new Error(analysis.validationError);
	}

	const blockingValidationIssues = analysis.validationReport.issues.filter((issue) => issue.blocking);
	if (blockingValidationIssues.length > 0) {
		const details = blockingValidationIssues.map((issue) => `- ${issue.message}`).join("\n");
		await message(
			`Cannot save because of blocking validation issues:\n${details}`,
			{ title: "Save blocked", kind: "warning" },
		);
		return null;
	}

	if (analysis.compatibilityError != null) {
		await message(analysis.compatibilityError, { title: "Save blocked", kind: "error" });
		throw new Error(analysis.compatibilityError);
	}

	const blockingIssues = analysis.compatibilityIssues.filter((issue) => issue.blocking);

	if (blockingIssues.length > 0 && !forceConvert) {
		const details = blockingIssues.map((issue) => `- ${issue.message}`).join("\n");
		await message(
			`Cannot save to v${targetVersion} because of blocking compatibility issues:\n${details}`,
			{ title: "Save blocked", kind: "warning" },
		);
		return null;
	}

	if (forceConvert && blockingIssues.length === 0) {
		await message("Blocking issues are no longer present. Use normal Save As.", {
			title: "Force save not needed",
			kind: "info",
		});
		return null;
	}

	// resolve file path 

	const isCrossVersionSave = targetVersion !== params.save.version;
	const hasSourcePath = params.sourcePath != null && params.sourcePath.length > 0;
	const needsPicker = saveAs || !hasSourcePath || isCrossVersionSave;

	let filePath: string | null;
	if (!needsPicker && params.sourcePath != null) {
		filePath = params.sourcePath;
	} else {
		const suffix = isCrossVersionSave ? `_v${targetVersion}` : "";
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

	// save

	const backendSave = toBackendSave(params.sourceBackendSave, params.save, sourceLayoutVersion);
	backendSave.version = targetVersion;
	backendSave.meta.format = targetVersion === 99 ? "V99" : "V105";

	try {
		const result = await invoke<SaveCommandResult>("save_file_as_version", {
			path: filePath,
			save: backendSave,
			targetVersion,
			ignoreCompatibilityChecks: forceConvert,
			backupSourcePath: saveAs ? filePath : (params.sourcePath ?? filePath),
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
			forceConvertUsed: forceConvert,
			updatedBackendSave: backendSave,
		};
	} catch (error) {
		const detail = getErrorMessage(error, "Unknown error");
		await message(detail, { title: "Save failed", kind: "error" });
		throw error;
	}
}
