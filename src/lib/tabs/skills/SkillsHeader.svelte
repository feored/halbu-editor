<script>
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

<header class="skills-header d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-2">
	<h2 class="skills-header__title m-0">{title}</h2>

	<div class="d-flex flex-wrap align-items-end gap-3">
		<div>
			<label class="form-label text-uppercase small fw-semibold mb-1" for="skills-points-left"
				>Available Points</label
			>
			<input
				id="skills-points-left"
				class="form-control text-end"
				style="min-width: 8.5rem;"
				type="number"
				min="0"
				max="255"
				step="1"
				value={pointsLeft}
				disabled={disabled}
				oninput={handlePointsChange}
			/>
		</div>

		<button class="btn btn-outline-primary" type="button" onclick={onRefund} disabled={disabled}>
			Refund All Points
		</button>
	</div>
</header>

<style>
	.skills-header {
		margin-bottom: 0.5rem;
	}

	.skills-header__title {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--bs-body-color);
	}
</style>
