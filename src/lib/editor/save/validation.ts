import { getCharacterState } from "$lib/editor/character/character";
import { ACT_LABELS, DIFFICULTY_LABELS } from "$lib/editor/editorMetadata";

import type { ValidationIssue } from "$lib/types/backend";
import type { EditorSave } from "$lib/types/editor";

export function getValidationMessage(issue: ValidationIssue, save: EditorSave): string {
	switch (issue.code) {
		case "ProgressionNonCanonical": {
			const difficultyBeaten = getCharacterState(save).difficultyBeaten;
			return `Difficulty beaten is ${difficultyBeaten} (raw progression ${save.character.progression}), but current difficulty is ${DIFFICULTY_LABELS[save.character.difficulty]}.`;
		}
		case "ImpossibleDifficultySelection": {
			const difficultyBeaten = getCharacterState(save).difficultyBeaten;
			return `${DIFFICULTY_LABELS[save.character.difficulty]} is selected, but the quest state only unlocks ${difficultyBeaten} (raw progression ${save.character.progression}).`;
		}
		case "ImpossibleActSelection":
			return `${ACT_LABELS[save.character.act]} is selected, but it is not unlocked for ${DIFFICULTY_LABELS[save.character.difficulty]} (raw progression ${save.character.progression}).`;
		default: {
			const message = issue.message.trim();
			return message.length > 0 ? message : issue.code;
		}
	}
}
