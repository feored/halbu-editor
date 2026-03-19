import { invoke } from "@tauri-apps/api/core";

import { isUnknownSaveFormat } from "$lib/utils/gameData";
import { getErrorMessage } from "$lib/utils/errorMessage";

import {
	createOpenEditorSession,
	restoreBaselineSave,
	type EditorSession,
	type OpenedSessionData,
} from "$lib/editor/editorSession";
import { projectGameRulesDerivedValues } from "$lib/editor/character/gameRules";
import {
	analyzeSave,
	saveCharacterFile,
	type SaveCharacterResult,
	type SaveCharacterOptions,
} from "$lib/editor/save/saveWorkflow";

import type { OutputFormatOption, ParseMode } from "$lib/types/backend";
import type { EditorMode, SaveLayoutVersion } from "$lib/types/editor";

function getLayoutVersion(version: number): SaveLayoutVersion | null {
	if (version === 99 || version === 105) {
		return version;
	}

	return null;
}

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

function createEditorState(): EditorState {
	let session = $state<EditorSession | null>(null);
	let outputFormatOptions = $state<OutputFormatOption[]>([]);
	let parseMode = $state<ParseMode>("lax");
	let analysisRevision = 0;

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

	async function refreshAnalysis(): Promise<void> {
		if (session == null) {
			return;
		}

		const requestSession = session;
		const requestRevision = ++analysisRevision;
		const request = {
			save: $state.snapshot(session.save),
			sourceBackendSave: $state.snapshot(session.sourceBackendSave),
			targetVersion: session.targetVersion,
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
		} else {
			session.compatibilityIssues = [];
			session.compatibilityError = analysis.compatibilityError;
			session.compatibilityResultsAreCurrent = false;
		}
		session.compatibilityPending = false;
	}

	async function save(input: SaveCharacterOptions = {}): Promise<SaveCharacterResult | null> {
		if (session == null) {
			return null;
		}

		await refreshAnalysis();

		if (session == null) {
			return null;
		}

		const result = await saveCharacterFile({
			save: session.save,
			sourceBackendSave: session.sourceBackendSave,
			parserLayoutVersion: session.parserLayoutVersion,
			selectedTargetVersion: session.targetVersion,
			suggestedTargetVersion: session.suggestedTargetVersion,
			sourcePath: session.sourcePath,
			input,
		});

		if (result == null || session == null) {
			return null;
		}

		if (targetVersion == null) {
			return null;
		}

		session.save.version = targetVersion;
		session.save.metadata.formatId = targetVersion === 99 ? "V99" : "V105";
		session.sourceBackendSave = result.updatedBackendSave;
		session.sourcePath = result.filePath;
		session.baselineSave = $state.snapshot(session.save);
		session.lastSaveUsedForceConversion = result.forceConvertUsed;
		session.saveRevision += 1;
		return result;
	}

	$effect.root(() => {
		$effect(() => {
			void session?.save;
			void session?.sourceBackendSave;
			void session?.targetVersion;
			void session?.parserLayoutVersion;
			void isUnknownFormat;

			if (session == null) {
				return;
			}

			void refreshAnalysis();
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
