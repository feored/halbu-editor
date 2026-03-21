import { invoke } from "@tauri-apps/api/core";

import variantsJson from "$lib/editor/mercenary/variants.json";
import { getValidationMessage } from "$lib/editor/save/validation";
import { type EditorSession } from "$lib/editor/session";
import { type SaveCharacterOptions } from "$lib/editor/save/saveFile";
import { toBackendSave } from "$lib/types/saveConverter";
import { getErrorMessage } from "$lib/utils/errorMessage";

import type {
	BackendEditorSave,
	CompatibilityIssue,
	ValidationIssue,
	ValidationReport,
} from "$lib/types/backend";
import type { EditorSave, SaveLayoutVersion } from "$lib/types/editor";

export type SaveDecision =
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
			forceSave: boolean;
	  };

export type SaveAnalysisResult = {
	validationReport: ValidationReport;
	validationError: string | null;
	compatibilityIssues: CompatibilityIssue[];
	compatibilityError: string | null;
};

export type SaveIssueSource = "Validation" | "Compatibility" | "Editor";

export type SaveIssue = {
	source: SaveIssueSource;
	blocking: boolean;
	message: string;
};

export type SaveTone = "normal" | "warning" | "danger";

export type SaveCheck = {
	label: string;
	tone: SaveTone;
};

export type SaveState = {
	unknownFormat: boolean;
	targetVersion: SaveLayoutVersion | null;
	layoutVersion: SaveLayoutVersion | null;
	sourceLayoutVersion: SaveLayoutVersion | null;
	needsTargetVersion: boolean;
	compatibilityCurrent: boolean;
	canForceSave: boolean;
	isSaveBlocked: boolean;
	readiness: SaveCheck;
	validation: SaveCheck;
	compatibility: SaveCheck;
	targetVersionLabel: string;
	conversionLabel: string;
	issues: SaveIssue[];
	forceSaveIssues: string[];
	hasIssues: boolean;
	hasForceSaveValidationIssues: boolean;
	hasForceSaveCompatibilityIssues: boolean;
	nextStep: string;
	editionHintLabel: string;
	isConverting: boolean;
};

type MercenaryVariant = {
	id: number;
	type: string;
};

const mercenaryVariantTypes = new Map(
	(variantsJson as MercenaryVariant[]).map((variant) => [variant.id, variant.type]),
);

function getBlockingValidationIssues(session: EditorSession): ValidationIssue[] {
	return session.validationReport.issues.filter((issue) => issue.blocking);
}

function getBlockingCompatibilityIssues(session: EditorSession): CompatibilityIssue[] {
	return session.compatibilityIssues.filter((issue) => issue.blocking);
}

function getBlockingValidationMessages(session: EditorSession): string[] {
	return getBlockingValidationIssues(session).map((issue) =>
		getValidationMessage(issue, session.save),
	);
}

function getBlockingCompatibilityMessages(session: EditorSession): string[] {
	return getBlockingCompatibilityIssues(session).map((issue) => getCompatibilityMessage(issue));
}

function getEditorIssues(session: EditorSession): SaveIssue[] {
	const issues: SaveIssue[] = [];

	if (session.save.character.className !== session.baselineSave.character.className) {
		issues.push({
			source: "Editor",
			blocking: false,
			message: `Class changed from ${session.baselineSave.character.className} to ${session.save.character.className}. Equipped items may no longer be valid.`,
		});
	}

	const baselineMercenary = session.baselineSave.character.mercenary;
	const currentMercenary = session.save.character.mercenary;
	if (baselineMercenary.id !== 0 && currentMercenary.id !== 0) {
		const baselineMercenaryType = mercenaryVariantTypes.get(baselineMercenary.variantId) ?? null;
		const currentMercenaryType = mercenaryVariantTypes.get(currentMercenary.variantId) ?? null;

		if (
			baselineMercenaryType != null &&
			currentMercenaryType != null &&
			baselineMercenaryType !== currentMercenaryType
		) {
			issues.push({
				source: "Editor",
				blocking: false,
				message: `Mercenary type changed from ${baselineMercenaryType} to ${currentMercenaryType}. Mercenary equipment may no longer be valid.`,
			});
		}
	}

	return issues;
}

export function getLayoutVersion(version: number): SaveLayoutVersion | null {
	if (version === 99 || version === 105) {
		return version;
	}

	return null;
}

