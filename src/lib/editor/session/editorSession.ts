import { invoke } from "@tauri-apps/api/core";
import { message, save } from "@tauri-apps/plugin-dialog";
import {
	applyProjectedGameRulesValues,
	projectGameRulesDerivedValues,
} from "../character/gameRulesProjection";
import {
	applyTargetVersionToSave,
	buildBlockingCompatibilityMessage,
	buildSaveCommandPayload,
	buildSavePathContext,
	getBlockingCompatibilityIssues,
	resolveTargetVersion,
} from "../save/saveWorkflow";
import { buildChangeReview } from "../status/reviewChanges";
import { getSaveTargetVersion, isUnknownSaveFormat } from "../../utils/GameSupport";
import { getErrorMessage } from "../../utils/errorMessage";
import { get as getSetting, Key as SettingKey } from "../../utils/settings";
import type {
	CompatibilityIssue,
	EditValidation,
	EditorDocumentMode,
	EditorOpenPayload,
	EditorSave,
	GameEdition,
	OutputFormatOption,
	ParseIssue,
	SaveCommandResult,
} from "../../types/editor";

export const DEFAULT_EDITOR_DOCUMENT_MODE: EditorDocumentMode = "raw";

export type SaveCharacterOptions = {
	targetVersion?: number | null;
	saveAs?: boolean;
	forceConvert?: boolean;
};

type ParserLayoutVersion = 99 | 105;

export type OpenedEditorSessionDocument = {
	currentSave: EditorSave;
	currentParseIssueCount: number;
	currentParseIssues: ParseIssue[];
	currentHeaderChecksum: number | null;
	currentComputedChecksum: number | null;
	currentSourceFileSize: number | null;
	currentSourcePath: string | null;
	currentEditionHint: GameEdition | null;
	currentSuggestedTargetVersion: ParserLayoutVersion | null;
	currentParserLayoutVersion: ParserLayoutVersion | null;
	selectedCompatibilityTargetVersion: number | null;
	suggestedTargetAutoSelected: boolean;
	currentSaveBaseline: EditorSave;
	currentCompatibilityIssues: CompatibilityIssue[];
	compatibilityCheckError: string;
	compatibilityCheckPending: boolean;
	compatibilityCheckRunCounter: number;
	activeCompatibilityCheckGeneration: number;
	latestCompatibilityResultGeneration: number;
	lastSaveUsedForceConversion: boolean;
	editValidation: EditValidation;
	editorDocumentMode: EditorDocumentMode;
};

export type ClosedEditorSessionDocument = {
	currentSave: EditorSave | null;
	currentParseIssueCount: number;
	currentParseIssues: ParseIssue[];
	currentHeaderChecksum: number | null;
	currentComputedChecksum: number | null;
	currentSourceFileSize: number | null;
	currentSourcePath: string | null;
	currentEditionHint: GameEdition | null;
	currentSuggestedTargetVersion: ParserLayoutVersion | null;
	currentParserLayoutVersion: ParserLayoutVersion | null;
	selectedCompatibilityTargetVersion: number | null;
	suggestedTargetAutoSelected: boolean;
	currentSaveBaseline: EditorSave | null;
	currentCompatibilityIssues: CompatibilityIssue[];
	compatibilityCheckError: string;
	compatibilityCheckPending: boolean;
	compatibilityCheckRunCounter: number;
	activeCompatibilityCheckGeneration: number;
	latestCompatibilityResultGeneration: number;
	lastSaveUsedForceConversion: boolean;
	saveRevision: number;
	editValidation: EditValidation;
	editorDocumentMode: EditorDocumentMode;
};

