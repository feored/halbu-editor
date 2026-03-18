import { DEFAULT_SKILL_SLOT_COUNT } from "$lib/editor/skills/skillsSlots";
import type { BackendSkillPointList } from "$lib/types/backend";
import type { SkillSlot } from "$lib/types/editor";

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
