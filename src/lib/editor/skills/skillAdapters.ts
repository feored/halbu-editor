import {
	DEFAULT_SKILL_SLOT_COUNT,
	createEmptySkillSlots,
	resolveSkillSlotCount,
	resizeSkillSlots,
} from "./skillSlots";
import type { BackendSkillPoints, SkillSlot } from "../../types/editor";

export function backendSkillsToEditorSkills(
	backendSkills: BackendSkillPoints,
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): SkillSlot[] {
	const safeSlotCount = resolveSkillSlotCount(slotCount);
	if (backendSkills.points.length !== safeSlotCount) {
		throw new Error(
			`Invalid save.skills.points length: expected ${safeSlotCount}, found ${backendSkills.points.length}.`,
		);
	}
	const normalized = createEmptySkillSlots(safeSlotCount);
	for (let index = 0; index < safeSlotCount; index += 1) {
		normalized[index].points = backendSkills.points[index];
	}
	return normalized;
}

export function adaptSkillsPayloadToEditorSkills(
	backendSkills: BackendSkillPoints,
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): SkillSlot[] {
	return backendSkillsToEditorSkills(backendSkills, slotCount);
}

export function editorSkillsToBackendSkills(
	editorSkills: readonly SkillSlot[],
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): BackendSkillPoints {
	const normalizedSkills = resizeSkillSlots(editorSkills, slotCount);
	const points = normalizedSkills.map((skill) => skill.points);
	return { points };
}