export function buildOpenedEditorSessionDocument(
	payload: EditorOpenPayload,
): OpenedEditorSessionDocument {
	const unknownFormatSession = isUnknownSaveFormat(payload.save);
	const hasSuggestedTarget = unknownFormatSession && payload.suggestedTargetVersion != null;

	return {
		currentSave: payload.save,
		currentParseIssueCount: payload.parseIssueCount,
		currentParseIssues: payload.parseIssues,
		currentHeaderChecksum: payload.headerChecksum,
		currentComputedChecksum: payload.computedChecksum,
		currentSourceFileSize: payload.sourceFileSize,
		currentSourcePath: payload.sourcePath,
		currentEditionHint: payload.editionHint,
		currentSuggestedTargetVersion: payload.suggestedTargetVersion,
		currentParserLayoutVersion: payload.parserLayoutVersion,
		selectedCompatibilityTargetVersion: hasSuggestedTarget
			? payload.suggestedTargetVersion
			: getSaveTargetVersion(payload.save),
		suggestedTargetAutoSelected: hasSuggestedTarget,
		currentSaveBaseline: structuredClone(payload.save),
		currentCompatibilityIssues: [],
		compatibilityCheckError: "",
		compatibilityCheckPending: false,
		compatibilityCheckRunCounter: 0,
		activeCompatibilityCheckGeneration: 0,
		latestCompatibilityResultGeneration: 0,
		lastSaveUsedForceConversion: false,
		editValidation: { errors: [], warnings: [] },
		editorDocumentMode: DEFAULT_EDITOR_DOCUMENT_MODE,
	};
}

export function buildClosedEditorSessionDocument(): ClosedEditorSessionDocument {
	return {
		currentSave: null,
		currentParseIssueCount: 0,
		currentParseIssues: [],
		currentHeaderChecksum: null,
		currentComputedChecksum: null,
		currentSourceFileSize: null,
		currentSourcePath: null,
		currentEditionHint: null,
		currentSuggestedTargetVersion: null,
		currentParserLayoutVersion: null,
		selectedCompatibilityTargetVersion: null,
		suggestedTargetAutoSelected: false,
		currentSaveBaseline: null,
		currentCompatibilityIssues: [],
		compatibilityCheckError: "",
		compatibilityCheckPending: false,
		compatibilityCheckRunCounter: 0,
		activeCompatibilityCheckGeneration: 0,
		latestCompatibilityResultGeneration: 0,
		lastSaveUsedForceConversion: false,
		saveRevision: 0,
		editValidation: { errors: [], warnings: [] },
		editorDocumentMode: DEFAULT_EDITOR_DOCUMENT_MODE,
	};
}

export function hasUnsavedEditorSessionChanges(
	currentSaveBaseline: EditorSave | null,
	currentSave: EditorSave | null,
): boolean {
	if (currentSave == null || currentSaveBaseline == null) {
		return false;
	}
	return buildChangeReview(currentSaveBaseline, currentSave).totalChanges > 0;
}

export async function transitionEditorDocumentMode(params: {
	currentSave: EditorSave | null;
	currentMode: EditorDocumentMode;
	nextMode: EditorDocumentMode;
	confirmGameRulesSwitch: (detailItems: string[]) => Promise<boolean>;
}): Promise<EditorDocumentMode> {
	if (params.currentSave == null || params.nextMode === params.currentMode) {
		return params.currentMode;
	}
	if (params.nextMode === "raw") {
		return "raw";
	}

	let projection: ReturnType<typeof projectGameRulesDerivedValues>;
	try {
		projection = projectGameRulesDerivedValues(params.currentSave);
	} catch (error) {
		await message(getErrorMessage(error, "Unable to recalculate game rules values."), {
			title: "Mode switch blocked",
			kind: "warning",
		});
		return params.currentMode;
	}

	const projectionDetails = projection.changes.map(
		(change) => `${change.label}: ${change.fromDisplay} -> ${change.toDisplay}`,
	);
	if (projectionDetails.length > 0) {
		const confirmed = await params.confirmGameRulesSwitch(projectionDetails);
		if (!confirmed) {
			return params.currentMode;
		}
	}

	applyProjectedGameRulesValues(params.currentSave, projection.values);
	return "game-rules";
}

export type CompatibilityTargetSelectionUpdate = {
	selectedCompatibilityTargetVersion: number | null;
	suggestedTargetAutoSelected?: boolean;
};

