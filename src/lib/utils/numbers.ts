function toFiniteInteger(value: unknown, fallback = 0): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return Math.trunc(parsed);
}

export function clampInteger(value: unknown, min: number, max: number, fallback = min): number {
	const lowerBound = Math.min(min, max);
	const upperBound = Math.max(min, max);
	const normalized = toFiniteInteger(value, fallback);
	return Math.max(lowerBound, Math.min(upperBound, normalized));
}

export function clampByte(value: unknown, fallback = 0): number {
	return clampInteger(value, 0, 255, fallback);
}

export const RESOURCE_Q8_SCALE = 256;

function toPositiveIntegerOrNull(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	return Math.trunc(parsed);
}

export function toPositiveInteger(value: unknown, fallback = 1): number {
	return toPositiveIntegerOrNull(value) ?? fallback;
}

function toNonNegativeIntegerOrNull(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}
	return Math.trunc(parsed);
}

export function toUInt32OrNull(value: unknown): number | null {
	const normalized = toNonNegativeIntegerOrNull(value);
	if (normalized == null) {
		return null;
	}
	return normalized >>> 0;
}

export function getMaxValueForBitLength(bitLength: number): number {
	return 2 ** bitLength - 1;
}

export function fixedPointToDisplay(value: unknown, scale: unknown = RESOURCE_Q8_SCALE): number {
	const parsedValue = Number(value);
	const parsedScale = Number(scale);
	if (!Number.isFinite(parsedValue) || !Number.isFinite(parsedScale) || parsedScale === 0) {
		return 0;
	}
	return parsedValue / parsedScale;
}

export function formatDisplayNumber(value: unknown, maxFractionDigits = 3): string {
	const parsedValue = Number(value);
	if (!Number.isFinite(parsedValue)) {
		return "0";
	}
	if (Number.isInteger(parsedValue)) {
		return `${parsedValue}`;
	}
	return parsedValue.toFixed(maxFractionDigits).replace(/\.?0+$/, "");
}