import type { ActionReturn } from "svelte/action";

export function enforceMinMax(input: HTMLInputElement): ActionReturn {
	function clamp(): void {
		if (input.value === "") {
			input.value = input.min;
			return;
		}

		const value = Number(input.value);
		const min = Number(input.min);
		const max = Number(input.max);

		if (value < min) {
			input.value = input.min;
		} else if (value > max) {
			input.value = input.max;
		}
	}

	input.addEventListener("input", clamp);
	input.addEventListener("change", clamp);

	return {
		destroy() {
			input.removeEventListener("input", clamp);
			input.removeEventListener("change", clamp);
		},
	};
}
