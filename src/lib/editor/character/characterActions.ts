import type { ClassName, EditorSave, ExpansionType } from "$lib/types/editor";

import { clampInteger, getMaxValueForBitLength } from "$lib/utils/numbers";
import {
	getSaveExpansionType,
	isExpandedMode,
	toExpansionType,
} from "$lib/utils/GameSupport";
import { calcDifficultyBeaten, calcTitle } from "$lib/utils/Utils.svelte";
import { experienceForLevel, levelForExperience } from "$lib/editor/character/characterLogic";

const DIFFICULTY_BEATEN_ORDER = ["None", "Normal", "Nightmare", "Hell"] as const;

export type DifficultyBeaten = (typeof DIFFICULTY_BEATEN_ORDER)[number];

export type CharacterDerivedState = {
	title: string;
	difficultyBeaten: DifficultyBeaten;
};

export function getCharacterDerivedState(save: EditorSave): CharacterDerivedState {
	const expansionType = getSaveExpansionType(save);

	return {
		title: calcTitle(save.character, expansionType),
		difficultyBeaten: calcDifficultyBeaten(
			save.character,
			expansionType,
		) as DifficultyBeaten,
	};
}

export function setExpansionType(
	save: EditorSave,
	nextExpansionType: string,
): CharacterDerivedState {
	save.expansionType = toExpansionType(nextExpansionType) as ExpansionType;
	return getCharacterDerivedState(save);
}

export function setDifficultyBeaten(
	save: EditorSave,
	difficultyBeaten: DifficultyBeaten,
): CharacterDerivedState {
	const expansionType = getSaveExpansionType(save);
	const difficultyIndex = DIFFICULTY_BEATEN_ORDER.indexOf(difficultyBeaten);

	save.character.progression =
		(4 + (isExpandedMode(expansionType) ? 1 : 0)) * difficultyIndex;

	return getCharacterDerivedState(save);
}

export function setCharacterLevel(
	save: EditorSave,
	nextLevel: number,
	experienceTable: readonly number[],
): void {
	const clampedLevel = clampInteger(nextLevel, 1, 99);

	if (save.character.level === clampedLevel && save.attributes.level.value === clampedLevel) {
		return;
	}

	save.character.level = clampedLevel;
	save.attributes.level.value = clampedLevel;
	save.attributes.experience.value = experienceForLevel(clampedLevel, experienceTable);
}

export function setCharacterExperience(
	save: EditorSave,
	nextExperience: number,
	experienceTable: readonly number[],
	maxExperience: number,
): void {
	const clampedExperience = clampInteger(nextExperience, 0, maxExperience);
	save.attributes.experience.value = clampedExperience;

	const resolvedLevel = levelForExperience(clampedExperience, experienceTable);
	save.attributes.level.value = resolvedLevel;
	save.character.level = resolvedLevel;
}

export function syncInventoryGoldToLevel(save: EditorSave, maxGoldPerLevel: number): void {
	const normalizedLevel = clampInteger(save.character.level, 1, 99);
	const inventoryGoldMax = maxGoldPerLevel * normalizedLevel;
	const currentGold = clampInteger(save.attributes.gold.value, 0, 2500000);

	if (currentGold > inventoryGoldMax) {
		save.attributes.gold.value = inventoryGoldMax;
	}
}
export function setClampedAttributeValue(
	save: EditorSave,
	attributeId: keyof EditorSave["attributes"],
	nextValue: number,
): void {
	const attribute = save.attributes[attributeId];
	attribute.value = clampInteger(nextValue, 0, getMaxValueForBitLength(attribute.bitLength));
}

export function setPrimaryAttributeValueInGameRulesMode(
	save: EditorSave,
	attributeId: "strength" | "dexterity" | "vitality" | "energy",
	nextValue: number,
	availableStatPoints: number,
	minValue: number,
	maxValue = getMaxValueForBitLength(save.attributes[attributeId].bitLength),
): void {
	const attribute = save.attributes[attributeId];
	const clampedTargetValue = clampInteger(nextValue, minValue, maxValue);

	if (clampedTargetValue <= attribute.value) {
		attribute.value = clampedTargetValue;
		return;
	}

	const allowedIncrease = Math.max(0, availableStatPoints);
	attribute.value = Math.min(clampedTargetValue, attribute.value + allowedIncrease);
}

export function setMapSeed(save: EditorSave, nextMapSeed: number): void {
	save.character.mapSeed = nextMapSeed >>> 0;
}

export function setCharacterClass(
	save: EditorSave,
	nextClassName: ClassName,
): CharacterDerivedState {
	save.character.className = nextClassName;
	return getCharacterDerivedState(save);
}