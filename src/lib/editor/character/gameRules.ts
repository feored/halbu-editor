import charstats from "../../../res/charstats.json";
import type {
	Act,
	Attribute,
	AttributeMap,
	ClassName,
	Difficulty,
	EditorSave,
	KnownClassName,
	QuestId,
} from "$lib/types/editor";
import { getAttributeLabel } from "$lib/editor/editorMetadata";
import {
	clampInteger,
	formatDisplayNumber,
	getMaxValueForBitLength,
	RESOURCE_Q8_SCALE,
} from "$lib/utils/numbers";
import {
	applyQuestRewards as applyQuestRewardBonuses,
} from "$lib/editor/quests/quests";

const DERIVED_RESOURCES = [
	"hitpoints",
	"maxhp",
	"mana",
	"maxmana",
	"stamina",
	"maxstamina",
	"statpts",
	"newskills",
] as const;

type DerivedResource = (typeof DERIVED_RESOURCES)[number];

type Charstats = {
	class: KnownClassName;
	str: number;
	dex: number;
	int: number;
	vit: number;
	stamina: number;
	hpadd: number;
	LifePerLevel: number;
	StaminaPerLevel: number;
	ManaPerLevel: number;
	LifePerVitality: number;
	StaminaPerVitality: number;
	ManaPerMagic: number;
	StatPerLevel: number;
	SkillsPerLevel: number;
};

type Growth = {
	lifePerLevel: number;
	staminaPerLevel: number;
	manaPerLevel: number;
	lifePerVitality: number;
	staminaPerVitality: number;
	manaPerEnergy: number;
};

type SpentPoints = {
	stats: number;
	skills: number;
};

export type PrimaryAttributes = {
	strength: number;
	dexterity: number;
	energy: number;
	vitality: number;
};

export type GameRulesValues = Record<DerivedResource, number>;

export type GameRulesChange = {
	attributeId: DerivedResource;
	label: string;
	from: number;
	to: number;
	fromDisplay: string;
	toDisplay: string;
};

export type GameRules = {
	values: GameRulesValues;
	changes: GameRulesChange[];
};

const charstatsByClass: Partial<Record<KnownClassName, Charstats>> = Object.create(null);
for (const row of charstats as Charstats[]) {
	charstatsByClass[row.class] = row;
}

function getCharstats(className: ClassName): Charstats | null {
	if (className.startsWith("Unknown(")) {
		return null;
	}

	return charstatsByClass[className] ?? null;
}

function requireCharstats(className: ClassName): Charstats {
	const stats = getCharstats(className);
	if (stats == null) {
		throw new Error(`Missing charstats for class ${className}.`);
	}

	return stats;
}

function clampAttrValue(attribute: AttributeMap[Attribute], value: number): number {
	return clampInteger(value, 0, getMaxValueForBitLength(attribute.bitLength));
}

function setAttrValue(attributes: AttributeMap, attributeId: Attribute, value: number): void {
	attributes[attributeId].value = clampAttrValue(attributes[attributeId], value);
}

function formatValue(attributeId: DerivedResource, value: number): string {
	switch (attributeId) {
		case "hitpoints":
		case "maxhp":
		case "mana":
		case "maxmana":
		case "stamina":
		case "maxstamina":
			return formatDisplayNumber(value / RESOURCE_Q8_SCALE);
		default:
			return String(value);
	}
}

function addQuestRewards(save: EditorSave, attributes: AttributeMap): void {
	for (const difficultyQuests of Object.values(save.quests)) {
		for (const [actId, actQuests] of Object.entries(difficultyQuests)) {
			for (const [questId, quest] of Object.entries(actQuests)) {
				if (!quest.flags.includes("RewardGranted")) {
					continue;
				}

				applyQuestRewardBonuses(
					attributes,
					actId as keyof typeof difficultyQuests,
					questId as QuestId,
					true,
				);
			}
		}
	}
}

