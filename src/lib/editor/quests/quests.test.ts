import { describe, expect, test } from "vitest";

import { getClassBaseAttributes, getGameRules } from "$lib/editor/character/gameRules";
import { createEmptySkillSlots } from "$lib/editor/skills/skillsSlots";
import { ACT_NAMES, DIFFICULTY_NAMES } from "$lib/types/editor";
import { applyQuestRewards, isQuestStatePartial } from "$lib/editor/quests/quests";

import type {
	Act,
	Attribute,
	AttributeMap,
	Difficulty,
	EditorSave,
	QuestId,
	QuestMap,
	WaypointMap,
} from "$lib/types/editor";
import type { QuestState } from "$lib/editor/quests/quests";

const QUEST_IDS: QuestId[] = [
	"prologue",
	"q1",
	"q2",
	"q3",
	"q4",
	"q5",
	"q6",
	"completion",
	"unused_1",
	"unused_2",
	"unused_3",
];

function makeAttribute(
	id: number,
	name: Attribute,
	bitLength: number,
	value: number,
): AttributeMap[Attribute] {
	return {
		id,
		name,
		bitLength,
		value,
	};
}

function makeAttributes(): AttributeMap {
	const base = getClassBaseAttributes("Amazon")!;

	return {
		statpts: makeAttribute(0, "statpts", 10, 0),
		newskills: makeAttribute(1, "newskills", 8, 0),
		experience: makeAttribute(2, "experience", 32, 0),
		level: makeAttribute(3, "level", 7, 1),
		gold: makeAttribute(4, "gold", 25, 0),
		goldbank: makeAttribute(5, "goldbank", 25, 0),
		strength: makeAttribute(6, "strength", 10, base.strength),
		dexterity: makeAttribute(7, "dexterity", 10, base.dexterity),
		vitality: makeAttribute(8, "vitality", 10, base.vitality),
		energy: makeAttribute(9, "energy", 10, base.energy),
		hitpoints: makeAttribute(10, "hitpoints", 21, 50 * 256),
		maxhp: makeAttribute(11, "maxhp", 21, 50 * 256),
		mana: makeAttribute(12, "mana", 21, 30 * 256),
		maxmana: makeAttribute(13, "maxmana", 21, 30 * 256),
		stamina: makeAttribute(14, "stamina", 21, 40 * 256),
		maxstamina: makeAttribute(15, "maxstamina", 21, 40 * 256),
	};
}

function makeQuestMap(): QuestMap {
	const quests = {} as QuestMap;

	for (const difficulty of DIFFICULTY_NAMES) {
		quests[difficulty] = {} as QuestMap[Difficulty];

		for (const act of ACT_NAMES) {
			quests[difficulty][act] = {} as QuestMap[Difficulty][Act];

			for (const questId of QUEST_IDS) {
				quests[difficulty][act][questId] = { flags: [] };
			}
		}
	}

	return quests;
}

function makeWaypoints(): WaypointMap {
	const waypoints = {} as WaypointMap;

	for (const difficulty of DIFFICULTY_NAMES) {
		waypoints[difficulty] = {} as WaypointMap[Difficulty];

		for (const act of ACT_NAMES) {
			waypoints[difficulty][act] = {
				act,
				waypoints: [],
			};
		}
	}

	return waypoints;
}

function makeSave(): EditorSave {
	return {
		version: 105,
		expansionType: "Expansion",
		character: {
			name: "Test",
			className: "Amazon",
			level: 1,
			progression: 0,
			act: "Act1",
			difficulty: "Normal",
			mapSeed: 0,
			lastPlayed: 0,
			status: {
				hardcore: false,
				ladder: false,
				died: false,
				expansion: true,
			},
			mercenary: {
				id: 0,
				isDead: false,
				variantId: 0,
				experience: 0,
				nameId: 0,
			},
		},
		quests: makeQuestMap(),
		waypoints: makeWaypoints(),
		npcs: { data: [] },
		attributes: makeAttributes(),
		skills: createEmptySkillSlots(),
		items: { data: [] },
		metadata: {
			formatId: "V105",
		},
	};
}

describe("quests", () => {
	test("applies and removes Den of Evil skill reward", () => {
		const attributes = makeAttributes();

		const added = applyQuestRewards(attributes, "Act1", "q1", true);
		expect(attributes.newskills.value).toBe(1);
		expect(added).toMatchObject({
			kind: "info",
		});

		const removed = applyQuestRewards(attributes, "Act1", "q1", false);
		expect(attributes.newskills.value).toBe(0);
		expect(removed).toMatchObject({
			kind: "info",
		});
	});

	test("applies Golden Bird life reward in q8 storage units", () => {
		const attributes = makeAttributes();

		applyQuestRewards(attributes, "Act3", "q4", true);

		expect(attributes.maxhp.value).toBe(70 * 256);
		expect(attributes.hitpoints.value).toBe(70 * 256);
	});

	test("clamps quest rewards using the attribute bit length", () => {
		const attributes = makeAttributes();
		attributes.newskills.bitLength = 1;

		const feedback = applyQuestRewards(attributes, "Act4", "q1", true);

		expect(attributes.newskills.value).toBe(1);
		expect(feedback).toMatchObject({
			kind: "warning",
		});
	});

	test("detects partial quest states", () => {
		const quests = makeQuestMap();
		const state: QuestState = {
			display: "Completed",
			flags: ["RewardGranted", "UpdateQuestLog"],
		};

		expect(isQuestStatePartial(quests, "Normal", "Act1", "q1", state)).toBe(false);

		quests.Normal.Act1.q1.flags = ["RewardGranted"];
		expect(isQuestStatePartial(quests, "Normal", "Act1", "q1", state)).toBe(true);

		quests.Normal.Act1.q1.flags = ["RewardGranted", "UpdateQuestLog"];
		expect(isQuestStatePartial(quests, "Normal", "Act1", "q1", state)).toBe(false);
	});

	test("game rules include quest reward deltas from the baseline save", () => {
		const baselineSave = makeSave();
		const save = structuredClone(baselineSave);

		save.quests.Normal.Act1.q1.flags = ["RewardGranted"];
		save.quests.Normal.Act3.q4.flags = ["RewardGranted"];

		const rules = getGameRules(save, baselineSave);

		expect(rules.values.newskills).toBe(baselineSave.attributes.newskills.value + 1);
		expect(rules.values.maxhp).toBe(baselineSave.attributes.maxhp.value + 20 * 256);
		expect(rules.values.hitpoints).toBe(rules.values.maxhp);
	});
});