export function resolveCompatibilityTargetSelection(params: {
	outputFormatOptions: OutputFormatOption[];
	currentSave: EditorSave | null;
	selectedCompatibilityTargetVersion: number | null;
	currentSuggestedTargetVersion: ParserLayoutVersion | null;
}): CompatibilityTargetSelectionUpdate | null {
	if (params.outputFormatOptions.length < 1) {
		return { selectedCompatibilityTargetVersion: null };
	}
	if (params.currentSave == null) {
		return { selectedCompatibilityTargetVersion: null };
	}

	const saveTargetVersion = getSaveTargetVersion(params.currentSave);
	const unknownFormatSession = isUnknownSaveFormat(params.currentSave);
	const selectionIsValid = params.outputFormatOptions.some(
		(option) => option.version === params.selectedCompatibilityTargetVersion,
	);
	if (selectionIsValid) {
		return null;
	}

	if (unknownFormatSession) {
		const suggestionIsValid = params.outputFormatOptions.some(
			(option) => option.version === params.currentSuggestedTargetVersion,
		);
		if (suggestionIsValid && params.currentSuggestedTargetVersion != null) {
			return {
				selectedCompatibilityTargetVersion: params.currentSuggestedTargetVersion,
				suggestedTargetAutoSelected: true,
			};
		}
		return {
			selectedCompatibilityTargetVersion: null,
			suggestedTargetAutoSelected: false,
		};
	}

	return {
		selectedCompatibilityTargetVersion: saveTargetVersion ?? params.outputFormatOptions[0].version,
	};
}

export type CompatibilityRefreshPlan =
	| {
			kind: "reset-session";
	  }
	| {
			kind: "skip";
			checkGeneration: number;
			compatibilityCheckError: string;
	  }
	| {
			kind: "run";
			checkGeneration: number;
			saveData: EditorSave;
			targetVersion: number;
			sourceLayoutVersion: ParserLayoutVersion | null;
	  };

export function buildCompatibilityRefreshPlan(params: {
	currentSave: EditorSave | null;
	selectedCompatibilityTargetVersion: number | null;
	currentParserLayoutVersion: ParserLayoutVersion | null;
	compatibilityCheckRunCounter: number;
}): CompatibilityRefreshPlan {
	if (params.currentSave == null) {
		return { kind: "reset-session" };
	}

	const checkGeneration = params.compatibilityCheckRunCounter + 1;
	const unknownFormatSession = isUnknownSaveFormat(params.currentSave);
	if (unknownFormatSession && params.selectedCompatibilityTargetVersion == null) {
		return {
			kind: "skip",
			checkGeneration,
			compatibilityCheckError: "",
		};
	}

	const targetVersion = resolveTargetVersion(
		params.currentSave,
		params.selectedCompatibilityTargetVersion,
	);
	if (targetVersion == null) {
		return {
			kind: "skip",
			checkGeneration,
			compatibilityCheckError:
				"No encodable target format is available for this save. Use v99 or v105.",
		};
	}

	const sourceLayoutVersion = unknownFormatSession ? params.currentParserLayoutVersion : null;
	return {
		kind: "run",
		checkGeneration,
		saveData: params.currentSave,
		targetVersion,
		sourceLayoutVersion,
	};
}

export async function checkCompatibility(
	saveData: EditorSave,
	targetVersion: number,
	sourceLayoutVersion: ParserLayoutVersion | null = null,
): Promise<CompatibilityIssue[]> {
	return invoke<CompatibilityIssue[]>("check_save_compatibility", {
		save: buildSaveCommandPayload(saveData, sourceLayoutVersion),
		targetVersion,
	});
}

export type SaveEditorSessionResult = {
	filePath: string;
	baselineSave: EditorSave;
	forceConvertUsed: boolean;
	refreshedCompatibilityIssues: CompatibilityIssue[] | null;
};