function addQuestRewardDelta(
	save: EditorSave,
	baselineSave: EditorSave,
	attributes: AttributeMap,
): void {
	for (const difficulty of Object.keys(save.quests) as Difficulty[]) {
		const currentDifficultyQuests = save.quests[difficulty];
		const baselineDifficultyQuests = baselineSave.quests[difficulty];

		for (const act of Object.keys(currentDifficultyQuests) as Act[]) {
			const currentActQuests = currentDifficultyQuests[act];
			const baselineActQuests = baselineDifficultyQuests[act];

			for (const questId of Object.keys(currentActQuests) as QuestId[]) {
				const currentGranted = currentActQuests[questId].flags.includes("RewardGranted");
				const baselineGranted = baselineActQuests[questId].flags.includes("RewardGranted");

				if (currentGranted === baselineGranted) {
					continue;
				}

				applyQuestRewardBonuses(attributes, act, questId, currentGranted);
			}
		}
	}
}

function getGrowth(stats: Charstats): Growth {
	return {
		lifePerLevel: stats.LifePerLevel / 4,
		staminaPerLevel: stats.StaminaPerLevel / 4,
		manaPerLevel: stats.ManaPerLevel / 4,
		lifePerVitality: stats.LifePerVitality / 4,
		staminaPerVitality: stats.StaminaPerVitality / 4,
		manaPerEnergy: stats.ManaPerMagic / 4,
	};
}

function getSpentPoints(save: EditorSave, stats: Charstats): SpentPoints {
	let skills = 0;
	for (const skill of save.skills) {
		if (skill.points > 0) {
			skills += skill.points;
		}
	}

	return {
		stats:
			(save.attributes.strength.value - stats.str) +
			(save.attributes.dexterity.value - stats.dex) +
			(save.attributes.vitality.value - stats.vit) +
			(save.attributes.energy.value - stats.int),
		skills,
	};
}

function setResources(
	attributes: AttributeMap,
	maxhp: number,
	maxmana: number,
	maxstamina: number,
): void {
	setAttrValue(attributes, "maxhp", maxhp);
	setAttrValue(attributes, "hitpoints", attributes.maxhp.value);
	setAttrValue(attributes, "maxmana", maxmana);
	setAttrValue(attributes, "mana", attributes.maxmana.value);
	setAttrValue(attributes, "maxstamina", maxstamina);
	setAttrValue(attributes, "stamina", attributes.maxstamina.value);
}

function syncResourceValues(attributes: AttributeMap): void {
	setAttrValue(attributes, "hitpoints", attributes.maxhp.value);
	setAttrValue(attributes, "mana", attributes.maxmana.value);
	setAttrValue(attributes, "stamina", attributes.maxstamina.value);
}

function applyBaseValues(
	save: EditorSave,
	stats: Charstats,
	attributes: AttributeMap,
): void {
	const level = clampInteger(save.attributes.level.value, 1, 99);
	const levelsGained = level - 1;
	const growth = getGrowth(stats);
	const spent = getSpentPoints(save, stats);

	setResources(
		attributes,
		Math.round(
			(
				stats.hpadd +
				stats.vit +
				levelsGained * growth.lifePerLevel +
				(save.attributes.vitality.value - stats.vit) * growth.lifePerVitality
			) * RESOURCE_Q8_SCALE,
		),
		Math.round(
			(
				stats.int +
				levelsGained * growth.manaPerLevel +
				(save.attributes.energy.value - stats.int) * growth.manaPerEnergy
			) * RESOURCE_Q8_SCALE,
		),
		Math.round(
			(
				stats.stamina +
				levelsGained * growth.staminaPerLevel +
				(save.attributes.vitality.value - stats.vit) * growth.staminaPerVitality
			) * RESOURCE_Q8_SCALE,
		),
	);

	setAttrValue(attributes, "statpts", levelsGained * stats.StatPerLevel - spent.stats);
	setAttrValue(attributes, "newskills", levelsGained * stats.SkillsPerLevel - spent.skills);
	addQuestRewards(save, attributes);
}

