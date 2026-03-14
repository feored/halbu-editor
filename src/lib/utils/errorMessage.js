/**
 * Extract a user-facing message from an unknown error value.
 * Keeps original error objects intact at throw/log sites and only formats when needed for UI.
 *
 * @param {unknown} error
 * @param {string} fallbackMessage
 */
export function getErrorMessage(error, fallbackMessage = "Unknown error") {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	if (typeof error === "string" && error.trim().length > 0) {
		return error;
	}
	if (error != null && typeof error === "object") {
		if (
			"message" in error &&
			typeof error.message === "string" &&
			error.message.trim().length > 0
		) {
			return error.message;
		}
		if (
			"error" in error &&
			typeof error.error === "string" &&
			error.error.trim().length > 0
		) {
			return error.error;
		}
	}
	if (typeof error === "number" || typeof error === "boolean") {
		return String(error);
	}
	return fallbackMessage;
}
