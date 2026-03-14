import { clampInteger, toUInt32OrNull } from "../../utils/numbers.js";
import { displayToFixedPoint, fixedPointToDisplay } from "../../utils/resources.js";

export function formatMapSeedValue(value: number, displayMode: string): string {
	const normalizedValue = toUInt32OrNull(value);
	if (normalizedValue == null) {
		return "";
	}
	if (displayMode === "hex") {
		return `0x${normalizedValue.toString(16).toUpperCase().padStart(8, "0")}`;
	}
	return String(normalizedValue);
}

export function parseMapSeedDraft(value: string, maxValue: number): number | null {
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
	const clampedValue = clampInteger(parsedValue, 0, maxValue);
	return clampedValue >>> 0;
}

export function resolveResourceDisplayValue(
	storedValue: number,
	bitLength: number,
	scale: number,
): number {
	const rawMaxValue = Math.pow(2, bitLength) - 1;
	const clampedStoredValue = clampInteger(storedValue, 0, rawMaxValue);
	return fixedPointToDisplay(clampedStoredValue, scale);
}

export function commitResourceDraftValue(
	draftValue: string,
	fallbackDisplayValue: number,
	bitLength: number,
	displayMin: number,
	displayMax: number,
	scale: number,
): number {
	const parsedDisplayValue = Number.parseFloat(draftValue.trim());
	const clampedDisplayValue = clampInteger(
		Number.isFinite(parsedDisplayValue) ? parsedDisplayValue : fallbackDisplayValue,
		displayMin,
		displayMax,
	);
	const rawMaxValue = Math.pow(2, bitLength) - 1;
	return clampInteger(displayToFixedPoint(clampedDisplayValue, scale), 0, rawMaxValue);
}
