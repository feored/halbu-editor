import type { EditorMode, EditorSave, GameEdition, SaveLayoutVersion } from "$lib/types/editor";

import type {
	BackendEditorSave,
	BackendOpenSaveResult,
	CompatibilityIssue,
	ParseIssue,
	ValidationReport,
} from "$lib/types/backend";
import { toEditorSave } from "$lib/types/saveConverter";
import { getSkillsDataset } from "$lib/utils/gameData";
import { resizeSkillSlots } from "$lib/editor/skills/skillsSlots";

export type EditorSession = {
	save: EditorSave;
	sourceBackendSave: BackendEditorSave;
	gameRulesBaselineSave: EditorSave | null;

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
	validationReport: ValidationReport;
	validationPending: boolean;
	validationError: string | null;

	lastSaveUsedForceConversion: boolean;
	saveRevision: number;
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

export function toOpenedSessionData(
	result: BackendOpenSaveResult,
	sourcePath: string | null,
): OpenedSessionData {
	return {
		save: toEditorSave(result.save),
		sourceBackendSave: structuredClone(result.save),
		parseIssueCount: result.parse_issue_count,
		parseIssues: result.parse_issues,
		headerChecksum: result.header_checksum,
		computedChecksum: result.computed_checksum,
		sourceFileSize: result.source_file_size,
		sourcePath,
		editionHint: result.edition_hint,
		suggestedTargetVersion: result.suggested_target_version,
		parserLayoutVersion: result.parser_layout_version,
	};
}

function deriveClassSkillSlotCount(
	save: EditorSave,
	parserLayoutVersion: SaveLayoutVersion | null,
): number {
	const version = parserLayoutVersion == null ? save.version : parserLayoutVersion;
	const skillsDataset = getSkillsDataset(version);
	if (skillsDataset == null) {
		return save.skills.length;
	}

	const classSkills = skillsDataset.filter(
		(skill) => skill.class === save.character.className,
	);
	if (classSkills.length < 1) {
		return save.skills.length;
	}

	const maxSaveId = classSkills.reduce(
		(maxSaveSlot, skill) => Math.max(maxSaveSlot, skill.saveId),
		-1,
	);
	return maxSaveId + 1;
}

export function createOpenEditorSession(openedSessionData: OpenedSessionData): EditorSession {
	const normalizedSave = structuredClone(openedSessionData.save);
	const skillSlotCount = deriveClassSkillSlotCount(
		normalizedSave,
		openedSessionData.parserLayoutVersion,
	);
	if (skillSlotCount > 0 && normalizedSave.skills.length !== skillSlotCount) {
		normalizedSave.skills = resizeSkillSlots(normalizedSave.skills, skillSlotCount);
	}

	const targetVersion =
		normalizedSave.version === 99 || normalizedSave.version === 105
			? normalizedSave.version
			: null;

	return {
		save: normalizedSave,
		sourceBackendSave: openedSessionData.sourceBackendSave,
		gameRulesBaselineSave: null,

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

		baselineSave: structuredClone(normalizedSave),

		compatibilityIssues: [],
		compatibilityPending: false,
		compatibilityError: null,
		compatibilityResultsAreCurrent: false,
		validationReport: {
			issues: [],
		},
		validationPending: false,
		validationError: null,

		lastSaveUsedForceConversion: false,
		saveRevision: 0,
		mode: "raw",
		advancedSaveOptionsEnabled: false,
	};
}

export function restoreBaselineSave(session: EditorSession): void {
	session.save = structuredClone(session.baselineSave);
	session.gameRulesBaselineSave = $state.snapshot(session.save);
	session.compatibilityIssues = [];
	session.compatibilityPending = false;
	session.compatibilityError = null;
	session.compatibilityResultsAreCurrent = false;
	session.validationReport = {
		issues: [],
	};
	session.validationPending = false;
	session.validationError = null;
}
