import charstats from "../../../res/charstats.json";
import type { EditorAttributes, EditorSave, KnownClassName } from "../../types/editor";
import { RESOURCE_Q8_SCALE } from "../../utils/resources";
import { applyQuestRewards, isQuestCompletedState } from "../quests/questsLogic";

const KNOWN_CLASS_NAMES: readonly KnownClassName[] = [
	"Amazon",
	"Sorceress",
	"Necromancer",
	"Paladin",
	"Barbarian",
	"Druid",
	"Assassin",
	"Warlock",
];

const DERIVED_ATTRIBUTE_IDS = [
	"hitpoints",
	"maxhp",
	"mana",
	"maxmana",
	"stamina",
	"maxstamina",
	"statpts",
	"newskills",
] as const;

type DerivedAttributeId = (typeof DERIVED_ATTRIBUTE_IDS)[number];

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

export type GameRulesDerivedValues = Record<DerivedAttributeId, number>;

export type GameRulesDerivedChange = {
	attributeId: DerivedAttributeId;
	label: string;
	from: number;
	to: number;
	fromDisplay: string;
	toDisplay: string;
};

export type GameRulesProjection = {
	values: GameRulesDerivedValues;
	changes: GameRulesDerivedChange[];
};

const CHARSTATS_BY_CLASS: Partial<Record<KnownClassName, CharstatsRow>> = {};
for (const row of charstats as CharstatsRow[]) {
	CHARSTATS_BY_CLASS[row.class] = row;
}

const ATTRIBUTE_LABELS: Record<DerivedAttributeId, string> = {
	hitpoints: "Life (Current)",
	maxhp: "Life (Base)",
	mana: "Mana (Current)",
	maxmana: "Mana (Base)",
	stamina: "Stamina (Current)",
	maxstamina: "Stamina (Base)",
	statpts: "Stat points left",
	newskills: "Skill points left",
};

function clampToAttributeRange(value: number, bitLength: number): number {
	const maxValue = Math.pow(2, bitLength) - 1;
	const roundedValue = Math.round(value);
	return Math.max(0, Math.min(maxValue, roundedValue));
}

function formatDisplayNumber(value: number): string {
	if (Number.isInteger(value)) {
		return `${value}`;
	}
	return value.toFixed(2).replace(/\.?0+$/, "");
}

function toDisplayValue(attributeId: DerivedAttributeId, storedValue: number): string {
	if (
		attributeId === "hitpoints" ||
		attributeId === "maxhp" ||
		attributeId === "mana" ||
		attributeId === "maxmana" ||
		attributeId === "stamina" ||
		attributeId === "maxstamina"
	) {
		return formatDisplayNumber(storedValue / RESOURCE_Q8_SCALE);
	}
	return `${storedValue}`;
}

function getClassStats(save: EditorSave): CharstatsRow {
	const className = save.character.class;
	if (!KNOWN_CLASS_NAMES.includes(className as KnownClassName)) {
		throw new Error(
			`Game rules projection requires a known class. Current class is ${save.character.class}.`,
		);
	}
	const classStats = CHARSTATS_BY_CLASS[className as KnownClassName];
	if (classStats == null) {
		throw new Error(`Missing charstats data for class ${className}.`);
	}
	return classStats;
}

export function getGameRulesClassPrimaryAttributes(
	className: KnownClassName,
): GameRulesClassPrimaryAttributes | null {
	const classStats = CHARSTATS_BY_CLASS[className];
	if (classStats == null) {
		return null;
	}
	return {
		strength: classStats.str,
		dexterity: classStats.dex,
		energy: classStats.int,
		vitality: classStats.vit,
	};
}

function cloneProjectedAttributes(attributes: EditorAttributes): EditorAttributes {
	const clonedAttributes = {} as EditorAttributes;
	const clonedAttributesById = clonedAttributes as Record<
		string,
		{ value: number; bit_length: number }
	>;
	for (const [attributeId, attribute] of Object.entries(attributes)) {
		clonedAttributesById[attributeId] = {
			value: attribute.value,
			bit_length: attribute.bit_length,
		};
	}
	return clonedAttributes;
}

