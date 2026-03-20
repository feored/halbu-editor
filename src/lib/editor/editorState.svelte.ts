import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";

import { getErrorMessage } from "$lib/utils/errorMessage";
import {
	createOpenEditorSession,
	restoreBaselineSave,
	type EditorSession,
	type OpenedSessionData,
} from "$lib/editor/session";
import {
	applyGameRules,
	getGameRules,
} from "$lib/editor/character/gameRules";
import {
	saveCharacterFile,
	type SaveCharacterResult,
	type SaveCharacterOptions,
} from "$lib/editor/save/saveFile";
import {
	analyzeSave,
	getSaveDecision,
	getSaveState,
	getTargetVersion,
	type SaveState,
} from "$lib/editor/save/saveState";

import type {
	OutputFormatOption,
	ParseMode,
} from "$lib/types/backend";
import type { EditorMode, SaveLayoutVersion } from "$lib/types/editor";

type EditorState = {
	readonly session: EditorSession | null;
	readonly hasOpenSession: boolean;
	readonly outputFormatOptions: OutputFormatOption[];
	readonly parseMode: ParseMode;
	readonly isUnknownFormat: boolean;
	readonly targetVersion: SaveLayoutVersion | null;
	readonly needsTargetVersion: boolean;
	readonly canForceSave: boolean;
	readonly isSaveBlocked: boolean;
	readonly layoutVersion: SaveLayoutVersion | null;
	readonly saveState: SaveState | null;
	readonly gameRules: {
		error: string;
	};
	loadOutputFormatOptions: () => Promise<void>;
	setParseMode: (nextParseMode: ParseMode) => void;
	open: (openedSessionData: OpenedSessionData) => void;
	close: () => void;
	restore: () => void;
	setMode: (nextMode: EditorMode) => void;
	setTargetVersion: (nextTargetVersion: SaveLayoutVersion | null) => void;
	save: (input?: SaveCharacterOptions) => Promise<SaveCharacterResult | null>;
};

function createEditorState(): EditorState {
	let session = $state<EditorSession | null>(null);
	let outputFormatOptions = $state<OutputFormatOption[]>([]);
	let parseMode = $state<ParseMode>("lax");
	let analysisRevision = 0;
	let saveInProgress = false;
	let checkedTargetVersion: SaveLayoutVersion | null = null;

	const hasOpenSession = $derived(session != null);

	const saveState = $derived.by(() => {
		if (session == null) {
			return null;
		}

		return getSaveState(session, checkedTargetVersion);
	});

	const isUnknownFormat = $derived(saveState?.unknownFormat ?? false);
	const targetVersion = $derived(saveState?.targetVersion ?? null);
	const needsTargetVersion = $derived(saveState?.needsTargetVersion ?? false);
	const canForceSave = $derived(saveState?.canForceSave ?? false);
	const isSaveBlocked = $derived(saveState?.isSaveBlocked ?? true);
	const layoutVersion = $derived(saveState?.layoutVersion ?? null);

	const gameRules = $derived.by(() => {
		if (session?.mode === "game-rules") {
			try {
				const baselineSave = session.gameRulesBaselineSave ?? null;
				getGameRules(session.save, baselineSave);
			} catch (error) {
				return {
					error: getErrorMessage(error, "Game rules recalculation failed."),
				};
			}
		}

		return {
			error: "",
		};
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

		if (nextMode === session.mode) {
			return;
		}

		if (nextMode === "game-rules") {
			session.gameRulesBaselineSave = $state.snapshot(session.save);
		} else {
			session.gameRulesBaselineSave = null;
		}

		session.mode = nextMode;
	}

	function setTargetVersion(nextTargetVersion: SaveLayoutVersion | null): void {
		if (session == null) {
			return;
		}

		session.targetVersion = nextTargetVersion;
	}

	async function refreshSaveAnalysis(requestedTargetVersion?: SaveLayoutVersion | null): Promise<void> {
		if (session == null) {
			return;
		}

		const requestSession = session;
		const requestRevision = ++analysisRevision;
		const targetVersion = getTargetVersion(session, requestedTargetVersion);
		const sourceLayoutVersion = session.save.metadata.formatId.startsWith("Unknown(")
			? session.parserLayoutVersion
			: null;
		checkedTargetVersion = targetVersion;
		const request = {
			save: $state.snapshot(session.save),
			sourceBackendSave: $state.snapshot(session.sourceBackendSave),
			targetVersion,
			sourceLayoutVersion,
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
			checkedTargetVersion = request.targetVersion;
		} else {
			session.compatibilityIssues = [];
			session.compatibilityError = analysis.compatibilityError;
			session.compatibilityResultsAreCurrent = false;
			checkedTargetVersion = request.targetVersion;
		}
		session.compatibilityPending = false;
	}

	async function save(input: SaveCharacterOptions = {}): Promise<SaveCharacterResult | null> {
		if (session == null) {
			return null;
		}

		saveInProgress = true;
		try {
			if (session.mode === "game-rules") {
				applyGameRules(session.save, session.gameRulesBaselineSave ?? null);
			}

			await refreshSaveAnalysis(input.targetVersion);

			const currentSession = session;
			if (currentSession == null) {
				return null;
			}

			const currentSaveState = getSaveState(
				currentSession,
				checkedTargetVersion,
				input.targetVersion,
			);
			const saveDecision = getSaveDecision(currentSession, input, currentSaveState);
			if (saveDecision.status === "blocked") {
				await message(saveDecision.message, {
					title: saveDecision.kind === "info" ? "Save anyway not needed" : "Save blocked",
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
				forceSave: saveDecision.forceSave,
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
			currentSession.lastSaveUsedForceSave = result.forceSaveUsed;
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
		get canForceSave() {
			return canForceSave;
		},
		get isSaveBlocked() {
			return isSaveBlocked;
		},
		get layoutVersion() {
			return layoutVersion;
		},
		get saveState() {
			return saveState;
		},
		get gameRules() {
			return gameRules;
		},
		loadOutputFormatOptions,
		setParseMode,
		open,
		close,
		restore,
		setMode,
		setTargetVersion,
		save,
	};
}

export const editorState = createEditorState();
