const QUEST_REWARDS = [
	{ act: "act1", quest: "q1", attribute: "newskills", value: 1 },
	{ act: "act2", quest: "q1", attribute: "newskills", value: 1 },
	{ act: "act4", quest: "q1", attribute: "newskills", value: 2 },
	{ act: "act3", quest: "q1", attribute: "statpts", value: 5 },
	{ act: "act3", quest: "q4", attribute: "maxhp", value: 20 },
	{ act: "act3", quest: "q4", attribute: "hitpoints", value: 20 },
] as const;

const REWARD_ATTRIBUTE_SCALE_BY_ID: Record<string, number> = {
	hitpoints: 256,
	maxhp: 256,
	mana: 256,
	maxmana: 256,
	stamina: 256,
	maxstamina: 256,
};

const REWARD_ATTRIBUTE_LABELS: Record<string, string> = {
	newskills: "Skill Points",
	statpts: "Stat Points",
	maxhp: "Base Life",
	hitpoints: "Current Life",
};

type QuestDefinition = {
	id: string;
	display: string;
	states?: Array<{ flags: string[]; display: string }>;
};

type ActDefinition = {
	id: string;
	quests: QuestDefinition[];
};

type RewardFeedback = {
	kind: "warning" | "info";
	text: string;
};

type SaveAttributes = Record<string, { value: number; bit_length: number }>;

function getRewardStorageScale(attributeId: string): number {
	return REWARD_ATTRIBUTE_SCALE_BY_ID[attributeId] ?? 1;
}

function toStoredRewardValue(attributeId: string, gameValue: number): number {
	return gameValue * getRewardStorageScale(attributeId);
}

function toDisplayedRewardDelta(attributeId: string, storedDelta: number): number {
	return storedDelta / getRewardStorageScale(attributeId);
}

function formatSignedDelta(value: number): string {
	if (value === 0) {
		return "0";
	}
	const absoluteValue = Math.abs(value);
	const formattedAbsoluteValue = Number.isInteger(absoluteValue)
		? `${absoluteValue}`
		: absoluteValue.toFixed(2).replace(/\.?0+$/, "");
	return value > 0 ? `+${formattedAbsoluteValue}` : `-${formattedAbsoluteValue}`;
}

export function shouldShowQuest(quest: QuestDefinition, showPrologue: boolean): boolean {
	return quest.id !== "prologue" || showPrologue;
}

export function getStandardActQuests(
	act: ActDefinition,
	showPrologue: boolean,
): QuestDefinition[] {
	return act.quests.filter((quest) => shouldShowQuest(quest, showPrologue));
}

export function getRenderedActQuests(
	act: ActDefinition,
	showPrologue: boolean,
	showAllQuests: boolean,
	unusedActQuests: Record<string, QuestDefinition[]>,
): QuestDefinition[] {
	const standardQuests = getStandardActQuests(act, showPrologue);
	if (!showAllQuests) {
		return standardQuests;
	}
	return [...standardQuests, ...(unusedActQuests[act.id] ?? [])];
}

export function isQuestCompletedState(stateFlags: readonly string[]): boolean {
	return (
		stateFlags.includes("RewardGranted") ||
		stateFlags.includes("CompletedNow") ||
		stateFlags.includes("CompletedBefore") ||
		stateFlags.includes("PrimaryGoalDone")
	);
}

export function countActProgress(
	difficultyId: string,
	act: ActDefinition,
	questsByDifficulty: Record<string, Record<string, Record<string, { state: string[] }>>>,
	showPrologue: boolean,
): { completed: number; total: number; percent: number } {
	const visibleQuests = getStandardActQuests(act, showPrologue);
	let completed = 0;
	for (const quest of visibleQuests) {
		const stateFlags = questsByDifficulty[difficultyId][act.id][quest.id].state;
		if (isQuestCompletedState(stateFlags)) {
			completed += 1;
		}
	}
	const total = visibleQuests.length;
	const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
	return { completed, total, percent };
}

export function getQuestFlagsForBulkToggle(
	quest: QuestDefinition,
	advancedMode: boolean,
	questFlags: Array<{ id: string }>,
): string[] {
	if (advancedMode) {
		return questFlags.map((flag) => flag.id);
	}
	const flags = new Set<string>();
	for (const state of quest.states ?? []) {
		for (const flag of state.flags) {
			flags.add(flag);
		}
	}
	return Array.from(flags);
}

export function applyQuestRewards(
	attributes: SaveAttributes,
	actId: string,
	questId: string,
	add: boolean,
): RewardFeedback | null {
	const rewardLines = QUEST_REWARDS.filter((rewardLine) => {
		return rewardLine.act === actId && rewardLine.quest === questId;
	});
	if (rewardLines.length < 1) {
		return null;
	}

	let hasClampedChange = false;
	const rewardChanges: string[] = [];
	const clampedChanges: string[] = [];
	for (const rewardLine of rewardLines) {
		const attribute = attributes[rewardLine.attribute];
		const previousValue = attribute.value;
		const maxValue = Math.pow(2, attribute.bit_length) - 1;
		const rewardStoredValue = toStoredRewardValue(rewardLine.attribute, rewardLine.value);
		const targetValue = add
			? previousValue + rewardStoredValue
			: previousValue - rewardStoredValue;
		const nextValue = Math.max(0, Math.min(targetValue, maxValue));
		attribute.value = nextValue;

		const effectiveDelta = nextValue - previousValue;
		if (add && effectiveDelta !== rewardStoredValue) {
			hasClampedChange = true;
		}
		if (!add && effectiveDelta !== -rewardStoredValue) {
			hasClampedChange = true;
		}

		const attributeLabel =
			REWARD_ATTRIBUTE_LABELS[rewardLine.attribute] ?? rewardLine.attribute;
		const expectedDelta = add ? rewardStoredValue : -rewardStoredValue;
		const displayedDelta = toDisplayedRewardDelta(rewardLine.attribute, effectiveDelta);
		if (hasClampedChange && effectiveDelta !== expectedDelta) {
			clampedChanges.push(`${formatSignedDelta(displayedDelta)} ${attributeLabel} (at limit)`);
		}

		if (effectiveDelta !== 0) {
			rewardChanges.push(`${formatSignedDelta(displayedDelta)} ${attributeLabel}`);
		}
	}

	const feedbackPrefix = add ? "Reward applied:" : "Reward removed:";
	const feedbackBody =
		rewardChanges.length > 0 ? rewardChanges.join(", ") : "no effective stat change.";
	const warningSummary = add
		? "Reward was only partially applied because this stat reached its limit."
		: "Reward was only partially removed because this stat is already at its minimum.";
	const warningDetails =
		clampedChanges.length > 0
			? ` ${add ? "Applied" : "Removed"}: ${clampedChanges.join(", ")}.`
			: "";
	return {
		kind: hasClampedChange ? "warning" : "info",
		text: hasClampedChange
			? `${warningSummary}${warningDetails}`
			: `${feedbackPrefix} ${feedbackBody}`,
	};
}
