import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";

import { isUnknownSaveFormat } from "$lib/utils/gameData";
import { getErrorMessage } from "$lib/utils/errorMessage";
import { toBackendSave } from "$lib/types/converters";

import {
	createOpenEditorSession,
	restoreBaselineSave,
	type EditorSession,
	type OpenedSessionData,
} from "$lib/editor/editorSession";
import { projectGameRulesDerivedValues } from "$lib/editor/character/gameRules";
import {
	saveCharacterFile,
	type SaveCharacterResult,
	type SaveCharacterOptions,
} from "$lib/editor/save/saveWorkflow";

import type {
	CompatibilityIssue,
	OutputFormatOption,
	ParseMode,
	ValidationReport,
	BackendEditorSave,
} from "$lib/types/backend";
import type { EditorMode, EditorSave, SaveLayoutVersion } from "$lib/types/editor";

function getLayoutVersion(version: number): SaveLayoutVersion | null {
	if (version === 99 || version === 105) {
		return version;
	}

	return null;
}

type SaveDecision =
	| {
			status: "blocked";
			kind: "warning" | "error" | "info";
			message: string;
			throwAfterMessage: boolean;
	  }
	| {
			status: "ready";
			targetVersion: SaveLayoutVersion;
			sourceLayoutVersion: SaveLayoutVersion | null;
			saveAs: boolean;
			forceConvert: boolean;
	  };

type SaveAnalysisResult = {
	validationReport: ValidationReport;
	validationError: string | null;
	compatibilityIssues: CompatibilityIssue[];
	compatibilityError: string | null;
};

type EditorState = {
	readonly session: EditorSession | null;
	readonly hasOpenSession: boolean;
	readonly outputFormatOptions: OutputFormatOption[];
	readonly parseMode: ParseMode;
	readonly isUnknownFormat: boolean;
	readonly targetVersion: SaveLayoutVersion | null;
	readonly needsTargetVersion: boolean;
	readonly canForceConvert: boolean;
	readonly isSaveBlocked: boolean;
	readonly layoutVersion: SaveLayoutVersion | null;
	readonly gameRulesValues: {
		values: ReturnType<typeof projectGameRulesDerivedValues>["values"] | null;
		error: string;
	};
	loadOutputFormatOptions: () => Promise<void>;
	setParseMode: (nextParseMode: ParseMode) => void;
	open: (openedSessionData: OpenedSessionData) => void;
	close: () => void;
	restore: () => void;
	setMode: (nextMode: EditorMode) => void;
	setTargetVersion: (nextTargetVersion: SaveLayoutVersion | null) => void;
	setAdvancedSaveOptionsEnabled: (enabled: boolean) => void;
	save: (input?: SaveCharacterOptions) => Promise<SaveCharacterResult | null>;
};

