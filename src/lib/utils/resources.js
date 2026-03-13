export const RESOURCE_Q8_SCALE = 256;

export function fixedPointToDisplay(value, scale = RESOURCE_Q8_SCALE) {
	const parsedValue = Number(value);
	const parsedScale = Number(scale);
	if (!Number.isFinite(parsedValue) || !Number.isFinite(parsedScale) || parsedScale === 0) {
		return 0;
	}
	return parsedValue / parsedScale;
}

export function displayToFixedPoint(value, scale = RESOURCE_Q8_SCALE) {
	const parsedValue = Number(value);
	const parsedScale = Number(scale);
	if (!Number.isFinite(parsedValue) || !Number.isFinite(parsedScale) || parsedScale === 0) {
		return 0;
	}
	return Math.round(parsedValue * parsedScale);
}

export function formatDisplayNumber(value, maxFractionDigits = 3) {
	const parsedValue = Number(value);
	if (!Number.isFinite(parsedValue)) {
		return "0";
	}
	if (Number.isInteger(parsedValue)) {
		return `${parsedValue}`;
	}
	return parsedValue.toFixed(maxFractionDigits).replace(/\.?0+$/, "");
}
