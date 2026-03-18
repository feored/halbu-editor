import type { EditValidation } from "$lib/types/editor";

import {
	clampInteger,
	fixedPointToDisplay,
	getMaxValueForBitLength,
	toUInt32OrNull,
} from "$lib/utils/numbers";

const NAME_PATTERN = /^\p{L}[\p{L}_-]*$/u;

export type CharacterNameValidationResult = {
	valid: boolean;
	message: string;
	value: string;
};

export function formatMapSeedValue(value: number, displayMode: "decimal" | "hex"): string {
	const normalizedValue = toUInt32OrNull(value);
	if (normalizedValue == null) {
		return "";
	}

	if (displayMode === "hex") {
		return `0x${normalizedValue.toString(16).toUpperCase().padStart(8, "0")}`;
	}

	return String(normalizedValue);
}

export function parseMapSeedInput(value: string, maxValue: number): number | null {
	const normalizedValue = value.trim();

	let parsedValue = Number.NaN;

	if (/^0x[0-9a-f]+$/i.test(normalizedValue)) {
		parsedValue = Number.parseInt(normalizedValue.slice(2), 16);
	} else if (/^[0-9]+$/.test(normalizedValue)) {
		parsedValue = Number.parseInt(normalizedValue, 10);
	}

	if (!Number.isFinite(parsedValue)) {
		return null;
	}

	return clampInteger(parsedValue, 0, maxValue) >>> 0;
}

export function resolveResourceDisplayValue(
	storedValue: number,
	bitLength: number,
	scale: number,
): number {
	const maxValue = getMaxValueForBitLength(bitLength);
	const clampedStoredValue = clampInteger(storedValue, 0, maxValue);
	return fixedPointToDisplay(clampedStoredValue, scale);
}

export function validateCharacterName(value: string): CharacterNameValidationResult {
	let message = "";

	const characterCount = Array.from(value).length;
	if (characterCount < 2 || characterCount > 15) {
		message = "Name must be 2-15 characters";
	}

	if (message.length === 0 && !NAME_PATTERN.test(value)) {
		message = "Name must start with a letter and only contain letters, _ or -";
	}

	let dashCount = 0;
	let underscoreCount = 0;

	for (const character of value) {
		if (character === "-") {
			dashCount += 1;
		} else if (character === "_") {
			underscoreCount += 1;
		}
	}

	if (message.length === 0 && (dashCount > 1 || underscoreCount > 1)) {
		message = "Name can only contain 1 _ or -";
	}

	return {
		valid: message.length === 0,
		message,
		value,
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
	progressionValidationWarning: string,
): EditValidation {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!validName) {
		errors.push(
			nameValidationMessage.length > 0
				? nameValidationMessage
				: "Character name is invalid.",
		);
	}

	if (classSupportWarning.length > 0) {
		warnings.push(classSupportWarning);
	}

	if (progressionValidationWarning.length > 0) {
		warnings.push(progressionValidationWarning);
	}

	return { errors, warnings };
}
