import titles from "$lib/editor/character/titles.json";
import { isFemaleClass } from "$lib/utils/gameData";
import type { Character, ExpansionType } from "$lib/types/editor";

const DIFFICULTY_BEATEN_ORDER = ["None", "Normal", "Nightmare", "Hell"] as const;

type DifficultyBeaten = (typeof DIFFICULTY_BEATEN_ORDER)[number];

export function getDifficultyBeaten(
	character: Pick<Character, "progression">,
	expansionType: ExpansionType,
): DifficultyBeaten {
	const completedActCount = expansionType === "Classic" ? 4 : 5;
	const difficultyIndex = Math.floor(character.progression / completedActCount);
	const clampedDifficultyIndex = Math.max(0, Math.min(difficultyIndex, 3));
	return DIFFICULTY_BEATEN_ORDER[clampedDifficultyIndex];
}

export function getCharacterTitle(
	character: Pick<Character, "className" | "progression" | "status">,
	expansionType: ExpansionType,
): string {
	const difficultyBeaten = getDifficultyBeaten(character, expansionType);
	const gender = isFemaleClass(character.className) ? "Female" : "Male";
	const core = character.status.hardcore ? "Hardcore" : "Softcore";
	const expansion = expansionType === "Classic" ? "Classic" : "Expansion";

	return titles?.[core]?.[expansion]?.[difficultyBeaten]?.[gender] ?? "";
}
