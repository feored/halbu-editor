import { describe, expect, test } from "vitest";

import { getSkillStates } from "$lib/editor/skills/skillsState";
import { MAX_SKILL_POINTS } from "$lib/editor/skills/skillsSlots";

import type { SkillSlot } from "$lib/types/editor";
import type { SkillData } from "$lib/editor/skills/skillsTypes";

const skillsData: SkillData[] = [
	{
		id: 0,
		skilldesc: "base",
		class: "Amazon",
		reqlevel: 1,
		reqskills: [],
		saveId: 0,
		name: "Base Skill",
		description: "",
		desclines: [],
		dsc2lines: [],
		dsc3lines: [],
		column: 0,
		row: 0,
		page: 1,
	},
	{
		id: 1,
		skilldesc: "advanced",
		class: "Amazon",
		reqlevel: 6,
		reqskills: [0],
		saveId: 1,
		name: "Advanced Skill",
		description: "",
		desclines: [],
		dsc2lines: [],
		dsc3lines: [],
		column: 1,
		row: 0,
		page: 1,
	},
];

function getStates(
	saveSkills: SkillSlot[],
	level: number,
	pointsLeft: number,
	isGameRulesMode: boolean,
) {
	return getSkillStates(
		skillsData,
		saveSkills,
		level,
		pointsLeft,
		isGameRulesMode,
		(skillId) => skillId,
		true,
	);
}

describe("skillsState", () => {
	test("shows the level requirement when a skill is too high level", () => {
		const states = getStates(
			[
				{ id: 0, points: 1 },
				{ id: 1, points: 0 },
			],
			5,
			1,
			true,
		);

		expect(states[1].canIncrement).toBe(false);
		expect(states[1].incrementReason).toBe("Requires Level 6");
	});

	test("shows the prerequisite reason when a required skill is missing", () => {
		const states = getStates(
			[
				{ id: 0, points: 0 },
				{ id: 1, points: 0 },
			],
			10,
			1,
			true,
		);

		expect(states[1].canIncrement).toBe(false);
		expect(states[1].incrementReason).toBe("Requires prerequisite skills");
	});

	test("shows that no skill points are available in game rules mode", () => {
		const states = getStates(
			[
				{ id: 0, points: 0 },
				{ id: 1, points: 0 },
			],
			10,
			0,
			true,
		);

		expect(states[0].canIncrement).toBe(false);
		expect(states[0].incrementReason).toBe("No skill points available");
	});

	test("shows when a skill is already at maximum", () => {
		const states = getStates(
			[
				{ id: 0, points: MAX_SKILL_POINTS },
				{ id: 1, points: 0 },
			],
			10,
			5,
			true,
		);

		expect(states[0].canIncrement).toBe(false);
		expect(states[0].incrementReason).toBe("Already at maximum");
	});

	test("leaves the reason empty when a skill can be incremented", () => {
		const states = getStates(
			[
				{ id: 0, points: 1 },
				{ id: 1, points: 0 },
			],
			10,
			1,
			true,
		);

		expect(states[0].canIncrement).toBe(true);
		expect(states[0].incrementReason).toBeNull();
	});
});
