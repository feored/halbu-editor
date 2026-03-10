import { getSkillPoints } from "./skillSlots.js";

export function deriveSkillsData(skillsDataset, version, characterClass) {
	if (skillsDataset == null) {
		return [];
	}
	return skillsDataset
		.filter((skillData) => skillData.class == characterClass)
		.map((skillData) => {
			if (Number(version) === 105 && characterClass === "Warlock") {
				return {
					...skillData,
					page: 4 - Number(skillData.page),
				};
			}
			return skillData;
		});
}

export function derivePageIndexes(skillsData) {
	return Array.from(
		new Set(skillsData.map((skill) => Number(skill.page) - 1).filter((page) => page >= 0))
	).sort((a, b) => a - b);
}

export function resolveActivePageIndex(canRenderTrees, pageIndexes, activePageIndex) {
	if (!canRenderTrees || pageIndexes.length === 0) {
		return null;
	}
	if (activePageIndex != null && pageIndexes.includes(activePageIndex)) {
		return activePageIndex;
	}
	return pageIndexes[0];
}

export function resolveSelectedSkillId(canRenderTrees, skillsData, activePageIndex, selectedSkillId) {
	if (!canRenderTrees || skillsData.length === 0 || activePageIndex == null) {
		return null;
	}

	const activePageSkills = skillsData.filter(
		(skill) => Number(skill.page) === Number(activePageIndex) + 1
	);
	if (
		selectedSkillId != null &&
		activePageSkills.some((skill) => Number(skill.id) === Number(selectedSkillId))
	) {
		return selectedSkillId;
	}

	const orderedSkills = [...activePageSkills].sort((left, right) => {
		const rowDelta = Number(left.row) - Number(right.row);
		if (rowDelta !== 0) {
			return rowDelta;
		}
		return Number(left.column) - Number(right.column);
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
	classLabel,
	supportedClasses,
}) {
	const notices = [];
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
			text: `Skills editor is not available for class ${classLabel} in save version ${version}. Supported classes: ${supportedClasses.join(", ")}.`,
		});
	} else if (!hasClassSkills) {
		notices.push({
			level: "warning",
			text: `Skills editor has no data for class ${classLabel} in save version ${version}.`,
		});
	} else if (!skillSlotsReady) {
		notices.push({
			level: "info",
			text: "Preparing skills data...",
		});
	}
	return notices;
}

export function buildSkillState(skillData, options) {
	const {
		saveSkills,
		characterLevel,
		availableSkillPoints,
		getSkillSlot,
	} = options;
	const reqLevel = Number(skillData.reqlevel);
	const levelRequirementMet = characterLevel >= reqLevel;
	const unmetPrerequisites = skillData.reqskills.filter((requiredSkillId) => {
		const requiredSaveId = getSkillSlot(requiredSkillId);
		return requiredSaveId < 0 || getSkillPoints(saveSkills, requiredSaveId) < 1;
	});
	const prerequisitesMet = unmetPrerequisites.length === 0;
	const available = levelRequirementMet && prerequisitesMet;
	const saveId = Number(skillData.saveId);
	const points = getSkillPoints(saveSkills, saveId);
	const canIncrement = points < 255 && available && availableSkillPoints > 0;
	const canDecrement = points > 0;

	let state = "available";
	if (points > 0) {
		state = "invested";
	} else if (!levelRequirementMet) {
		state = "locked-level";
	} else if (!prerequisitesMet) {
		state = "locked-prereq";
	}

	return {
		id: Number(skillData.id),
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

export function buildSkillStatesById(skillsData, options) {
	if (!options.skillSlotsReady) {
		return {};
	}
	const states = {};
	for (const skill of skillsData) {
		states[Number(skill.id)] = buildSkillState(skill, options);
	}
	return states;
}
