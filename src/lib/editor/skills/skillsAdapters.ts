import { DEFAULT_SKILL_SLOT_COUNT, resizeSkillSlots } from "$lib/editor/skills/skillsSlots";
import type { BackendSkillPointList } from "$lib/types/backend";
import type { SkillSlot } from "$lib/types/skills";

export function toEditorSkills(
	backendSkills: BackendSkillPointList,
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
): BackendSkillPointList {
	const normalizedSkills = resizeSkillSlots(editorSkills, slotCount);
	return {
		points: normalizedSkills.map((skill) => skill.points),
	};
}
