import { invoke } from "@tauri-apps/api/core";

import { isUnknownSaveFormat } from "$lib/utils/GameSupport";
import { getErrorMessage } from "$lib/utils/errorMessage";

import {
	createOpenEditorSession,
	restoreBaselineSave,
	type EditorSession,
	type OpenedSessionData,
} from "$lib/editor/editorSession";
import { projectGameRulesDerivedValues } from "$lib/editor/character/gameRules";
import {
	checkSaveCompatibility,
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
	clearCompatibility: () => void;
	refreshCompatibility: () => Promise<void>;
	save: (input?: SaveCharacterOptions) => Promise<SaveCharacterResult | null>;
};

function createEditorState(): EditorState {
	let session = $state<EditorSession | null>(null);
	let outputFormatOptions = $state<OutputFormatOption[]>([]);
	let parseMode = $state<ParseMode>("lax");

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

	const hasEditErrors = $derived.by(() => {
		if (session == null) {
			return false;
		}

		return session.editValidation.errors.length > 0;
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
			hasEditErrors ||
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
		void refreshCompatibility();
	}

	function close(): void {
		session = null;
	}

	function restore(): void {
		if (session == null) {
			return;
		}

		restoreBaselineSave(session);
		void refreshCompatibility();
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
		void refreshCompatibility();
	}

	function setAdvancedSaveOptionsEnabled(enabled: boolean): void {
		if (session == null) {
			return;
		}

		session.advancedSaveOptionsEnabled = enabled;
	}

	function clearCompatibility(): void {
		if (session == null) {
			return;
		}

		session.compatibilityIssues = [];
		session.compatibilityError = null;
		session.compatibilityPending = false;
		session.compatibilityResultsAreCurrent = false;
	}

	async function refreshCompatibility(): Promise<void> {
		if (session == null) {
			return;
		}

		if (targetVersion == null) {
			clearCompatibility();
			return;
		}

		const request = {
			save: $state.snapshot(session.save),
			sourceBackendSave: $state.snapshot(session.sourceBackendSave),
			saveRevision: session.saveRevision,
			selectedTargetVersion: session.targetVersion,
			parserLayoutVersion: session.parserLayoutVersion,
			sourceLayoutVersion: isUnknownFormat ? session.parserLayoutVersion : null,
		};

		session.compatibilityPending = true;
		session.compatibilityError = null;
		session.compatibilityResultsAreCurrent = false;

		try {
			const issues = await checkSaveCompatibility(
				request.save,
				targetVersion,
				request.sourceLayoutVersion,
				request.sourceBackendSave,
			);

			if (session == null) {
				return;
			}

			if (
				session.saveRevision !== request.saveRevision ||
				session.targetVersion !== request.selectedTargetVersion ||
				session.parserLayoutVersion !== request.parserLayoutVersion
			) {
				return;
			}

			session.compatibilityIssues = issues;
			session.compatibilityResultsAreCurrent = true;
		} catch (error) {
			if (session == null) {
				return;
			}

			if (
				session.saveRevision !== request.saveRevision ||
				session.targetVersion !== request.selectedTargetVersion ||
				session.parserLayoutVersion !== request.parserLayoutVersion
			) {
				return;
			}

			session.compatibilityIssues = [];
			session.compatibilityError = getErrorMessage(error, "Compatibility check failed.");
			session.compatibilityResultsAreCurrent = false;
		} finally {
			if (session == null) {
				return;
			}

			if (
				session.saveRevision
				=== request.saveRevision &&
				session.targetVersion === request.selectedTargetVersion &&
				session.parserLayoutVersion === request.parserLayoutVersion
			) {
				session.compatibilityPending = false;
			}
		}
	}

	async function save(input: SaveCharacterOptions = {}): Promise<SaveCharacterResult | null> {
		if (session == null) {
			return null;
		}

		await refreshCompatibility();

		if (session == null) {
			return null;
		}

		const result = await saveCharacterFile({
			save: session.save,
			sourceBackendSave: session.sourceBackendSave,
			parserLayoutVersion: session.parserLayoutVersion,
			selectedTargetVersion: session.targetVersion,
			suggestedTargetVersion: session.suggestedTargetVersion,
			currentTargetVersion: targetVersion,
			canForceConvert,
			compatibilityPending: session.compatibilityPending,
			compatibilityError: session.compatibilityError,
			sourcePath: session.sourcePath,
			input,
		});

		if (result == null || session == null) {
			return null;
		}

		if (result.refreshedCompatibilityIssues != null) {
			session.compatibilityIssues = result.refreshedCompatibilityIssues;
			session.compatibilityError = null;
			session.compatibilityResultsAreCurrent = true;
		}

		session.sourceBackendSave = result.updatedBackendSave;
		session.sourcePath = result.filePath;
		session.baselineSave = $state.snapshot(session.save);
		session.lastSaveUsedForceConversion = result.forceConvertUsed;
		session.saveRevision += 1;
		await refreshCompatibility();
		return result;
	}

	$effect.root(() => {
		$effect(() => {
			void session?.save;
			void session?.targetVersion;
			void session?.parserLayoutVersion;
			void session?.saveRevision;
			void isUnknownFormat;

			if (session == null) {
				return;
			}

			session.compatibilityResultsAreCurrent = false;
			session.compatibilityIssues = [];
			session.compatibilityError = null;
			session.compatibilityPending = false;
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
		clearCompatibility,
		refreshCompatibility,
		save,
	};
}

export const editorState = createEditorState();