function getSaveDecision(
	session: EditorSession,
	input: SaveCharacterOptions,
	analyzedTargetVersion: SaveLayoutVersion | null,
): SaveDecision {
	const saveAs = input.saveAs === true || input.forceConvert === true;
	const forceConvert = input.forceConvert === true;
	const targetVersion = getEffectiveTargetVersion(session, input.targetVersion);
	const isUnknownFormat = session.save.metadata.formatId.startsWith("Unknown(");
	const sourceLayoutVersion = isUnknownFormat ? session.parserLayoutVersion : null;
	const compatibilityResultsCurrent =
		session.compatibilityResultsAreCurrent && analyzedTargetVersion === targetVersion;

	if (isUnknownFormat && targetVersion == null) {
		return {
			status: "blocked",
			kind: "warning",
			message:
				session.suggestedTargetVersion == null
					? "This save uses an unknown source format. Select an output format (v99 or v105) in Conversion before saving."
					: `This save uses an unknown source format. Suggested target is v${session.suggestedTargetVersion}. Confirm or change it in Conversion before saving.`,
			throwAfterMessage: false,
		};
	}

	if (targetVersion == null) {
		return {
			status: "blocked",
			kind: "warning",
			message: "No compatible output format was selected for this save. Choose v99 or v105.",
			throwAfterMessage: false,
		};
	}

	if (session.validationError != null) {
		return {
			status: "blocked",
			kind: "error",
			message: session.validationError,
			throwAfterMessage: true,
		};
	}

	const blockingValidationIssues = session.validationReport.issues.filter((issue) => issue.blocking);
	if (blockingValidationIssues.length > 0) {
		const details = blockingValidationIssues.map((issue) => `- ${issue.message}`).join("\n");
		return {
			status: "blocked",
			kind: "warning",
			message: `Cannot save because of blocking validation issues:\n${details}`,
			throwAfterMessage: false,
		};
	}

	if (session.compatibilityError != null) {
		return {
			status: "blocked",
			kind: "error",
			message: session.compatibilityError,
			throwAfterMessage: true,
		};
	}

	if (!compatibilityResultsCurrent) {
		return {
			status: "blocked",
			kind: "warning",
			message: "Compatibility check is not current for the selected output format.",
			throwAfterMessage: false,
		};
	}

	const blockingCompatibilityIssues = session.compatibilityIssues.filter((issue) => issue.blocking);
	if (blockingCompatibilityIssues.length > 0 && !forceConvert) {
		const details = blockingCompatibilityIssues.map((issue) => `- ${issue.message}`).join("\n");
		return {
			status: "blocked",
			kind: "warning",
			message: `Cannot save to v${targetVersion} because of blocking compatibility issues:\n${details}`,
			throwAfterMessage: false,
		};
	}

	if (forceConvert && blockingCompatibilityIssues.length === 0) {
		return {
			status: "blocked",
			kind: "info",
			message: "Blocking issues are no longer present. Use normal Save As.",
			throwAfterMessage: false,
		};
	}

	return {
		status: "ready",
		targetVersion,
		sourceLayoutVersion,
		saveAs,
		forceConvert,
	};
}

function getEffectiveTargetVersion(
	session: EditorSession,
	requestedTargetVersion?: SaveLayoutVersion | null,
): SaveLayoutVersion | null {
	if (requestedTargetVersion === 99 || requestedTargetVersion === 105) {
		return requestedTargetVersion;
	}

	if (session.targetVersion === 99 || session.targetVersion === 105) {
		return session.targetVersion;
	}

	if (session.save.version === 99 || session.save.version === 105) {
		return session.save.version;
	}

	return null;
}

async function analyzeSave(
	save: EditorSave,
	targetVersion: SaveLayoutVersion | null,
	sourceLayoutVersion: SaveLayoutVersion | null,
	sourceBackendSave: BackendEditorSave,
): Promise<SaveAnalysisResult> {
	const backendSave = toBackendSave(sourceBackendSave, save, sourceLayoutVersion);
	const validationPromise = invoke<ValidationReport>("validate_save", {
		save: backendSave,
	}).then(
		(report) => ({ ok: true as const, report }),
		(error) => ({ ok: false as const, error }),
	);

	const compatibilityPromise =
		targetVersion == null
			? Promise.resolve(null)
			: invoke<CompatibilityIssue[]>("check_save_compatibility", {
					save: backendSave,
					targetVersion,
				}).then(
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
			validationResult.ok === true
				? null
				: getErrorMessage(validationResult.error, "Validation check failed."),
		compatibilityIssues:
			compatibilityResult?.ok === true ? compatibilityResult.issues : [],
		compatibilityError:
			compatibilityResult == null || compatibilityResult.ok === true
				? null
				: getErrorMessage(compatibilityResult.error, "Compatibility check failed."),
	};
}