function applyCompletedQuestRewards(
	saveData: EditorSave,
	projectedAttributes: EditorAttributes,
): void {
	for (const [difficultyId, actsById] of Object.entries(saveData.quests)) {
		for (const [actId, questsById] of Object.entries(actsById)) {
			for (const [questId, quest] of Object.entries(questsById)) {
				if (!isQuestCompletedState(quest.state)) {
					continue;
				}
				applyQuestRewards(projectedAttributes, actId, questId, true);
			}
		}
	}
}

export function projectGameRulesDerivedValues(saveData: EditorSave): GameRulesProjection {
	const classStats = getClassStats(saveData);
	const level = Math.max(1, Math.min(99, saveData.attributes.level.value));
	const levelDelta = level - 1;
	const strengthValue = saveData.attributes.strength.value;
	const dexterityValue = saveData.attributes.dexterity.value;
	const vitalityValue = saveData.attributes.vitality.value;
	const energyValue = saveData.attributes.energy.value;
	const skillPointsSpent = saveData.skills.reduce(
		(total, skill) => total + Math.max(0, skill.points),
		0,
	);
	const statPointsSpent =
		strengthValue -
		classStats.str +
		(dexterityValue - classStats.dex) +
		(vitalityValue - classStats.vit) +
		(energyValue - classStats.int);

	const lifePerLevel = classStats.LifePerLevel / 4;
	const staminaPerLevel = classStats.StaminaPerLevel / 4;
	const manaPerLevel = classStats.ManaPerLevel / 4;
	const lifePerVitality = classStats.LifePerVitality / 4;
	const staminaPerVitality = classStats.StaminaPerVitality / 4;
	const manaPerMagic = classStats.ManaPerMagic / 4;

	const maxLife =
		classStats.hpadd +
		classStats.vit +
		levelDelta * lifePerLevel +
		(vitalityValue - classStats.vit) * lifePerVitality;
	const maxMana =
		classStats.int +
		levelDelta * manaPerLevel +
		(energyValue - classStats.int) * manaPerMagic;
	const maxStamina =
		classStats.stamina +
		levelDelta * staminaPerLevel +
		(vitalityValue - classStats.vit) * staminaPerVitality;

	const projectedAttributes = cloneProjectedAttributes(saveData.attributes);
	projectedAttributes.maxhp.value = clampToAttributeRange(
		maxLife * RESOURCE_Q8_SCALE,
		projectedAttributes.maxhp.bit_length,
	);
	projectedAttributes.hitpoints.value = projectedAttributes.maxhp.value;
	projectedAttributes.maxmana.value = clampToAttributeRange(
		maxMana * RESOURCE_Q8_SCALE,
		projectedAttributes.maxmana.bit_length,
	);
	projectedAttributes.mana.value = projectedAttributes.maxmana.value;
	projectedAttributes.maxstamina.value = clampToAttributeRange(
		maxStamina * RESOURCE_Q8_SCALE,
		projectedAttributes.maxstamina.bit_length,
	);
	projectedAttributes.stamina.value = projectedAttributes.maxstamina.value;
	projectedAttributes.statpts.value = clampToAttributeRange(
		levelDelta * classStats.StatPerLevel - statPointsSpent,
		projectedAttributes.statpts.bit_length,
	);
	projectedAttributes.newskills.value = clampToAttributeRange(
		levelDelta * classStats.SkillsPerLevel - skillPointsSpent,
		projectedAttributes.newskills.bit_length,
	);
	applyCompletedQuestRewards(saveData, projectedAttributes);

	const projectedValues: GameRulesDerivedValues = {
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
	for (const attributeId of DERIVED_ATTRIBUTE_IDS) {
		const fromValue = saveData.attributes[attributeId].value;
		const toValue = projectedValues[attributeId];
		if (fromValue === toValue) {
			continue;
		}
		changes.push({
			attributeId,
			label: ATTRIBUTE_LABELS[attributeId],
			from: fromValue,
			to: toValue,
			fromDisplay: toDisplayValue(attributeId, fromValue),
			toDisplay: toDisplayValue(attributeId, toValue),
		});
	}

	return { values: projectedValues, changes };
}

export function applyProjectedGameRulesValues(
	saveData: EditorSave,
	projectedValues: GameRulesDerivedValues,
): void {
	for (const attributeId of DERIVED_ATTRIBUTE_IDS) {
		saveData.attributes[attributeId].value = projectedValues[attributeId];
	}
}
