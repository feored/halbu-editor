import type { SkillSlot } from "../../types/editor";
import type { SkillData } from "./skillTypes";

export type PageNotice = {
	level: "warning" | "info";
	text: string;
};

export type BuildPageNoticesOptions = {
	skillsContextError: string;
	hasKnownVersionSkills: boolean;
	hasBackendClassSupport: boolean;
	hasClassSkills: boolean;
	skillSlotsReady: boolean;
	version: number;
	className: string;
	supportedClasses: string[];
};

export function getSkillsData(
	skillsDataset: readonly SkillData[] | null,
	version: number,
	characterClass: string,
): SkillData[] {
	if (skillsDataset == null) {
		return [];
	}
	return skillsDataset
		.filter((skillData) => skillData.class === characterClass)
		.map((skillData) => {
			if (version === 105 && characterClass === "Warlock") {
				return {
					...skillData,
					page: 4 - skillData.page,
				};
			}
			return skillData;
		});
}

export function getPageIndexes(skillsData: readonly SkillData[]): number[] {
	return Array.from(
		new Set(skillsData.map((skill) => skill.page - 1).filter((page) => page >= 0)),
	).sort((left, right) => left - right);
}

export function getActivePageIndex(
	canRenderTrees: boolean,
	pageIndexes: readonly number[],
	activePageIndex: number | null,
): number | null {
	if (!canRenderTrees || pageIndexes.length === 0) {
		return null;
	}
	if (activePageIndex != null && pageIndexes.includes(activePageIndex)) {
		return activePageIndex;
	}
	return pageIndexes[0];
}

export function getSelectedSkillId(
	canRenderTrees: boolean,
	skillsData: readonly SkillData[],
	activePageIndex: number | null,
	selectedSkillId: number | null,
): number | null {
	if (!canRenderTrees || skillsData.length === 0 || activePageIndex == null) {
		return null;
	}

	const activePageSkills = skillsData.filter(
		(skill) => skill.page === activePageIndex + 1,
	);
	if (
		selectedSkillId != null &&
		activePageSkills.some((skill) => skill.id === selectedSkillId)
	) {
		return selectedSkillId;
	}

	const orderedSkills = [...activePageSkills].sort((left, right) => {
		const rowDelta = left.row - right.row;
		if (rowDelta !== 0) {
			return rowDelta;
		}
		return left.column - right.column;
	});
	return orderedSkills.length > 0 ? orderedSkills[0].id : null;
}

export function buildPageNotices({
	skillsContextError,
	hasKnownVersionSkills,
	hasBackendClassSupport,
	hasClassSkills,
	skillSlotsReady,
	version,
	className,
	supportedClasses,
}: BuildPageNoticesOptions): PageNotice[] {
	const notices: PageNotice[] = [];
	if (skillsContextError.length > 0) {
		notices.push({
			level: "warning",
			text: `Failed to load skills context: ${skillsContextError}`,
		});
	}
	if (!hasKnownVersionSkills) {
		notices.push({
			level: "warning",
			text: `Skills editor is not available for unsupported save version ${version}.`,
		});
	} else if (!hasBackendClassSupport) {
		notices.push({
			level: "warning",
			text: `Skills editor is not available for class ${className} in save version ${version}. Supported classes: ${supportedClasses.join(", ")}.`,
		});
	} else if (!hasClassSkills) {
		notices.push({
			level: "warning",
			text: `Skills editor has no data for class ${className} in save version ${version}.`,
		});
	} else if (!skillSlotsReady) {
		notices.push({
			level: "info",
			text: "Preparing skills data...",
		});
	}
	return notices;
}

export type SkillState = {
	id: number;
	saveId: number;
	points: number;
	available: boolean;
	levelRequirementMet: boolean;
	prerequisitesMet: boolean;
	state: "available" | "invested" | "locked-level" | "locked-prereq";
	canIncrement: boolean;
	canDecrement: boolean;
};

export type BuildSkillStateOptions = {
	saveSkills: readonly SkillSlot[];
	characterLevel: number;
	availableSkillPoints: number;
	getSkillSlot: (skillId: number) => number;
	skillSlotsReady?: boolean;
};

export function buildSkillState(
	skillData: SkillData,
	options: BuildSkillStateOptions,
): SkillState {
	const { saveSkills, characterLevel, availableSkillPoints, getSkillSlot } = options;
	const reqLevel = skillData.reqlevel;
	const levelRequirementMet = characterLevel >= reqLevel;
	const unmetPrerequisites = skillData.reqskills.filter((requiredSkillId) => {
		const requiredSaveId = getSkillSlot(requiredSkillId);
		return requiredSaveId < 0 || saveSkills[requiredSaveId].points < 1;
	});
	const prerequisitesMet = unmetPrerequisites.length === 0;
	const available = levelRequirementMet && prerequisitesMet;
	const saveId = skillData.saveId;
	const points = saveSkills[saveId].points;
	const canIncrement = points < 255 && available && availableSkillPoints > 0;
	const canDecrement = points > 0;

	let state: SkillState["state"] = "available";
	if (points > 0) {
		state = "invested";
	} else if (!levelRequirementMet) {
		state = "locked-level";
	} else if (!prerequisitesMet) {
		state = "locked-prereq";
	}

	return {
		id: skillData.id,
		saveId,
		points,
		available,
		levelRequirementMet,
		prerequisitesMet,
		state,
		canIncrement,
		canDecrement,
	};
}

export function buildSkillStatesById(
	skillsData: readonly SkillData[],
	options: BuildSkillStateOptions,
): Record<number, SkillState> {
	if (!options.skillSlotsReady) {
		return {};
	}
	const states: Record<number, SkillState> = {};
	for (const skill of skillsData) {
		states[skill.id] = buildSkillState(skill, options);
	}
	return states;
}
