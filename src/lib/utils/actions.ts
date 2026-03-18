import type { ActionReturn } from "svelte/action";

export function enforceMinMax(inputElement: HTMLInputElement): ActionReturn {
	const handleInputChange = () => {
		if (inputElement.value === "") {
			inputElement.value = inputElement.min;
			return;
		}

		if (parseFloat(inputElement.value) < parseFloat(inputElement.min)) {
			inputElement.value = inputElement.min;
		}
		if (parseFloat(inputElement.value) > parseFloat(inputElement.max)) {
			inputElement.value = inputElement.max;
		}
	};

	inputElement.addEventListener("input", handleInputChange);
	inputElement.addEventListener("change", handleInputChange);

	return {
		destroy() {
			inputElement.removeEventListener("input", handleInputChange);
			inputElement.removeEventListener("change", handleInputChange);
		},
	};
}
