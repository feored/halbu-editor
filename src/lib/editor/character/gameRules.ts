import charstats from "../../../res/charstats.json";
import type {
	Attribute,
	AttributeMap,
	ClassName,
	EditorSave,
	KnownClassName,
	QuestId,
} from "$lib/types/editor";
import { getAttributeLabel } from "$lib/editor/editorMetadata";
import { clampInteger, getMaxValueForBitLength } from "$lib/utils/numbers";
import { formatDisplayNumber, RESOURCE_Q8_SCALE } from "$lib/utils/resources";
import { applyQuestRewards, isQuestCompleted } from "$lib/editor/quests/questsLogic";

const DERIVED_ATTRIBUTES = [
	"hitpoints",
	"maxhp",
	"mana",
	"maxmana",
	"stamina",
	"maxstamina",
	"statpts",
	"newskills",
] as const;

type DerivedAttribute = (typeof DERIVED_ATTRIBUTES)[number];

type CharstatsRow = {
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

export type GameRulesClassPrimaryAttributes = {
	strength: number;
	dexterity: number;
	energy: number;
	vitality: number;
};

export type GameRulesDerivedValues = Record<DerivedAttribute, number>;

export type GameRulesDerivedChange = {
	attributeId: DerivedAttribute;
	label: string;
	from: number;
	to: number;
	fromDisplay: string;
	toDisplay: string;
};

export type GameRules = {
	values: GameRulesDerivedValues;
	changes: GameRulesDerivedChange[];
};

const CHARSTATS_BY_CLASS: Partial<Record<KnownClassName, CharstatsRow>> = {};
for (const row of charstats as CharstatsRow[]) {
	CHARSTATS_BY_CLASS[row.class] = row;
}

function getCharstatsRow(className: ClassName): CharstatsRow | null {
	if (className.startsWith("Unknown(")) {
		return null;
	}

	return CHARSTATS_BY_CLASS[className] ?? null;
}

function requireCharstatsRow(className: ClassName): CharstatsRow {
	const row = getCharstatsRow(className);
	if (row == null) {
		throw new Error(`Game rules projection requires known charstats for class ${className}.`);
	}

	return row;
}

function cloneAttributeMap(attributes: AttributeMap): AttributeMap {
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

function clampToStoredAttributeRange(attribute: AttributeMap[Attribute], value: number): number {
	return clampInteger(value, 0, getMaxValueForBitLength(attribute.bitLength));
}

function formatDerivedDisplayValue(attributeId: DerivedAttribute, storedValue: number): string {
	switch (attributeId) {
		case "hitpoints":
		case "maxhp":
		case "mana":
		case "maxmana":
		case "stamina":
		case "maxstamina":
			return formatDisplayNumber(storedValue / RESOURCE_Q8_SCALE);
		default:
			return String(storedValue);
	}
}

function applyCompletedQuestRewards(save: EditorSave, projectedAttributes: AttributeMap): void {
	for (const difficultyQuests of Object.values(save.quests)) {
		for (const [actId, actQuests] of Object.entries(difficultyQuests)) {
			for (const [questId, quest] of Object.entries(actQuests)) {
				if (!isQuestCompleted(quest.flags)) {
					continue;
				}

				applyQuestRewards(
					projectedAttributes,
					actId as keyof typeof difficultyQuests,
					questId as QuestId,
					true,
				);
			}
		}
	}
}

export function getGameRulesClassPrimaryAttributes(
	className: ClassName,
): GameRulesClassPrimaryAttributes | null {
	const row = getCharstatsRow(className);
	if (row == null) {
		return null;
	}

	return {
		strength: row.str,
		dexterity: row.dex,
		energy: row.int,
		vitality: row.vit,
	};
}

export function projectGameRulesDerivedValues(save: EditorSave): GameRules {
	const classStats = requireCharstatsRow(save.character.className);

	const level = clampInteger(save.attributes.level.value, 1, 99);
	const levelDelta = level - 1;

	const strength = save.attributes.strength.value;
	const dexterity = save.attributes.dexterity.value;
	const vitality = save.attributes.vitality.value;
	const energy = save.attributes.energy.value;

	const spentSkillPoints = save.skills.reduce((total, skill) => {
		return total + Math.max(0, skill.points);
	}, 0);

	const spentStatPoints =
		(strength - classStats.str) +
		(dexterity - classStats.dex) +
		(vitality - classStats.vit) +
		(energy - classStats.int);

	const lifePerLevel = classStats.LifePerLevel / 4;
	const staminaPerLevel = classStats.StaminaPerLevel / 4;
	const manaPerLevel = classStats.ManaPerLevel / 4;
	const lifePerVitality = classStats.LifePerVitality / 4;
	const staminaPerVitality = classStats.StaminaPerVitality / 4;
	const manaPerEnergy = classStats.ManaPerMagic / 4;

	const maxLife =
		classStats.hpadd +
		classStats.vit +
		levelDelta * lifePerLevel +
		(vitality - classStats.vit) * lifePerVitality;

	const maxMana =
		classStats.int +
		levelDelta * manaPerLevel +
		(energy - classStats.int) * manaPerEnergy;

	const maxStamina =
		classStats.stamina +
		levelDelta * staminaPerLevel +
		(vitality - classStats.vit) * staminaPerVitality;

	const projectedAttributes = cloneAttributeMap(save.attributes);

	projectedAttributes.maxhp.value = clampToStoredAttributeRange(
		projectedAttributes.maxhp,
		Math.round(maxLife * RESOURCE_Q8_SCALE),
	);
	projectedAttributes.hitpoints.value = projectedAttributes.maxhp.value;

	projectedAttributes.maxmana.value = clampToStoredAttributeRange(
		projectedAttributes.maxmana,
		Math.round(maxMana * RESOURCE_Q8_SCALE),
	);
	projectedAttributes.mana.value = projectedAttributes.maxmana.value;

	projectedAttributes.maxstamina.value = clampToStoredAttributeRange(
		projectedAttributes.maxstamina,
		Math.round(maxStamina * RESOURCE_Q8_SCALE),
	);
	projectedAttributes.stamina.value = projectedAttributes.maxstamina.value;

	projectedAttributes.statpts.value = clampToStoredAttributeRange(
		projectedAttributes.statpts,
		levelDelta * classStats.StatPerLevel - spentStatPoints,
	);

	projectedAttributes.newskills.value = clampToStoredAttributeRange(
		projectedAttributes.newskills,
		levelDelta * classStats.SkillsPerLevel - spentSkillPoints,
	);

	applyCompletedQuestRewards(save, projectedAttributes);

	const values: GameRulesDerivedValues = {
		hitpoints: projectedAttributes.hitpoints.value,
		maxhp: projectedAttributes.maxhp.value,
		mana: projectedAttributes.mana.value,
		maxmana: projectedAttributes.maxmana.value,
		stamina: projectedAttributes.stamina.value,
		maxstamina: projectedAttributes.maxstamina.value,
		statpts: projectedAttributes.statpts.value,
		newskills: projectedAttributes.newskills.value,
	};

	const changes: GameRulesDerivedChange[] = [];

	for (const attributeId of DERIVED_ATTRIBUTES) {
		const fromValue = save.attributes[attributeId].value;
		const toValue = values[attributeId];

		if (fromValue === toValue) {
			continue;
		}

		changes.push({
			attributeId,
			label: getAttributeLabel(attributeId),
			from: fromValue,
			to: toValue,
			fromDisplay: formatDerivedDisplayValue(attributeId, fromValue),
			toDisplay: formatDerivedDisplayValue(attributeId, toValue),
		});
	}

	return {
		values,
		changes,
	};
}

export function applyProjectedGameRulesValues(
	save: EditorSave,
	projectedValues: GameRulesDerivedValues,
): void {
	for (const attributeId of DERIVED_ATTRIBUTES) {
		save.attributes[attributeId].value = projectedValues[attributeId];
	}
}