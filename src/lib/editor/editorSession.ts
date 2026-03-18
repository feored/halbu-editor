import type {
	EditValidation,
	EditorMode,
	EditorSave,
	GameEdition,
	SaveLayoutVersion,
} from "$lib/types/editor";

import type {
	BackendEditorSave,
	CompatibilityIssue,
	ParseIssue,
} from "$lib/types/backend";

export type EditorSession = {
	save: EditorSave;
	sourceBackendSave: BackendEditorSave;

	parseIssueCount: number;
	parseIssues: ParseIssue[];
	headerChecksum: number | null;
	computedChecksum: number | null;
	sourceFileSize: number | null;
	sourcePath: string | null;
	editionHint: GameEdition | null;
	suggestedTargetVersion: SaveLayoutVersion | null;
	parserLayoutVersion: SaveLayoutVersion | null;

	targetVersion: SaveLayoutVersion | null;

	baselineSave: EditorSave;

	compatibilityIssues: CompatibilityIssue[];
	compatibilityPending: boolean;
	compatibilityError: string | null;
	compatibilityResultsAreCurrent: boolean;

	lastSaveUsedForceConversion: boolean;
	saveRevision: number;

	editValidation: EditValidation;
	mode: EditorMode;
	advancedSaveOptionsEnabled: boolean;
};

export type OpenedSessionData = {
	save: EditorSave;
	sourceBackendSave: BackendEditorSave;
	parseIssueCount: number;
	parseIssues: ParseIssue[];
	headerChecksum: number | null;
	computedChecksum: number | null;
	sourceFileSize: number | null;
	sourcePath: string | null;
	editionHint: GameEdition | null;
	suggestedTargetVersion: SaveLayoutVersion | null;
	parserLayoutVersion: SaveLayoutVersion | null;
};

export function createEmptyEditValidation(): EditValidation {
	return {
		errors: [],
		warnings: [],
	};
}
export function createOpenEditorSession(openedSessionData: OpenedSessionData): EditorSession {
	const targetVersion =
		openedSessionData.save.version === 99 || openedSessionData.save.version === 105
			? openedSessionData.save.version
			: null;

	return {
		save: openedSessionData.save,
		sourceBackendSave: openedSessionData.sourceBackendSave,

		parseIssueCount: openedSessionData.parseIssueCount,
		parseIssues: openedSessionData.parseIssues,
		headerChecksum: openedSessionData.headerChecksum,
		computedChecksum: openedSessionData.computedChecksum,
		sourceFileSize: openedSessionData.sourceFileSize,
		sourcePath: openedSessionData.sourcePath,
		editionHint: openedSessionData.editionHint,
		suggestedTargetVersion: openedSessionData.suggestedTargetVersion,
		parserLayoutVersion: openedSessionData.parserLayoutVersion,

		targetVersion,

		baselineSave: structuredClone(openedSessionData.save),

		compatibilityIssues: [],
		compatibilityPending: false,
		compatibilityError: null,
		compatibilityResultsAreCurrent: false,

		lastSaveUsedForceConversion: false,
		saveRevision: 0,

		editValidation: createEmptyEditValidation(),
		mode: "raw",
		advancedSaveOptionsEnabled: false,
	};
}

export function restoreBaselineSave(session: EditorSession): void {
	session.save = structuredClone(session.baselineSave);
	session.editValidation = createEmptyEditValidation();
	session.compatibilityIssues = [];
	session.compatibilityPending = false;
	session.compatibilityError = null;
	session.compatibilityResultsAreCurrent = false;
}
