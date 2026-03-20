import titles from "$lib/editor/character/titles.json";
import { experienceForLevel, levelForExperience } from "$lib/editor/character/characterLogic";
import { toExpansionType, isFemaleClass } from "$lib/utils/gameData";
import { clampInteger, getMaxValueForBitLength } from "$lib/utils/numbers";

import type { ClassName, EditorSave, ExpansionType } from "$lib/types/editor";

const completedDifficulties = ["None", "Normal", "Nightmare", "Hell"] as const;

export const MAX_GOLD_PER_LEVEL = 10000;
export const MAX_GOLD = 2500000;

export type DifficultyBeaten = (typeof completedDifficulties)[number];

export type CharacterState = {
	title: string;
	difficultyBeaten: DifficultyBeaten;
};

function getDifficultyBeaten(
	save: Pick<EditorSave, "character" | "expansionType">,
): DifficultyBeaten {
	const completedActs = save.expansionType === "Classic" ? 4 : 5;
	const difficultyIndex = Math.floor(save.character.progression / completedActs);
	return completedDifficulties[Math.max(0, Math.min(difficultyIndex, 3))];
}

function getTitle(save: Pick<EditorSave, "character" | "expansionType">): string {
	const gender = isFemaleClass(save.character.className) ? "Female" : "Male";
	const core = save.character.status.hardcore ? "Hardcore" : "Softcore";
	const expansion = save.expansionType === "Classic" ? "Classic" : "Expansion";
	const difficultyBeaten = getDifficultyBeaten(save);

	return titles?.[core]?.[expansion]?.[difficultyBeaten]?.[gender] ?? "";
}

export function getCharacterState(save: EditorSave): CharacterState {
	return {
		title: getTitle(save),
		difficultyBeaten: getDifficultyBeaten(save),
	};
}

export function setExpansion(save: EditorSave, value: string): CharacterState {
	save.expansionType = toExpansionType(value) as ExpansionType;
	return getCharacterState(save);
}

export function setDifficultyBeaten(
	save: EditorSave,
	difficultyBeaten: DifficultyBeaten,
): CharacterState {
	const difficultyIndex = completedDifficulties.indexOf(difficultyBeaten);
	save.character.progression =
		(4 + (save.expansionType !== "Classic" ? 1 : 0)) * difficultyIndex;

	return getCharacterState(save);
}

export function setLevel(
	save: EditorSave,
	level: number,
	experienceTable: readonly number[],
): void {
	const nextLevel = clampInteger(level, 1, 99);

	if (save.character.level === nextLevel && save.attributes.level.value === nextLevel) {
		return;
	}

	save.character.level = nextLevel;
	save.attributes.level.value = nextLevel;
	save.attributes.experience.value = experienceForLevel(nextLevel, experienceTable);
}

export function setExperience(
	save: EditorSave,
	experience: number,
	experienceTable: readonly number[],
	maxExperience: number,
): void {
	const nextExperience = clampInteger(experience, 0, maxExperience);
	const level = levelForExperience(nextExperience, experienceTable);

	save.attributes.experience.value = nextExperience;
	save.attributes.level.value = level;
	save.character.level = level;
}

export function clampInventoryGold(save: EditorSave, maxGoldPerLevel: number): void {
	const goldLimit = maxGoldPerLevel * clampInteger(save.character.level, 1, 99);
	const gold = clampInteger(save.attributes.gold.value, 0, MAX_GOLD);

	if (gold > goldLimit) {
		save.attributes.gold.value = goldLimit;
	}
}

export function setAttributeValue(
	save: EditorSave,
	attributeId: keyof EditorSave["attributes"],
	value: number,
): void {
	const attribute = save.attributes[attributeId];
	attribute.value = clampInteger(value, 0, getMaxValueForBitLength(attribute.bitLength));
}

export function setMapSeed(save: EditorSave, value: number): void {
	save.character.mapSeed = value >>> 0;
}

export function setClass(save: EditorSave, className: ClassName): CharacterState {
	save.character.className = className;
	return getCharacterState(save);
}
