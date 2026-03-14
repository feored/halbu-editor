import type { EditValidation } from "../../types/editor";

const NAME_PATTERN = /^\p{L}[\p{L}_-]*$/u;

export type CharacterNameValidationResult = {
	valid: boolean;
	message: string;
	value: string;
};

export function validateCharacterName(value: string): CharacterNameValidationResult {
	const normalizedValue = value;
	let message = "";
	const characters = Array.from(normalizedValue).length;
	if (characters < 2 || characters > 15) {
		message = "Name must be 2-15 characters";
	}
	if (message.length === 0 && !NAME_PATTERN.test(normalizedValue)) {
		message = "Name must start with a letter and only contain letters, _ or -";
	}
	let dashes = 0;
	let underscores = 0;
	for (const char of normalizedValue) {
		if (char === "-") {
			dashes += 1;
		} else if (char === "_") {
			underscores += 1;
		}
	}
	if (message.length === 0 && (dashes > 1 || underscores > 1)) {
		message = "Name can only contain 1 _ or -";
	}

	return {
		valid: message.length === 0,
		message,
		value: normalizedValue,
	};
}

export function experienceForLevel(level: number, table: readonly number[]): number {
	return table[level - 1];
}

export function levelForExperience(experience: number, table: readonly number[]): number {
	let resolvedLevel = table.length;
	for (let index = 0; index < table.length; index += 1) {
		if (table[index] > experience) {
			resolvedLevel = index;
			break;
		}
	}
	return resolvedLevel;
}

export function buildCharacterEditValidation(
	validName: boolean,
	nameValidationMessage: string,
	classSupportWarning: string,
): EditValidation {
	const errors: string[] = [];
	const warnings: string[] = [];
	if (!validName) {
		errors.push(
			nameValidationMessage.length > 0 ? nameValidationMessage : "Character name is invalid.",
		);
	}
	if (classSupportWarning.length > 0) {
		warnings.push(classSupportWarning);
	}
	return { errors, warnings };
}