function applyDeltaValues(
	save: EditorSave,
	baselineSave: EditorSave,
	stats: Charstats,
	attributes: AttributeMap,
): void {
	const level = clampInteger(save.attributes.level.value, 1, 99);
	const baselineLevel = clampInteger(baselineSave.attributes.level.value, 1, 99);
	const levelDelta = level - baselineLevel;
	const growth = getGrowth(stats);
	const vitalityDelta = save.attributes.vitality.value - baselineSave.attributes.vitality.value;
	const energyDelta = save.attributes.energy.value - baselineSave.attributes.energy.value;
	const spent = getSpentPoints(save, stats);
	const baselineSpent = getSpentPoints(baselineSave, stats);

	setAttrValue(
		attributes,
		"maxhp",
		baselineSave.attributes.maxhp.value +
			Math.round(
				(levelDelta * growth.lifePerLevel + vitalityDelta * growth.lifePerVitality) *
					RESOURCE_Q8_SCALE,
			),
	);
	setAttrValue(
		attributes,
		"maxmana",
		baselineSave.attributes.maxmana.value +
			Math.round(
				(levelDelta * growth.manaPerLevel + energyDelta * growth.manaPerEnergy) *
					RESOURCE_Q8_SCALE,
			),
	);
	setAttrValue(
		attributes,
		"maxstamina",
		baselineSave.attributes.maxstamina.value +
			Math.round(
				(levelDelta * growth.staminaPerLevel + vitalityDelta * growth.staminaPerVitality) *
					RESOURCE_Q8_SCALE,
			),
	);
	setAttrValue(
		attributes,
		"statpts",
		baselineSave.attributes.statpts.value +
			levelDelta * stats.StatPerLevel -
			(spent.stats - baselineSpent.stats),
	);
	setAttrValue(
		attributes,
		"newskills",
		baselineSave.attributes.newskills.value +
			levelDelta * stats.SkillsPerLevel -
			(spent.skills - baselineSpent.skills),
	);
	addQuestRewardDelta(save, baselineSave, attributes);
}

function getValues(attributes: AttributeMap): GameRulesValues {
	return {
		hitpoints: attributes.hitpoints.value,
		maxhp: attributes.maxhp.value,
		mana: attributes.mana.value,
		maxmana: attributes.maxmana.value,
		stamina: attributes.stamina.value,
		maxstamina: attributes.maxstamina.value,
		statpts: attributes.statpts.value,
		newskills: attributes.newskills.value,
	};
}

function getChanges(save: EditorSave, values: GameRulesValues): GameRulesChange[] {
	const changes: GameRulesChange[] = [];

	for (const attributeId of DERIVED_RESOURCES) {
		const from = save.attributes[attributeId].value;
		const to = values[attributeId];

		if (from === to) {
			continue;
		}

		changes.push({
			attributeId,
			label: getAttributeLabel(attributeId),
			from,
			to,
			fromDisplay: formatValue(attributeId, from),
			toDisplay: formatValue(attributeId, to),
		});
	}

	return changes;
}

export function getClassBaseAttributes(className: ClassName): PrimaryAttributes | null {
	const stats = getCharstats(className);
	if (stats == null) {
		return null;
	}

	return {
		strength: stats.str,
		dexterity: stats.dex,
		energy: stats.int,
		vitality: stats.vit,
	};
}

export function getGameRulesValues(
	save: EditorSave,
	baselineSave: EditorSave | null = null,
): GameRulesValues {
	const stats = requireCharstats(save.character.className);
	const sourceAttributes = baselineSave == null ? save.attributes : baselineSave.attributes;
	const attributes = Object.fromEntries(
		Object.entries(sourceAttributes).map(([attributeId, attribute]) => [
			attributeId,
			{ ...attribute },
		]),
	) as AttributeMap;

	if (baselineSave == null) {
		applyBaseValues(save, stats, attributes);
	} else {
		applyDeltaValues(save, baselineSave, stats, attributes);
	}

	syncResourceValues(attributes);
	return getValues(attributes);
}

export function getGameRules(
	save: EditorSave,
	baselineSave: EditorSave | null = null,
): GameRules {
	const values = getGameRulesValues(save, baselineSave);
	return { values, changes: getChanges(save, values) };
}

export function applyGameRulesValues(
	save: EditorSave,
	values: GameRulesValues,
): void {
	for (const attributeId of DERIVED_RESOURCES) {
		save.attributes[attributeId].value = values[attributeId];
	}
}

export function applyGameRules(
	save: EditorSave,
	baselineSave: EditorSave | null = null,
): void {
	applyGameRulesValues(save, getGameRulesValues(save, baselineSave));
}
