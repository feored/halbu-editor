import { clampByte } from "../../utils/numbers.js";
import type { SkillSlot } from "../../types/editor";

export const DEFAULT_SKILL_SLOT_COUNT = 30;

export function resolveSkillSlotCount(slotCount: number): number {
	if (!Number.isInteger(slotCount) || slotCount < 1) {
		throw new Error(`Invalid skill slot count: ${slotCount}.`);
	}
	return slotCount;
}

export function clampSkillPoints(value: number): number {
	return clampByte(value);
}

export function createEmptySkillSlots(slotCount = DEFAULT_SKILL_SLOT_COUNT): SkillSlot[] {
	const safeSlotCount = resolveSkillSlotCount(slotCount);
	return Array.from({ length: safeSlotCount }, (_, index) => ({
		id: index,
		points: 0,
	}));
}

export function resizeSkillSlots(
	skills: readonly SkillSlot[],
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): SkillSlot[] {
	const safeSlotCount = resolveSkillSlotCount(slotCount);
	const resized = createEmptySkillSlots(safeSlotCount);

	const copyCount = Math.min(skills.length, safeSlotCount);
	for (let index = 0; index < copyCount; index += 1) {
		resized[index] = {
			id: index,
			points: clampSkillPoints(skills[index].points),
		};
	}
	return resized;
}

export function getSkillPoints(skills: readonly SkillSlot[], slotIndex: number): number {
	if (slotIndex < 0 || slotIndex >= skills.length) {
		throw new Error(`Invalid skill slot index: ${slotIndex}.`);
	}
	return clampSkillPoints(skills[slotIndex].points);
}

export function withSkillPoints(
	skills: readonly SkillSlot[],
	slotIndex: number,
	nextPoints: number,
): SkillSlot[] {
	if (slotIndex < 0 || slotIndex >= skills.length) {
		throw new Error(`Invalid skill slot index: ${slotIndex}.`);
	}
	const clampedPoints = clampSkillPoints(nextPoints);
	if (getSkillPoints(skills, slotIndex) === clampedPoints) {
		return skills as SkillSlot[];
	}
	const updated = [...skills] as SkillSlot[];
	updated[slotIndex] = {
		id: slotIndex,
		points: clampedPoints,
	};
	return updated;
}

export function withAddedSkillPoints(
	skills: readonly SkillSlot[],
	slotIndex: number,
	delta: number,
): SkillSlot[] {
	const current = getSkillPoints(skills, slotIndex);
	return withSkillPoints(skills, slotIndex, current + delta);
}

export function withAllSkillPointsRefunded(skills: readonly SkillSlot[]): {
	skills: SkillSlot[];
	refundedPoints: number;
} {
	let refundedPoints = 0;
	for (let index = 0; index < skills.length; index += 1) {
		refundedPoints += getSkillPoints(skills, index);
	}
	if (refundedPoints < 1) {
		return {
			skills: skills as SkillSlot[],
			refundedPoints,
		};
	}
	return {
		skills: resizeSkillSlots([], skills.length),
		refundedPoints,
	};
}
