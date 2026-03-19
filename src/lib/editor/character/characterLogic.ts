import {
	clampInteger,
	fixedPointToDisplay,
	getMaxValueForBitLength,
	toUInt32OrNull,
} from "$lib/utils/numbers";

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
