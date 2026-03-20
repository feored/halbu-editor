import type { SkillSlot } from "$lib/types/editor";
import type { SkillData } from "$lib/editor/skills/skillsTypes";

export type PageNotice = {
	level: "warning" | "info";
	text: string;
};

export function getSkillsData(
	skillsDataset: readonly SkillData[] | null,
	version: number,
	className: string,
): SkillData[] {
	if (skillsDataset == null) {
		return [];
	}

	return skillsDataset.filter((skill) => skill.class === className).map((skill) => {
		if (version === 105 && className === "Warlock") {
			return {
				...skill,
				page: 4 - skill.page,
			};
		}

		return skill;
	});
}

export function getPageIndexes(skillsData: readonly SkillData[]): number[] {
	return [...new Set(skillsData.map((skill) => skill.page - 1).filter((page) => page >= 0))]
		.sort((left, right) => left - right);
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

	const pageSkills = skillsData.filter((skill) => skill.page === activePageIndex + 1);
	if (selectedSkillId != null && pageSkills.some((skill) => skill.id === selectedSkillId)) {
		return selectedSkillId;
	}

	const orderedSkills = [...pageSkills].sort((left, right) => {
		const rowDelta = left.row - right.row;
		if (rowDelta !== 0) {
			return rowDelta;
		}

		return left.column - right.column;
	});

	return orderedSkills[0]?.id ?? null;
}

export function getPageNotices(
	hasKnownVersionSkills: boolean,
	hasBackendClassSupport: boolean,
	hasClassSkills: boolean,
	skillSlotsReady: boolean,
	version: number,
	className: string,
	supportedClasses: readonly string[],
): PageNotice[] {
	if (!hasKnownVersionSkills) {
		return [
			{
				level: "warning",
				text: `Skills editor is not available for unsupported save version ${version}.`,
			},
		];
	}

	if (!hasBackendClassSupport) {
		return [
			{
				level: "warning",
				text: `Skills editor is not available for class ${className} in save version ${version}. Supported classes: ${supportedClasses.join(", ")}.`,
			},
		];
	}

	if (!hasClassSkills) {
		return [
			{
				level: "warning",
				text: `Skills editor has no data for class ${className} in save version ${version}.`,
			},
		];
	}

	if (!skillSlotsReady) {
		return [{ level: "info", text: "Preparing skills data..." }];
	}

	return [];
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

export type SkillPrerequisite = {
	id: number;
	name: string;
	met: boolean;
};

function getSkillState(
	skill: SkillData,
	saveSkills: readonly SkillSlot[],
	characterLevel: number,
	availableSkillPoints: number,
	isGameRulesMode: boolean,
	getSkillSlot: (skillId: number) => number,
): SkillState {
	const levelRequirementMet = characterLevel >= skill.reqlevel;
	const prerequisitesMet = skill.reqskills.every((requiredSkillId) => {
		const slot = getSkillSlot(requiredSkillId);
		return slot >= 0 && saveSkills[slot].points > 0;
	});
	const available = levelRequirementMet && prerequisitesMet;
	const points = saveSkills[skill.saveId].points;

	let state: SkillState["state"] = "available";
	if (points > 0) {
		state = "invested";
	} else if (!levelRequirementMet) {
		state = "locked-level";
	} else if (!prerequisitesMet) {
		state = "locked-prereq";
	}

	return {
		id: skill.id,
		saveId: skill.saveId,
		points,
		available,
		levelRequirementMet,
		prerequisitesMet,
		state,
		canIncrement:
			points < 255 && available && (!isGameRulesMode || availableSkillPoints > 0),
		canDecrement: points > 0,
	};
}

export function getSkillStates(
	skillsData: readonly SkillData[],
	saveSkills: readonly SkillSlot[],
	characterLevel: number,
	availableSkillPoints: number,
	isGameRulesMode: boolean,
	getSkillSlot: (skillId: number) => number,
	skillSlotsReady: boolean,
): Record<number, SkillState> {
	if (!skillSlotsReady) {
		return {};
	}

	const states: Record<number, SkillState> = {};
	for (const skill of skillsData) {
		states[skill.id] = getSkillState(
			skill,
			saveSkills,
			characterLevel,
			availableSkillPoints,
			isGameRulesMode,
			getSkillSlot,
		);
	}

	return states;
}
