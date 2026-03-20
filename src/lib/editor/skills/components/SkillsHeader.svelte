<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import {
		cancelFieldEdit,
		finishFieldEdit,
		initFieldEdit,
		setFieldError,
		setFieldInput,
		startFieldEdit,
		syncFieldFromValue,
	} from "$lib/utils/fieldEdit";
	import { clampSkillPoints, MAX_SKILL_POINTS } from "$lib/editor/skills/skillsSlots";

	let {
		pointsLeft,
		disabled,
		onPointsLeftChange,
		onRefund,
	} = $props<{
		pointsLeft: number;
		disabled: boolean;
		onPointsLeftChange: (pointsLeft: number) => void;
		onRefund: () => void;
	}>();

	let pointsEdit = $state(initFieldEdit(""));

	function finishPointsEdit(): void {
		const parsed = Number(pointsEdit.input);
		if (Number.isFinite(parsed)) {
			const clampedPoints = clampSkillPoints(parsed);
			onPointsLeftChange(clampedPoints);
			finishFieldEdit(pointsEdit);
			syncFieldFromValue(pointsEdit, String(clampedPoints));
			return;
		}

		setFieldError(pointsEdit, "Enter a number.");
		cancelFieldEdit(pointsEdit, String(pointsLeft));
	}

	function handlePointsInput(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		setFieldInput(pointsEdit, input.value);

		const parsed = Number(input.value);
		if (!Number.isFinite(parsed)) {
			return;
		}

		onPointsLeftChange(clampSkillPoints(parsed));
	}

	function handlePointsKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			finishPointsEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(pointsEdit, String(pointsLeft));
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	$effect(() => {
		syncFieldFromValue(pointsEdit, String(pointsLeft));
	});
</script>

<header class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-1.5">
	<div class="flex flex-wrap items-center justify-end gap-1.5">
		<div class="flex items-center gap-1.5">
			<label class="form-label mb-0" for="skills-points-left">Available points</label>
			<input
				id="skills-points-left"
				class="form-control h-7 w-32 text-right"
				type="number"
				min="0"
				max={MAX_SKILL_POINTS}
				step="1"
				value={pointsEdit.input}
				disabled={disabled}
				onfocus={() => startFieldEdit(pointsEdit, String(pointsLeft))}
				oninput={handlePointsInput}
				onblur={finishPointsEdit}
				onkeydown={handlePointsKeydown}
			/>
		</div>

		<Button variant="secondary" type="button" onclick={onRefund} {disabled}>
			Refund All Points
		</Button>
	</div>
</header>
