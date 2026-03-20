import { getAttributeLabel } from "$lib/editor/editorMetadata";
import actQuests from "$lib/editor/quests/actquests.json";
import { DIFFICULTY_NAMES } from "$lib/types/editor";
import type {
	Act,
	Attribute,
	AttributeMap,
	Difficulty,
	EditorSave,
	QuestFlag,
	QuestId,
	QuestMap,
} from "$lib/types/editor";

export type QuestState = {
	flags: QuestFlag[];
	display: string;
};

export type QuestDisplay = {
	id: QuestId;
	display: string;
	states?: QuestState[];
};

export type ActDisplay = {
	id: Act;
	display: string;
	quests: QuestDisplay[];
};

export type RewardFeedback = {
	kind: "warning" | "info";
	text: string;
};

type RawActDisplay = Omit<ActDisplay, "id"> & { id: Lowercase<Act> };

const actIdByJsonId: Record<Lowercase<Act>, Act> = {
	act1: "Act1",
	act2: "Act2",
	act3: "Act3",
	act4: "Act4",
	act5: "Act5",
};

export const ACTS = (actQuests as RawActDisplay[]).map((act) => ({
	...act,
	id: actIdByJsonId[act.id],
})) as ActDisplay[];

const UNUSED_QUESTS: Record<Act, QuestDisplay[]> = {
	Act1: [],
	Act2: [],
	Act3: [],
	Act4: [
		{ id: "unused_1", display: "Unused Quest 1" },
		{ id: "unused_2", display: "Unused Quest 2" },
		{ id: "unused_3", display: "Unused Quest 3" },
	],
	Act5: [
		{ id: "unused_1", display: "Unused Quest 1" },
		{ id: "unused_2", display: "Unused Quest 2" },
	],
};

const QUEST_REWARDS = [
	{ act: "Act1", quest: "q1", attribute: "newskills", value: 1 },
	{ act: "Act2", quest: "q1", attribute: "newskills", value: 1 },
	{ act: "Act4", quest: "q1", attribute: "newskills", value: 2 },
	{ act: "Act3", quest: "q1", attribute: "statpts", value: 5 },
	{ act: "Act3", quest: "q4", attribute: "maxhp", value: 20 },
	{ act: "Act3", quest: "q4", attribute: "hitpoints", value: 20 },
] as const satisfies ReadonlyArray<{
	act: Act;
	quest: string;
	attribute: Attribute;
	value: number;
}>;

const ATTRIBUTE_SCALE: Partial<Record<Attribute, number>> = {
	hitpoints: 256,
	maxhp: 256,
	mana: 256,
	maxmana: 256,
	stamina: 256,
	maxstamina: 256,
};

function getQuestFlags(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
): QuestFlag[] {
	return quests[difficulty][act][questId].flags;
}

function toStoredValue(attribute: Attribute, value: number): number {
	return value * (ATTRIBUTE_SCALE[attribute] ?? 1);
}

function toDisplayedValue(attribute: Attribute, value: number): number {
	return value / (ATTRIBUTE_SCALE[attribute] ?? 1);
}

function formatSignedValue(value: number): string {
	if (value === 0) {
		return "0";
	}

	const absoluteValue = Math.abs(value);
	const formattedValue = Number.isInteger(absoluteValue)
		? String(absoluteValue)
		: absoluteValue.toFixed(2).replace(/\.?0+$/, "");

	return value > 0 ? `+${formattedValue}` : `-${formattedValue}`;
}

export function getStandardActQuests(act: ActDisplay, showPrologue: boolean): QuestDisplay[] {
	return act.quests.filter((quest) => showPrologue || quest.id !== "prologue");
}

export function getRenderedActQuests(
	act: ActDisplay,
	showPrologue: boolean,
	showAllQuests: boolean,
): QuestDisplay[] {
	const quests = getStandardActQuests(act, showPrologue);

	if (!showAllQuests) {
		return quests;
	}

	return [...quests, ...UNUSED_QUESTS[act.id]];
}

export function countActProgress(
	difficulty: Difficulty,
	act: ActDisplay,
	quests: QuestMap,
	showPrologue: boolean,
): { completed: number; total: number; percent: number } {
	const visibleQuests = getStandardActQuests(act, showPrologue);
	let completed = 0;

	for (const quest of visibleQuests) {
		const flags = getQuestFlags(quests, difficulty, act.id, quest.id);
		if (
			flags.includes("RewardGranted") ||
			flags.includes("CompletedNow") ||
			flags.includes("CompletedBefore") ||
			flags.includes("PrimaryGoalDone")
		) {
			completed += 1;
		}
	}

	return {
		completed,
		total: visibleQuests.length,
		percent:
			visibleQuests.length > 0
				? Math.round((completed / visibleQuests.length) * 100)
				: 0,
	};
}

export function getQuestFlagsForBulkToggle(
	quest: QuestDisplay,
	advancedFlags: boolean,
	questFlags: ReadonlyArray<{ id: QuestFlag }>,
): QuestFlag[] {
	if (advancedFlags) {
		return questFlags.map((flag) => flag.id);
	}

	const flags = new Set<QuestFlag>();
	for (const state of quest.states ?? []) {
		for (const flag of state.flags) {
			flags.add(flag);
		}
	}

	return [...flags];
}

