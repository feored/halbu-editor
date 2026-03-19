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
} from "$lib/editor/quests/questsLogic";

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

function copyAttributes(attributes: AttributeMap): AttributeMap {
	return {
		statpts: { ...attributes.statpts },
		newskills: { ...attributes.newskills },
		experience: { ...attributes.experience },
		level: { ...attributes.level },
		gold: { ...attributes.gold },
		goldbank: { ...attributes.goldbank },
		strength: { ...attributes.strength },
		dexterity: { ...attributes.dexterity },
		vitality: { ...attributes.vitality },
		energy: { ...attributes.energy },
		hitpoints: { ...attributes.hitpoints },
		maxhp: { ...attributes.maxhp },
		mana: { ...attributes.mana },
		maxmana: { ...attributes.maxmana },
		stamina: { ...attributes.stamina },
		maxstamina: { ...attributes.maxstamina },
	};
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

function countSpentSkillPoints(save: EditorSave): number {
	let spent = 0;

	for (const skill of save.skills) {
		if (skill.points > 0) {
			spent += skill.points;
		}
	}

	return spent;
}

function countSpentStatPoints(save: EditorSave, stats: Charstats): number {
	return (
		(save.attributes.strength.value - stats.str) +
		(save.attributes.dexterity.value - stats.dex) +
		(save.attributes.vitality.value - stats.vit) +
		(save.attributes.energy.value - stats.int)
	);
}

function buildValues(attributes: AttributeMap): GameRulesValues {
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

function buildChanges(save: EditorSave, values: GameRulesValues): GameRulesChange[] {
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

export function getGameRulesClassPrimaryAttributes(
	className: ClassName,
): PrimaryAttributes | null {
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

export function projectGameRulesDerivedValues(
	save: EditorSave,
	baselineSave: EditorSave | null = null,
): GameRules {
	const stats = requireCharstats(save.character.className);
	const attributes = baselineSave == null
		? copyAttributes(save.attributes)
		: copyAttributes(baselineSave.attributes);

	if (baselineSave == null) {
		const level = clampInteger(save.attributes.level.value, 1, 99);
		const levelsGained = level - 1;

		const spentStats = countSpentStatPoints(save, stats);
		const spentSkills = countSpentSkillPoints(save);

		const lifePerLevel = stats.LifePerLevel / 4;
		const staminaPerLevel = stats.StaminaPerLevel / 4;
		const manaPerLevel = stats.ManaPerLevel / 4;
		const lifePerVitality = stats.LifePerVitality / 4;
		const staminaPerVitality = stats.StaminaPerVitality / 4;
		const manaPerEnergy = stats.ManaPerMagic / 4;

		const maxLife =
			stats.hpadd +
			stats.vit +
			levelsGained * lifePerLevel +
			(save.attributes.vitality.value - stats.vit) * lifePerVitality;

		const maxMana =
			stats.int +
			levelsGained * manaPerLevel +
			(save.attributes.energy.value - stats.int) * manaPerEnergy;

		const maxStamina =
			stats.stamina +
			levelsGained * staminaPerLevel +
			(save.attributes.vitality.value - stats.vit) * staminaPerVitality;

		setAttrValue(attributes, "maxhp", Math.round(maxLife * RESOURCE_Q8_SCALE));
		setAttrValue(attributes, "hitpoints", attributes.maxhp.value);

		setAttrValue(attributes, "maxmana", Math.round(maxMana * RESOURCE_Q8_SCALE));
		setAttrValue(attributes, "mana", attributes.maxmana.value);

		setAttrValue(attributes, "maxstamina", Math.round(maxStamina * RESOURCE_Q8_SCALE));
		setAttrValue(attributes, "stamina", attributes.maxstamina.value);

		setAttrValue(
			attributes,
			"statpts",
			levelsGained * stats.StatPerLevel - spentStats,
		);

		setAttrValue(
			attributes,
			"newskills",
			levelsGained * stats.SkillsPerLevel - spentSkills,
		);

		addQuestRewards(save, attributes);
	} else {
		const level = clampInteger(save.attributes.level.value, 1, 99);
		const baselineLevel = clampInteger(baselineSave.attributes.level.value, 1, 99);
		const levelDelta = level - baselineLevel;

		const lifePerLevel = stats.LifePerLevel / 4;
		const staminaPerLevel = stats.StaminaPerLevel / 4;
		const manaPerLevel = stats.ManaPerLevel / 4;
		const lifePerVitality = stats.LifePerVitality / 4;
		const staminaPerVitality = stats.StaminaPerVitality / 4;
		const manaPerEnergy = stats.ManaPerMagic / 4;

		const vitalityDelta =
			save.attributes.vitality.value - baselineSave.attributes.vitality.value;
		const energyDelta = save.attributes.energy.value - baselineSave.attributes.energy.value;

		const currentSpentStats = countSpentStatPoints(save, stats);
		const baselineSpentStats = countSpentStatPoints(baselineSave, stats);
		const currentSpentSkills = countSpentSkillPoints(save);
		const baselineSpentSkills = countSpentSkillPoints(baselineSave);

		setAttrValue(
			attributes,
			"maxhp",
			baselineSave.attributes.maxhp.value +
				Math.round(levelDelta * lifePerLevel + vitalityDelta * lifePerVitality),
		);
		setAttrValue(
			attributes,
			"maxmana",
			baselineSave.attributes.maxmana.value +
				Math.round(levelDelta * manaPerLevel + energyDelta * manaPerEnergy),
		);
		setAttrValue(
			attributes,
			"maxstamina",
			baselineSave.attributes.maxstamina.value +
				Math.round(levelDelta * staminaPerLevel + vitalityDelta * staminaPerVitality),
		);

		setAttrValue(
			attributes,
			"statpts",
			baselineSave.attributes.statpts.value +
				levelDelta * stats.StatPerLevel -
				(currentSpentStats - baselineSpentStats),
		);

		setAttrValue(
			attributes,
			"newskills",
			baselineSave.attributes.newskills.value +
				levelDelta * stats.SkillsPerLevel -
				(currentSpentSkills - baselineSpentSkills),
		);

		addQuestRewardDelta(save, baselineSave, attributes);
	}

	setAttrValue(attributes, "hitpoints", attributes.maxhp.value);
	setAttrValue(attributes, "mana", attributes.maxmana.value);
	setAttrValue(attributes, "stamina", attributes.maxstamina.value);

	const values = buildValues(attributes);
	const changes = buildChanges(save, values);

	return { values, changes };
}

export function applyProjectedGameRulesValues(
	save: EditorSave,
	values: GameRulesValues,
): void {
	for (const attributeId of DERIVED_RESOURCES) {
		save.attributes[attributeId].value = values[attributeId];
	}
}
