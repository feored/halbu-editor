import { addSkillPoints, clampSkillPoints, refundAllSkillPoints } from "$lib/editor/skills/skillsSlots";
import type { SkillState } from "$lib/editor/skills/skillsState";
import type { SkillSlot } from "$lib/types/skills";

type SkillSaveMutations = {
	skills: SkillSlot[];
	attributes: {
		newskills: {
			value: number;
		};
	};
};

type ApplySkillPointDeltaOptions = {
	save: SkillSaveMutations;
	skillSlot: number;
	delta: number;
	skillState: SkillState | null | undefined;
	availableSkillPoints: number;
	isGameRulesMode: boolean;
};

type ApplySkillPointsTargetOptions = {
	save: SkillSaveMutations;
	skillSlot: number;
	nextPoints: number;
	currentPoints: number;
	skillState: SkillState | null | undefined;
	availableSkillPoints: number;
	isGameRulesMode: boolean;
};

export function applySkillPointDelta({
	save,
	skillSlot,
	delta,
	skillState,
	availableSkillPoints,
	isGameRulesMode,
}: ApplySkillPointDeltaOptions): void {
	if (skillSlot < 0 || delta === 0 || skillState == null) {
		return;
	}

	if (delta > 0) {
		if (!skillState.available || availableSkillPoints < delta) {
			return;
		}
		const nextSkills = addSkillPoints(save.skills, skillSlot, delta);
		if (nextSkills !== save.skills) {
			if (!isGameRulesMode) {
				save.attributes.newskills.value -= delta;
			}
			save.skills = nextSkills;
		}
		return;
	}

	const pointsToRefund = Math.abs(delta);
	if (skillState.points < pointsToRefund) {
		return;
	}
	const nextSkills = addSkillPoints(save.skills, skillSlot, delta);
	if (nextSkills !== save.skills) {
		if (!isGameRulesMode) {
			save.attributes.newskills.value += pointsToRefund;
		}
		save.skills = nextSkills;
	}
}

export function refundAllSkillPointsInSave(
	save: SkillSaveMutations,
	isGameRulesMode: boolean,
): void {
	const { skills: nextSkills, refundedPoints } = refundAllSkillPoints(save.skills);
	if (refundedPoints < 1) {
		return;
	}
	if (!isGameRulesMode) {
		save.attributes.newskills.value += refundedPoints;
	}
	save.skills = nextSkills;
}

export function setRawModePointsLeft(
	save: SkillSaveMutations,
	isGameRulesMode: boolean,
	nextPoints: number,
): void {
	if (isGameRulesMode) {
		return;
	}
	save.attributes.newskills.value = clampSkillPoints(nextPoints);
}

export function applySkillPointsTarget({
	save,
	skillSlot,
	nextPoints,
	currentPoints,
	skillState,
	availableSkillPoints,
	isGameRulesMode,
}: ApplySkillPointsTargetOptions): void {
	const clampedPoints = clampSkillPoints(nextPoints);
	const delta = clampedPoints - currentPoints;
	if (delta === 0) {
		return;
	}

	applySkillPointDelta({
		save,
		skillSlot,
		delta,
		skillState,
		availableSkillPoints,
		isGameRulesMode,
	});
}
