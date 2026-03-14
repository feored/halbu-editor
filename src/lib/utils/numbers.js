export function toFiniteInteger(value, fallback = 0) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return Math.trunc(parsed);
}

export function clampInteger(value, min, max, fallback = min) {
	const lowerBound = Math.min(min, max);
	const upperBound = Math.max(min, max);
	const normalized = toFiniteInteger(value, fallback);
	return Math.max(lowerBound, Math.min(upperBound, normalized));
}

export function clampByte(value, fallback = 0) {
	return clampInteger(value, 0, 255, fallback);
}

export function toPositiveIntegerOrNull(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	return Math.trunc(parsed);
}

export function toPositiveInteger(value, fallback = 1) {
	return toPositiveIntegerOrNull(value) ?? fallback;
}

export function toNonNegativeIntegerOrNull(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}
	return Math.trunc(parsed);
}

export function toUInt32OrNull(value) {
	const normalized = toNonNegativeIntegerOrNull(value);
	if (normalized == null) {
		return null;
	}
	return normalized >>> 0;
}
