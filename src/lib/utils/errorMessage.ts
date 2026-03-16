export function getErrorMessage(error: unknown, fallbackMessage = "Unknown error"): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	if (typeof error === "string" && error.trim().length > 0) {
		return error;
	}
	if (error != null && typeof error === "object") {
		const messageValue = (error as { message?: unknown }).message;
		if (typeof messageValue === "string" && messageValue.trim().length > 0) {
			return messageValue;
		}
		const errorValue = (error as { error?: unknown }).error;
		if (typeof errorValue === "string" && errorValue.trim().length > 0) {
			return errorValue;
		}
	}
	if (typeof error === "number" || typeof error === "boolean") {
		return String(error);
	}
	return fallbackMessage;
}
