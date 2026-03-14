<script>
	import Button from "../../components/ui/button/button.svelte";
	import { clampSkillPoints } from "./skillSlots";

let {
		pointsLeft,
		disabled,
		onPointsLeftChange,
		onRefund,
	} = $props();

	function handlePointsChange(event) {
		const parsed = Number(event.currentTarget.value);
		if (Number.isFinite(parsed)) {
			onPointsLeftChange(clampSkillPoints(parsed));
		}
	}
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
				max="255"
				step="1"
				value={pointsLeft}
				disabled={disabled}
				oninput={handlePointsChange}
			/>
		</div>

		<Button variant="secondary" type="button" onclick={onRefund} disabled={disabled}>
			Refund All Points
		</Button>
	</div>
</header>
