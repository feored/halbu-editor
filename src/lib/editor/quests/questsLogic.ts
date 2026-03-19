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
import { getAttributeLabel } from "$lib/editor/editorMetadata";

export type QuestPreset = {
	flags: QuestFlag[];
	display: string;
};

export type QuestDisplay = {
	id: QuestId;
	display: string;
	states?: QuestPreset[];
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

const QUEST_ACTS = (actQuests as RawActDisplay[]).map((act) => ({
	...act,
	id: {
		act1: "Act1",
		act2: "Act2",
		act3: "Act3",
		act4: "Act4",
		act5: "Act5",
	}[act.id],
})) as ActDisplay[];

const EMPTY_UNUSED_ACT_QUESTS: Record<Act, QuestDisplay[]> = {
	Act1: [],
	Act2: [],
	Act3: [],
	Act4: [],
	Act5: [],
};

const EMPTY_QUEST_FLAGS: readonly { id: QuestFlag }[] = [];

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

const ATTRIBUTE_STORAGE_SCALE: Partial<Record<Attribute, number>> = {
	hitpoints: 256,
	maxhp: 256,
	mana: 256,
	maxmana: 256,
	stamina: 256,
	maxstamina: 256,
};

function getAttributeStorageScale(attribute: Attribute): number {
	return ATTRIBUTE_STORAGE_SCALE[attribute] ?? 1;
}

function toStoredRewardValue(attribute: Attribute, gameValue: number): number {
	return gameValue * getAttributeStorageScale(attribute);
}

function toDisplayedRewardDelta(attribute: Attribute, storedDelta: number): number {
	return storedDelta / getAttributeStorageScale(attribute);
}

function formatSignedDelta(value: number): string {
	if (value === 0) {
		return "0";
	}

	const absoluteValue = Math.abs(value);
	const formattedAbsoluteValue = Number.isInteger(absoluteValue)
		? String(absoluteValue)
		: absoluteValue.toFixed(2).replace(/\.?0+$/, "");

	return value > 0 ? `+${formattedAbsoluteValue}` : `-${formattedAbsoluteValue}`;
}

function getQuestFlags(quests: QuestMap, difficulty: Difficulty, act: Act, questId: QuestId): QuestFlag[] {
	return quests[difficulty][act][questId].flags;
}

export function shouldShowQuest(quest: QuestDisplay, showPrologue: boolean): boolean {
	return quest.id !== "prologue" || showPrologue;
}

export function getStandardActQuests(act: ActDisplay, showPrologue: boolean): QuestDisplay[] {
	return act.quests.filter((quest) => shouldShowQuest(quest, showPrologue));
}

export function getRenderedActQuests(
	act: ActDisplay,
	showPrologue: boolean,
	showAllQuests: boolean,
	unusedActQuests: Record<Act, QuestDisplay[]>,
): QuestDisplay[] {
	const standardQuests = getStandardActQuests(act, showPrologue);

	if (!showAllQuests) {
		return standardQuests;
	}

	return [...standardQuests, ...(unusedActQuests[act.id] ?? [])];
}

export function isQuestCompleted(flags: readonly QuestFlag[]): boolean {
	return (
		flags.includes("RewardGranted") ||
		flags.includes("CompletedNow") ||
		flags.includes("CompletedBefore") ||
		flags.includes("PrimaryGoalDone")
	);
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
		if (isQuestCompleted(getQuestFlags(quests, difficulty, act.id, quest.id))) {
			completed += 1;
		}
	}

	const total = visibleQuests.length;

	return {
		completed,
		total,
		percent: total > 0 ? Math.round((completed / total) * 100) : 0,
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

	return Array.from(flags);
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

	quests[difficulty][act][questId].flags = flags.filter((currentFlag) => currentFlag !== flag);
	return true;
}

export function toggleQuestFlag(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	flag: QuestFlag,
): boolean {
	if (hasQuestFlag(quests, difficulty, act, questId, flag)) {
		return removeQuestFlag(quests, difficulty, act, questId, flag);
	}

	return addQuestFlag(quests, difficulty, act, questId, flag);
}

export function isQuestStatePresent(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	state: QuestPreset,
): boolean {
	const flags = getQuestFlags(quests, difficulty, act, questId);
	return state.flags.every((flag) => flags.includes(flag));
}


export function toggleQuestState(
	quests: QuestMap,
	difficulty: Difficulty,
	act: Act,
	questId: QuestId,
	state: QuestPreset,
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
	unusedActQuests: Record<Act, QuestDisplay[]>,
	questFlags: ReadonlyArray<{ id: QuestFlag }>,
	value: boolean,
): void {
	const renderedQuests = advancedFlags
		? getRenderedActQuests(act, showPrologue, showAllQuests, unusedActQuests)
		: getStandardActQuests(act, showPrologue);

	for (const quest of renderedQuests) {
		const flags = getQuestFlagsForBulkToggle(quest, advancedFlags, questFlags);

		for (const flag of flags) {
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
		for (const act of QUEST_ACTS) {
			setAllActQuestFlags(
				quests,
				difficulty,
				act,
				true,
				false,
				false,
				EMPTY_UNUSED_ACT_QUESTS,
				EMPTY_QUEST_FLAGS,
				true,
			);
		}
	}
}

export function applyQuestRewards(
	attributes: AttributeMap,
	act: Act,
	questId: QuestId,
	add: boolean,
): RewardFeedback | null {
	const rewardLines = QUEST_REWARDS.filter((reward) => {
		return reward.act === act && reward.quest === questId;
	});

	if (rewardLines.length < 1) {
		return null;
	}

	let hasClampedChange = false;
	const rewardChanges: string[] = [];
	const clampedChanges: string[] = [];

	for (const reward of rewardLines) {
		const attribute = attributes[reward.attribute];
		const previousValue = attribute.value;
		const maxValue = 2 ** attribute.bitLength - 1;
		const storedRewardValue = toStoredRewardValue(reward.attribute, reward.value);

		const targetValue = add
			? previousValue + storedRewardValue
			: previousValue - storedRewardValue;

		const nextValue = Math.max(0, Math.min(targetValue, maxValue));
		attribute.value = nextValue;

		const effectiveDelta = nextValue - previousValue;
		const expectedDelta = add ? storedRewardValue : -storedRewardValue;

		if (effectiveDelta !== expectedDelta) {
			hasClampedChange = true;
		}

		const attributeLabel = getAttributeLabel(reward.attribute);
		const displayedDelta = toDisplayedRewardDelta(reward.attribute, effectiveDelta);

		if (effectiveDelta !== 0) {
			rewardChanges.push(`${formatSignedDelta(displayedDelta)} ${attributeLabel}`);
		}

		if (effectiveDelta !== expectedDelta) {
			clampedChanges.push(`${formatSignedDelta(displayedDelta)} ${attributeLabel} (at limit)`);
		}
	}

	if (!hasClampedChange) {
		return {
			kind: "info",
			text: `${add ? "Reward applied:" : "Reward removed:"} ${rewardChanges.length > 0 ? rewardChanges.join(", ") : "no effective stat change."
				}`,
		};
	}

	return {
		kind: "warning",
		text: add
			? `Reward was only partially applied because this stat reached its limit.${clampedChanges.length > 0 ? ` Applied: ${clampedChanges.join(", ")}.` : ""
			}`
			: `Reward was only partially removed because this stat is already at its minimum.${clampedChanges.length > 0 ? ` Removed: ${clampedChanges.join(", ")}.` : ""
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
