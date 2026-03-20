export const RESOURCE_Q8_SCALE = 256;

export function clampInteger(value: unknown, min: number, max: number, fallback = min): number {
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) {
		return Math.max(lower, Math.min(upper, fallback));
	}

	return Math.max(lower, Math.min(upper, Math.trunc(parsed)));
}

export function toPositiveInteger(value: unknown, fallback = 1): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return Math.trunc(parsed);
}

export function toUInt32OrNull(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}

	return Math.trunc(parsed) >>> 0;
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
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return "0";
	}

	if (Number.isInteger(parsed)) {
		return String(parsed);
	}

	return parsed.toFixed(maxFractionDigits).replace(/\.?0+$/, "");
}
