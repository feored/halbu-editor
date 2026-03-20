import { clampInteger } from "$lib/utils/numbers";
import type { SkillSlot } from "$lib/types/editor";

export const DEFAULT_SKILL_SLOT_COUNT = 30;

export function clampSkillPoints(value: number): number {
	return clampInteger(value, 0, 255);
}

export function createEmptySkillSlots(slotCount = DEFAULT_SKILL_SLOT_COUNT): SkillSlot[] {
	return Array.from({ length: slotCount }, (_, index) => ({
		id: index,
		points: 0,
	}));
}

export function resizeSkillSlots(
	skills: readonly SkillSlot[],
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): SkillSlot[] {
	const resized = createEmptySkillSlots(slotCount);

	const copyCount = Math.min(skills.length, slotCount);
	for (let index = 0; index < copyCount; index += 1) {
		resized[index] = {
			id: index,
			points: skills[index].points,
		};
	}
	return resized;
}

export function setSkillPoints(
	skills: SkillSlot[],
	slotIndex: number,
	nextPoints: number,
): SkillSlot[] {
	const clampedPoints = clampSkillPoints(nextPoints);
	if (skills[slotIndex].points === clampedPoints) {
		return skills;
	}
	const updated = [...skills];
	updated[slotIndex] = {
		id: slotIndex,
		points: clampedPoints,
	};
	return updated;
}

export function addSkillPoints(
	skills: SkillSlot[],
	slotIndex: number,
	delta: number,
): SkillSlot[] {
	const current = skills[slotIndex].points;
	return setSkillPoints(skills, slotIndex, current + delta);
}

export function refundAllSkillPoints(skills: SkillSlot[]): {
	skills: SkillSlot[];
	refundedPoints: number;
} {
	let refundedPoints = 0;
	for (let index = 0; index < skills.length; index += 1) {
		refundedPoints += skills[index].points;
	}
	if (refundedPoints < 1) {
		return {
			skills,
			refundedPoints,
		};
	}
	return {
		skills: createEmptySkillSlots(skills.length),
		refundedPoints,
	};
}
