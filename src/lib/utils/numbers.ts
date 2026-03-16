export function toFiniteInteger(value: unknown, fallback = 0): number {
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

export function toPositiveIntegerOrNull(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	return Math.trunc(parsed);
}

export function toPositiveInteger(value: unknown, fallback = 1): number {
	return toPositiveIntegerOrNull(value) ?? fallback;
}

export function toNonNegativeIntegerOrNull(value: unknown): number | null {
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