export function hasQuestFlag(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	flag: QuestFlag,
): boolean {
	return getQuestFlags(quests, difficulty, act, questId).includes(flag);
}

export function addQuestFlag(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	flag: QuestFlag,
): boolean {
	const flags = getQuestFlags(quests, difficulty, act, questId);
	if (flags.includes(flag)) {
		return false;
	}

	quests[difficulty][act][questId].flags = [flag, ...flags];
	return true;
}

export function removeQuestFlag(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	flag: QuestFlag,
): boolean {
	const flags = getQuestFlags(quests, difficulty, act, questId);
	if (!flags.includes(flag)) {
		return false;
	}

	quests[difficulty][act][questId].flags = flags.filter((current) => current !== flag);
	return true;
}

export function isQuestStatePresent(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	state: QuestState,
): boolean {
	const flags = getQuestFlags(quests, difficulty, act, questId);
	return state.flags.every((flag) => flags.includes(flag));
}

export function isQuestStatePartial(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	state: QuestState,
): boolean {
	const flags = getQuestFlags(quests, difficulty, act, questId);
	let present = 0;

	for (const flag of state.flags) {
		if (flags.includes(flag)) {
			present += 1;
		}
	}

	return present > 0 && present < state.flags.length;
}

export function toggleQuestState(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	state: QuestState,
): void {
	if (isQuestStatePresent(quests, difficulty, act, questId, state)) {
		for (const flag of state.flags) {
			removeQuestFlag(quests, difficulty, act, questId, flag);
		}
		return;
	}

	for (const flag of state.flags) {
		addQuestFlag(quests, difficulty, act, questId, flag);
	}
}

export function setAllActQuestFlags(
	quests: QuestMap,
	difficulty: Difficulty,
	act: ActDisplay,
	showPrologue: boolean,
	advancedFlags: boolean,
	showAllQuests: boolean,
	questFlags: ReadonlyArray<{ id: QuestFlag }>,
	value: boolean,
): void {
	const visibleQuests = advancedFlags
		? getRenderedActQuests(act, showPrologue, showAllQuests)
		: getStandardActQuests(act, showPrologue);

	for (const quest of visibleQuests) {
		for (const flag of getQuestFlagsForBulkToggle(quest, advancedFlags, questFlags)) {
			if (value) {
				addQuestFlag(quests, difficulty, act.id, quest.id, flag);
			} else {
				removeQuestFlag(quests, difficulty, act.id, quest.id, flag);
			}
		}
	}
}

export function setAllQuestFlagsCompleted(quests: QuestMap): void {
	for (const difficulty of DIFFICULTY_NAMES) {
		for (const act of ACTS) {
			for (const quest of getStandardActQuests(act, true)) {
				for (const flag of getQuestFlagsForBulkToggle(quest, false, [])) {
					addQuestFlag(quests, difficulty, act.id, quest.id, flag);
				}
			}
		}
	}
}

export function applyQuestRewards(
	attributes: AttributeMap,
	act: Act,
	questId: QuestId,
	add: boolean,
): RewardFeedback | null {
	const rewards = QUEST_REWARDS.filter((reward) => reward.act === act && reward.quest === questId);
	if (rewards.length < 1) {
		return null;
	}

	let clamped = false;
	const changes: string[] = [];
	const limitedChanges: string[] = [];

	for (const reward of rewards) {
		const attribute = attributes[reward.attribute];
		const previousValue = attribute.value;
		const maxValue = 2 ** attribute.bitLength - 1;
		const change = toStoredValue(reward.attribute, reward.value);
		const targetValue = add ? previousValue + change : previousValue - change;
		const nextValue = Math.max(0, Math.min(targetValue, maxValue));
		const actualChange = nextValue - previousValue;
		const expectedChange = add ? change : -change;
		const label = getAttributeLabel(reward.attribute);
		const displayedChange = formatSignedValue(
			toDisplayedValue(reward.attribute, actualChange),
		);

		attribute.value = nextValue;

		if (actualChange !== 0) {
			changes.push(`${displayedChange} ${label}`);
		}

		if (actualChange !== expectedChange) {
			clamped = true;
			limitedChanges.push(`${displayedChange} ${label} (at limit)`);
		}
	}

	if (!clamped) {
		return {
			kind: "info",
			text: `${add ? "Reward applied:" : "Reward removed:"} ${
				changes.length > 0 ? changes.join(", ") : "no stat change."
			}`,
		};
	}

	return {
		kind: "warning",
		text: add
			? `Reward was only partially applied because this stat reached its limit.${
					limitedChanges.length > 0 ? ` Applied: ${limitedChanges.join(", ")}.` : ""
				}`
			: `Reward was only partially removed because this stat is already at its minimum.${
					limitedChanges.length > 0 ? ` Removed: ${limitedChanges.join(", ")}.` : ""
				}`,
	};
}

export function applyRewardGrantedChange(
	save: EditorSave,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	flag: QuestFlag,
	add: boolean,
): RewardFeedback | null {
	if (flag !== "RewardGranted") {
		return null;
	}

	return applyQuestRewards(save.attributes, act, questId, add);
}
