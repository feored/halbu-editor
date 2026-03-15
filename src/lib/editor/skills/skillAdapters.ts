import {
	DEFAULT_SKILL_SLOT_COUNT,
	resizeSkillSlots,
} from "./skillSlots";
import type { BackendSkillPoints, SkillSlot } from "../../types/editor";

export function toEditorSkills(
	backendSkills: BackendSkillPoints,
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): SkillSlot[] {
	if (backendSkills.points.length !== slotCount) {
		throw new Error(
			`Invalid save.skills.points length: expected ${slotCount}, found ${backendSkills.points.length}.`,
		);
	}
	return backendSkills.points.map((points, index) => ({
		id: index,
		points,
	}));
}

export function toBackendSkills(
	editorSkills: readonly SkillSlot[],
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): BackendSkillPoints {
	const normalizedSkills = resizeSkillSlots(editorSkills, slotCount);
	const points = normalizedSkills.map((skill) => skill.points);
	return { points };
}
