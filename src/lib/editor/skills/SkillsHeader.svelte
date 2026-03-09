<script>
	import Button from "../../components/ui/button/button.svelte";

	let {
		title,
		pointsLeft,
		disabled,
		onPointsLeftChange,
		onRefund,
	} = $props();

	function handlePointsChange(event) {
		const parsed = Number(event.currentTarget.value);
		if (Number.isFinite(parsed)) {
			onPointsLeftChange(Math.max(0, Math.min(255, Math.trunc(parsed))));
		}
	}
</script>

<header class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.42rem]">
	<div class="flex flex-col gap-[0.36rem] lg:flex-row lg:items-center lg:justify-between">
		<h3 class="editor-card-title">{title}</h3>

		<div class="flex flex-wrap items-center gap-[0.42rem]">
			<div class="flex items-center gap-[0.32rem]">
				<label class="form-label mb-0" for="skills-points-left">Available points</label>
				<input
					id="skills-points-left"
					class="form-control h-[1.85rem] w-[8.5rem] text-right"
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
	</div>
</header>