function createEditorState(): EditorState {
	let session = $state<EditorSession | null>(null);
	let outputFormatOptions = $state<OutputFormatOption[]>([]);
	let parseMode = $state<ParseMode>("lax");
	let analysisRevision = 0;
	let saveInProgress = false;
	let analyzedTargetVersion: SaveLayoutVersion | null = null;

	const hasOpenSession = $derived(session != null);

	const isUnknownFormat = $derived.by(() => {
		if (session == null) {
			return false;
		}

		return isUnknownSaveFormat(session.save);
	});

	const targetVersion = $derived.by(() => {
		if (session == null) {
			return null;
		}

		if (session.targetVersion === 99 || session.targetVersion === 105) {
			return session.targetVersion;
		}

		if (session.save.version === 99 || session.save.version === 105) {
			return session.save.version;
		}

		return null;
	});

	const needsTargetVersion = $derived.by(() => {
		if (session == null) {
			return false;
		}

		return isUnknownFormat && targetVersion == null;
	});

	const hasBlockingValidationIssues = $derived.by(() => {
		if (session == null) {
			return false;
		}

		return session.validationReport.issues.some((issue) => issue.blocking);
	});

	const hasBlockingCompatibilityIssues = $derived.by(() => {
		if (session == null) {
			return false;
		}

		return session.compatibilityIssues.some((issue) => issue.blocking);
	});

	const canForceConvert = $derived.by(() => {
		if (session == null) {
			return false;
		}

		return (
			!hasBlockingValidationIssues &&
			!needsTargetVersion &&
			session.compatibilityResultsAreCurrent &&
			hasBlockingCompatibilityIssues
		);
	});

	const isSaveBlocked = $derived.by(() => {
		if (session == null) {
			return true;
		}

		return (
			hasBlockingValidationIssues ||
			session.validationError != null ||
			session.compatibilityError != null ||
			hasBlockingCompatibilityIssues ||
			needsTargetVersion
		);
	});

	const layoutVersion = $derived.by(() => {
		if (session == null) {
			return null;
		}

		if (isUnknownFormat) {
			return session.parserLayoutVersion ?? getLayoutVersion(session.save.version);
		}

		return getLayoutVersion(session.save.version);
	});

	const gameRulesValues = $derived.by(() => {
		if (session == null || session.mode !== "game-rules") {
			return {
				values: null,
				error: "",
			};
		}

		try {
			return {
				values: projectGameRulesDerivedValues(session.save).values,
				error: "",
			};
		} catch (error) {
			return {
				values: null,
				error: getErrorMessage(error, "Game rules recalculation failed."),
			};
		}
	});

	async function loadOutputFormatOptions(): Promise<void> {
		try {
			const formats = await invoke<OutputFormatOption[]>("get_supported_output_formats");
			outputFormatOptions = formats.sort((left, right) => left.version - right.version);
		} catch (error) {
			console.warn("Unable to load supported output formats", error);
			outputFormatOptions = [];
		}
	}

	function setParseMode(nextParseMode: ParseMode): void {
		parseMode = nextParseMode;
	}

	function open(openedSessionData: OpenedSessionData): void {
		session = createOpenEditorSession(openedSessionData);
	}

	function close(): void {
		session = null;
	}

	function restore(): void {
		if (session == null) {
			return;
		}

		restoreBaselineSave(session);
	}

	function setMode(nextMode: EditorMode): void {
		if (session == null) {
			return;
		}

		session.mode = nextMode;
	}

	function setTargetVersion(nextTargetVersion: SaveLayoutVersion | null): void {
		if (session == null) {
			return;
		}

		session.targetVersion = nextTargetVersion;
	}

	function setAdvancedSaveOptionsEnabled(enabled: boolean): void {
		if (session == null) {
			return;
		}

		session.advancedSaveOptionsEnabled = enabled;
	}

	async function refreshSaveAnalysis(requestedTargetVersion?: SaveLayoutVersion | null): Promise<void> {
		if (session == null) {
			return;
		}

		const requestSession = session;
		const requestRevision = ++analysisRevision;
		const targetVersion = getEffectiveTargetVersion(session, requestedTargetVersion);
		analyzedTargetVersion = targetVersion;
		const request = {
			save: $state.snapshot(session.save),
			sourceBackendSave: $state.snapshot(session.sourceBackendSave),
			targetVersion,
			sourceLayoutVersion: isUnknownFormat ? session.parserLayoutVersion : null,
		};

		session.validationReport = { issues: [] };
		session.validationPending = true;
		session.validationError = null;

		if (request.targetVersion == null) {
			session.compatibilityIssues = [];
			session.compatibilityPending = false;
			session.compatibilityError = null;
			session.compatibilityResultsAreCurrent = false;
		} else {
			session.compatibilityIssues = [];
			session.compatibilityPending = true;
			session.compatibilityError = null;
			session.compatibilityResultsAreCurrent = false;
		}

		const analysis = await analyzeSave(
			request.save,
			request.targetVersion,
			request.sourceLayoutVersion,
			request.sourceBackendSave,
		);

		if (session == null || session !== requestSession || analysisRevision !== requestRevision) {
			return;
		}

		session.validationReport = analysis.validationReport;
		session.validationError = analysis.validationError;
		session.validationPending = false;

		if (request.targetVersion == null) {
			session.compatibilityPending = false;
			session.compatibilityResultsAreCurrent = false;
			return;
		}

		if (analysis.compatibilityError == null) {
			session.compatibilityIssues = analysis.compatibilityIssues;
			session.compatibilityError = null;
			session.compatibilityResultsAreCurrent = true;
			analyzedTargetVersion = request.targetVersion;
		} else {
			session.compatibilityIssues = [];
			session.compatibilityError = analysis.compatibilityError;
			session.compatibilityResultsAreCurrent = false;
			analyzedTargetVersion = request.targetVersion;
		}
		session.compatibilityPending = false;
	}

	async function save(input: SaveCharacterOptions = {}): Promise<SaveCharacterResult | null> {
		if (session == null) {
			return null;
		}

		saveInProgress = true;
		try {
			await refreshSaveAnalysis(input.targetVersion);

			const currentSession = session;
			if (currentSession == null) {
				return null;
			}

			const saveDecision = getSaveDecision(currentSession, input, analyzedTargetVersion);
			if (saveDecision.status === "blocked") {
				await message(saveDecision.message, {
					title: saveDecision.kind === "info" ? "Force save not needed" : "Save blocked",
					kind: saveDecision.kind,
				});
				if (saveDecision.throwAfterMessage) {
					throw new Error(saveDecision.message);
				}
				return null;
			}

			const result = await saveCharacterFile({
				save: currentSession.save,
				sourceBackendSave: currentSession.sourceBackendSave,
				sourceLayoutVersion: saveDecision.sourceLayoutVersion,
				targetVersion: saveDecision.targetVersion,
				sourcePath: currentSession.sourcePath,
				saveAs: saveDecision.saveAs,
				forceConvert: saveDecision.forceConvert,
			});

			if (result == null || session !== currentSession) {
				return null;
			}

			currentSession.save.version = saveDecision.targetVersion;
			currentSession.save.metadata.formatId =
				saveDecision.targetVersion === 99 ? "V99" : "V105";
			currentSession.sourceBackendSave = result.updatedBackendSave;
			currentSession.sourcePath = result.filePath;
			currentSession.baselineSave = $state.snapshot(currentSession.save);
			currentSession.lastSaveUsedForceConversion = result.forceConvertUsed;
			currentSession.saveRevision += 1;
			return result;
		} finally {
			saveInProgress = false;
		}
	}

	$effect.root(() => {
		$effect(() => {
			void session?.save;
			void session?.sourceBackendSave;
			void session?.targetVersion;
			void session?.parserLayoutVersion;
			void isUnknownFormat;

			if (session == null || saveInProgress) {
				return;
			}

			void refreshSaveAnalysis();
		});
	});

	return {
		get session() {
			return session;
		},
		get hasOpenSession() {
			return hasOpenSession;
		},
		get outputFormatOptions() {
			return outputFormatOptions;
		},
		get parseMode() {
			return parseMode;
		},
		get isUnknownFormat() {
			return isUnknownFormat;
		},
		get targetVersion() {
			return targetVersion;
		},
		get needsTargetVersion() {
			return needsTargetVersion;
		},
		get canForceConvert() {
			return canForceConvert;
		},
		get isSaveBlocked() {
			return isSaveBlocked;
		},
		get layoutVersion() {
			return layoutVersion;
		},
		get gameRulesValues() {
			return gameRulesValues;
		},
		loadOutputFormatOptions,
		setParseMode,
		open,
		close,
		restore,
		setMode,
		setTargetVersion,
		setAdvancedSaveOptionsEnabled,
		save,
	};
}

export const editorState = createEditorState();