export async function saveEditorSession(params: {
	input?: SaveCharacterOptions;
	currentSave: EditorSave | null;
	currentParserLayoutVersion: ParserLayoutVersion | null;
	selectedCompatibilityTargetVersion: number | null;
	currentSuggestedTargetVersion: ParserLayoutVersion | null;
	currentSaveTargetVersion: number | null;
	canForceConvert: boolean;
	compatibilityCheckPending: boolean;
	compatibilityCheckError: string;
	currentSourcePath: string | null;
}): Promise<SaveEditorSessionResult | null> {
	if (params.currentSave == null) {
		return null;
	}

	const input = params.input ?? {};
	const targetVersion = input.targetVersion ?? null;
	const forceConvert = input.forceConvert === true;
	const saveAs = input.saveAs === true || forceConvert;
	const unknownFormatSession = isUnknownSaveFormat(params.currentSave);
	const sourceLayoutVersion = unknownFormatSession ? params.currentParserLayoutVersion : null;
	if (unknownFormatSession && params.selectedCompatibilityTargetVersion == null) {
		const suggestionMessage =
			params.currentSuggestedTargetVersion == null
				? "Select an output format (v99 or v105) in Conversion before saving."
				: `Suggested target is v${params.currentSuggestedTargetVersion}. Confirm or change it in Conversion before saving.`;
		await message(`This save uses an unknown source format. ${suggestionMessage}`, {
			title: "Save blocked",
			kind: "warning",
		});
		return null;
	}
	if (forceConvert) {
		if (!params.canForceConvert) {
			await message(
				"Force conversion is only available when compatibility results are current and include blocking issues.",
				{
					title: "Force save blocked",
					kind: "warning",
				},
			);
			return null;
		}
		if (params.compatibilityCheckPending || params.compatibilityCheckError.length > 0) {
			await message(
				"Force conversion is unavailable while compatibility checks are pending or failed.",
				{
					title: "Force save blocked",
					kind: "warning",
				},
			);
			return null;
		}
	}
	const hasExplicitTargetVersion = targetVersion != null;
	const resolvedTargetVersion = resolveTargetVersion(
		params.currentSave,
		params.selectedCompatibilityTargetVersion,
		targetVersion,
	);
	if (resolvedTargetVersion == null) {
		await message(
			"No compatible output format was selected for this save. Choose an encodable target format (v99 or v105).",
			{
				title: "Save blocked",
				kind: "warning",
			},
		);
		return null;
	}

	let compatibilityIssues: CompatibilityIssue[] = [];
	try {
		compatibilityIssues = await checkCompatibility(
			params.currentSave,
			resolvedTargetVersion,
			sourceLayoutVersion,
		);
	} catch (error) {
		const detail = getErrorMessage(error, "Compatibility check failed.");
		await message(detail, {
			title: "Save blocked",
			kind: "error",
		});
		throw error;
	}

	const shouldRefreshCompatibilityIssues =
		!hasExplicitTargetVersion && resolvedTargetVersion === params.currentSaveTargetVersion;
	const blockingIssues = getBlockingCompatibilityIssues(compatibilityIssues);
	if (blockingIssues.length > 0 && !forceConvert) {
		await message(buildBlockingCompatibilityMessage(resolvedTargetVersion, blockingIssues), {
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

	const savePathContext = buildSavePathContext(
		params.currentSave,
		params.currentSourcePath,
		resolvedTargetVersion,
	);
	const forcePicker = saveAs || savePathContext.forcePicker;
	const filePath =
		!forcePicker && params.currentSourcePath != null && params.currentSourcePath.length > 0
			? params.currentSourcePath
			: ((await save({
					defaultPath: savePathContext.defaultPath,
					filters: [
						{
							name: "D2R Save File",
							extensions: ["d2s"],
						},
					],
				})) ?? null);
	if (filePath == null) {
		return null;
	}

	const backupsEnabled = getSetting(SettingKey.BackupsEnabled);
	const backupsPerCharacter = getSetting(SettingKey.BackupsPerCharacter);
	const backupSourcePath = saveAs ? filePath : (params.currentSourcePath ?? filePath);
	const savePayload = buildSaveCommandPayload(params.currentSave, sourceLayoutVersion);

	try {
		const result = await invoke<SaveCommandResult>("save_file_as_version", {
			path: filePath,
			save: savePayload,
			targetVersion: resolvedTargetVersion,
			ignoreCompatibilityChecks: forceConvert,
			backupSourcePath,
			backupConfig: {
				enabled: backupsEnabled,
				backupsPerCharacter,
			},
		});

		applyTargetVersionToSave(params.currentSave, resolvedTargetVersion);
		if (result.cleanupWarning != null && result.cleanupWarning.length > 0) {
			console.warn(`[backup cleanup warning] ${result.cleanupWarning}`);
		}

		return {
			filePath,
			baselineSave: structuredClone(params.currentSave),
			forceConvertUsed: forceConvert,
			refreshedCompatibilityIssues: shouldRefreshCompatibilityIssues
				? compatibilityIssues
				: null,
		};
	} catch (error) {
		const detail = getErrorMessage(error, "Unknown error");
		await message(detail, {
			title: "Save failed",
			kind: "error",
		});
		throw error;
	}
}