export function getTargetVersion(
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

export async function analyzeSave(
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

export function getCompatibilityMessage(issue: CompatibilityIssue): string {
	const message = issue.message.trim();
	if (message.length > 0) {
		return message;
	}

	switch (issue.code) {
		case "WarlockRequiresRotW":
			return "Warlock requires RotW edition target.";
		case "WarlockRequiresRotWExpansion":
			return "Warlock requires Reign of the Warlock expansion mode.";
		case "RotWExpansionRequiresRotWEdition":
			return "Reign of the Warlock expansion mode requires a RotW edition target.";
		case "ExpansionClassRequiresExpansionMode":
			return "Druid and Assassin require Expansion or Reign of the Warlock mode.";
		case "UnknownClassRequiresKnownTarget":
			return "Unknown classes cannot be safely converted to known target formats.";
		case "MercenaryHireStateToggleUnsupported":
			return "Changing mercenary hire state is not supported by this version of halbu.";
	}

	return issue.code;
}

export function getSaveDecision(
	session: EditorSession,
	input: SaveCharacterOptions,
	saveState: SaveState,
): SaveDecision {
	const saveAs = input.saveAs === true || input.forceSave === true;
	const forceSave = input.forceSave === true;
	const targetVersion =
		input.targetVersion === 99 || input.targetVersion === 105
			? input.targetVersion
			: saveState.targetVersion;

	if (saveState.unknownFormat && targetVersion == null) {
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

	if (session.validationError != null && !forceSave) {
		return {
			status: "blocked",
			kind: "error",
			message: session.validationError,
			throwAfterMessage: true,
		};
	}

	const blockingValidationMessages = getBlockingValidationMessages(session);
	if (blockingValidationMessages.length > 0 && !forceSave) {
		return {
			status: "blocked",
			kind: "warning",
			message: `Cannot save because of blocking validation issues:\n${blockingValidationMessages.map((message) => `- ${message}`).join("\n")}`,
			throwAfterMessage: false,
		};
	}

	if (session.compatibilityError != null && !forceSave) {
		return {
			status: "blocked",
			kind: "error",
			message: session.compatibilityError,
			throwAfterMessage: true,
		};
	}

	if (!saveState.compatibilityCurrent && !forceSave) {
		return {
			status: "blocked",
			kind: "warning",
			message: "Compatibility check is not current for the selected output format.",
			throwAfterMessage: false,
		};
	}

	const blockingCompatibilityMessages = getBlockingCompatibilityMessages(session);
	if (blockingCompatibilityMessages.length > 0 && !forceSave) {
		return {
			status: "blocked",
			kind: "warning",
			message: `Cannot save to v${targetVersion} because of blocking compatibility issues:\n${blockingCompatibilityMessages.map((message) => `- ${message}`).join("\n")}`,
			throwAfterMessage: false,
		};
	}

	if (
		forceSave &&
		session.validationError == null &&
		blockingValidationMessages.length === 0 &&
		session.compatibilityError == null &&
		blockingCompatibilityMessages.length === 0 &&
		saveState.compatibilityCurrent
	) {
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
		sourceLayoutVersion: saveState.sourceLayoutVersion,
		saveAs,
		forceSave,
	};
}

export function getSaveState(
	session: EditorSession,
	checkedTargetVersion: SaveLayoutVersion | null = null,
	requestedTargetVersion?: SaveLayoutVersion | null,
): SaveState {
	const unknownFormat = session.save.metadata.formatId.startsWith("Unknown(");
	const targetVersion = getTargetVersion(session, requestedTargetVersion);
	const layoutVersion = unknownFormat
		? session.parserLayoutVersion ?? getLayoutVersion(session.save.version)
		: getLayoutVersion(session.save.version);
	const sourceLayoutVersion = unknownFormat ? session.parserLayoutVersion : null;
	const needsTargetVersion = unknownFormat && targetVersion == null;
	const validationIssues = session.validationReport.issues;
	const compatibilityIssues = session.compatibilityIssues;
	const blockingValidationIssues = getBlockingValidationIssues(session);
	const validationWarnings = validationIssues.filter((issue) => !issue.blocking);
	const blockingCompatibilityIssues = getBlockingCompatibilityIssues(session);
	const compatibilityWarnings = compatibilityIssues.filter((issue) => !issue.blocking);
	const hasBlockingValidationIssues = blockingValidationIssues.length > 0;
	const hasBlockingCompatibilityIssues = blockingCompatibilityIssues.length > 0;
	const compatibilityCurrent =
		session.compatibilityResultsAreCurrent && checkedTargetVersion === targetVersion;
	const editorIssues = getEditorIssues(session);
	const hasEditorWarnings = editorIssues.length > 0;
	const canForceSave =
		!needsTargetVersion &&
		(
			hasBlockingValidationIssues ||
			session.validationError != null ||
			hasBlockingCompatibilityIssues ||
			session.compatibilityError != null
		);
	const isSaveBlocked =
		hasBlockingValidationIssues ||
		session.validationError != null ||
		session.compatibilityError != null ||
		hasBlockingCompatibilityIssues ||
		needsTargetVersion;

	const issues: SaveIssue[] = [];
	if (session.validationError != null) {
		issues.push({
			source: "Validation",
			blocking: true,
			message: `Validation check failed: ${session.validationError}`,
		});
	}
	for (const issue of validationIssues) {
		issues.push({
			source: "Validation",
			blocking: issue.blocking,
			message: getValidationMessage(issue, session.save),
		});
	}
	if (session.compatibilityError != null) {
		issues.push({
			source: "Compatibility",
			blocking: true,
			message: `Compatibility check failed: ${session.compatibilityError}`,
		});
	}
	for (const issue of compatibilityIssues) {
		issues.push({
			source: "Compatibility",
			blocking: issue.blocking,
			message: getCompatibilityMessage(issue),
		});
	}
	issues.push(...editorIssues);

	const hasValidationWarnings = validationWarnings.length > 0;
	const hasCompatibilityIssues = compatibilityIssues.length > 0;
	const hasConversionWarnings =
		session.compatibilityPending || session.compatibilityError != null || hasCompatibilityIssues;
	const isConverting = targetVersion != null && targetVersion !== session.save.version;

	let nextStep = "Choose Save or Save As to finalize this file.";
	if (needsTargetVersion) {
		nextStep = "Select an output format in Conversion before saving.";
	} else if (isSaveBlocked) {
		nextStep = canForceSave
			? "Fix issues or use Save As Anyway."
			: "Fix issues before saving.";
	}

	let editionHintLabel = "Unknown";
	if (session.editionHint === "D2R Legacy") {
		editionHintLabel = "D2R Legacy";
	} else if (session.editionHint === "RotW") {
		editionHintLabel = "RotW";
	}

	return {
		unknownFormat,
		targetVersion,
		layoutVersion,
		sourceLayoutVersion,
		needsTargetVersion,
		compatibilityCurrent,
		canForceSave,
		isSaveBlocked,
		readiness: {
			label: isSaveBlocked
				? "Blocked"
				: hasValidationWarnings || hasConversionWarnings || hasEditorWarnings
					? "Warning"
					: "Ready",
			tone: isSaveBlocked
				? "danger"
				: hasValidationWarnings || hasConversionWarnings || hasEditorWarnings
					? "warning"
					: "normal",
		},
		validation: {
			label: session.validationPending
				? "Checking..."
				: session.validationError != null
					? "Check failed"
					: blockingValidationIssues.length > 0
						? `Failed (${blockingValidationIssues.length} error(s))`
						: hasValidationWarnings
							? `Passed with warnings (${validationWarnings.length})`
							: "Passed",
			tone:
				session.validationError != null || blockingValidationIssues.length > 0
					? "danger"
					: session.validationPending || hasValidationWarnings
						? "warning"
						: "normal",
		},
		compatibility: {
			label: needsTargetVersion
				? "Target required"
				: session.compatibilityPending
					? "Checking..."
					: session.compatibilityError != null
						? "Check failed"
						: hasBlockingCompatibilityIssues
							? `Failed (${blockingCompatibilityIssues.length} blocking issue(s))`
							: hasCompatibilityIssues
								? `Passed with warnings (${compatibilityWarnings.length})`
								: "Passed",
			tone:
				session.compatibilityError != null || hasBlockingCompatibilityIssues
					? "danger"
					: needsTargetVersion || session.compatibilityPending || hasCompatibilityIssues
						? "warning"
						: "normal",
		},
		targetVersionLabel: targetVersion == null ? "Not selected" : `v${targetVersion}`,
		conversionLabel:
			targetVersion == null
				? "No target selected"
				: !isConverting
					? "No conversion"
					: session.compatibilityPending
						? `Converting to v${targetVersion} (checking compatibility)`
						: session.compatibilityError != null
							? `Converting to v${targetVersion} (check failed)`
							: `Converting to v${targetVersion}`,
		issues,
		forceSaveIssues: issues.filter((issue) => issue.blocking).map((issue) => issue.message),
		hasIssues: needsTargetVersion || issues.length > 0,
		hasForceSaveValidationIssues:
			session.validationError != null || blockingValidationIssues.length > 0,
		hasForceSaveCompatibilityIssues:
			session.compatibilityError != null || hasBlockingCompatibilityIssues,
		nextStep,
		editionHintLabel,
		isConverting,
	};
}
