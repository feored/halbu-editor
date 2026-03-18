export type FieldEditState = {
	input: string;
	editing: boolean;
	error: string;
};

export function initFieldEdit(initialInput: string): FieldEditState {
	return {
		input: initialInput,
		editing: false,
		error: "",
	};
}

export function startFieldEdit(
	fieldEdit: FieldEditState,
	currentInput: string,
): void {
	fieldEdit.input = currentInput;
	fieldEdit.editing = true;
	fieldEdit.error = "";
}

export function setFieldInput(
	fieldEdit: FieldEditState,
	nextInput: string,
): void {
	fieldEdit.input = nextInput;
	fieldEdit.error = "";
}

export function syncFieldFromValue(
	fieldEdit: FieldEditState,
	currentInput: string,
): void {
	if (fieldEdit.editing) {
		return;
	}

	fieldEdit.input = currentInput;
	fieldEdit.error = "";
}

export function cancelFieldEdit(
	fieldEdit: FieldEditState,
	currentInput: string,
): void {
	fieldEdit.input = currentInput;
	fieldEdit.editing = false;
	fieldEdit.error = "";
}

export function finishFieldEdit(fieldEdit: FieldEditState): void {
	fieldEdit.editing = false;
	fieldEdit.error = "";
}

export function setFieldError(
	fieldEdit: FieldEditState,
	error: string,
): void {
	fieldEdit.error = error;
}