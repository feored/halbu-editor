<script>
	let {
		skillDetails,
		disabled,
		canIncrement,
		canDecrement,
		onIncrement,
		onDecrement,
		onSetPoints,
	} = $props();

	function handlePointsInput(event) {
		const parsed = Number(event.currentTarget.value);
		if (Number.isFinite(parsed)) {
			onSetPoints(parsed);
		}
	}
</script>

<aside class="skills-inspector card bg-custom-light border-0 sticky-top">
	{#if skillDetails == null}
		<div class="card-body">
			<div class="alert alert-secondary mb-0">Select a skill to inspect details and edit points.</div>
		</div>
	{:else}
		<header class="card-header bg-transparent border-bottom">
			<h3 class="h5 m-0">{skillDetails.name}</h3>
			<div class="d-flex flex-wrap align-items-center gap-2 mt-2">
				<span class={`badge ${skillDetails.available ? "text-bg-secondary" : "text-bg-warning"}`}>
					{skillDetails.available ? "Ready" : "Locked"}
				</span>
				<span class={`badge ${skillDetails.levelRequirementMet ? "text-bg-secondary" : "text-bg-warning"}`}>
					Req Lvl {skillDetails.reqLevel}
				</span>
			</div>
		</header>

		<div class="card-body pt-3">
			<section class="inspector-section">
				<h4 class="inspector-section__title">Controls</h4>
				<label class="form-label text-uppercase small fw-semibold mb-1" for="inspector-invested-points">
					Invested
				</label>
				<div class="input-group">
					<button
						type="button"
						class="btn btn-outline-secondary inspector-control-btn"
						onclick={onDecrement}
						disabled={disabled || !canDecrement}
					>
						-
					</button>
					<input
						id="inspector-invested-points"
						class="form-control text-end"
						type="number"
						min="0"
						max="255"
						step="1"
						value={skillDetails.currentPoints}
						oninput={handlePointsInput}
						disabled={disabled}
					/>
					<button
						type="button"
						class="btn btn-outline-secondary inspector-control-btn"
						onclick={onIncrement}
						disabled={disabled || !canIncrement}
					>
						+
					</button>
				</div>
			</section>

			{#if skillDetails.description.length > 0}
				<section class="inspector-section">
					<h4 class="inspector-section__title">Description</h4>
					<p class="small skill-description mb-0">{skillDetails.description}</p>
				</section>
			{/if}

			<section class="inspector-section">
				<h4 class="inspector-section__title">Requirements</h4>
				{#if skillDetails.prerequisites.length === 0}
					<p class="small text-body-secondary mb-0">Prerequisites: none</p>
				{:else}
					<ul class="list-unstyled d-grid gap-1 mb-0 small">
						{#each skillDetails.prerequisites as prerequisite}
							<li class={`inspector-line ${prerequisite.met ? "inspector-line--met" : "inspector-line--warning"}`}>
								{prerequisite.name}
							</li>
						{/each}
					</ul>
				{/if}

				{#if skillDetails.lockReasons.length > 0}
					<ul class="list-unstyled d-grid gap-1 mb-0 small mt-2">
						{#each skillDetails.lockReasons as reason}
							<li class="inspector-line inspector-line--warning">{reason}</li>
						{/each}
					</ul>
				{/if}
			</section>

			{#if skillDetails.currentPoints === 0 && skillDetails.currentLines.length > 0}
				<section class="inspector-section">
					<h4 class="inspector-section__title">First Level</h4>
					<ul class="list-unstyled d-grid gap-1 mb-0 small">
						{#each skillDetails.currentLines as line}
							<li class="inspector-line">{line}</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if skillDetails.currentPoints > 0 && skillDetails.currentLines.length > 0}
				<section class="inspector-section">
					<h4 class="inspector-section__title">Current</h4>
					<ul class="list-unstyled d-grid gap-1 mb-0 small">
						{#each skillDetails.currentLines as line}
							<li class="inspector-line">{line}</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if skillDetails.currentPoints > 0 && skillDetails.nextLevelLines.length > 0}
				<section class="inspector-section">
					<h4 class="inspector-section__title">Next Level</h4>
					<ul class="list-unstyled d-grid gap-1 mb-0 small">
						{#each skillDetails.nextLevelLines as line}
							<li class="inspector-line">{line}</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if skillDetails.synergyLines.length > 0}
				<section class="inspector-section">
					<h4 class="inspector-section__title">Synergies</h4>
					<ul class="list-unstyled d-grid gap-1 mb-0 small">
						{#each skillDetails.synergyEntries as synergy}
							<li
								class={`inspector-line ${synergy.acquired === true ? "inspector-line--met" : synergy.acquired === false ? "inspector-line--synergy-unacquired" : ""}`}
							>
								{synergy.line}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if skillDetails.extraLines.length > 0}
				<section class="inspector-section">
					<h4 class="inspector-section__title">Notes</h4>
					<ul class="list-unstyled d-grid gap-1 mb-0 small">
						{#each skillDetails.extraLines as line}
							<li class="inspector-line">{line}</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.skills-inspector {
		top: 1rem;
		border: 1px solid rgba(var(--bs-secondary-rgb), 0.25);
		border-radius: 0.6rem;
		box-shadow: none;
	}

	.skills-inspector .card-header {
		border-color: rgba(var(--bs-secondary-rgb), 0.25) !important;
	}

	.skills-inspector .badge {
		font-weight: 600;
	}

	.inspector-section {
		margin-top: 0.9rem;
		padding-top: 0.9rem;
		border-top: 1px solid rgba(var(--bs-secondary-rgb), 0.2);
	}

	.inspector-section:first-of-type {
		margin-top: 0;
		padding-top: 0;
		border-top: 0;
	}

	.inspector-section__title {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--bs-secondary-color);
		margin: 0 0 0.45rem 0;
	}

	.inspector-line {
		padding: 0.1rem 0;
		color: var(--bs-body-color);
	}

	.inspector-line--warning {
		color: var(--bs-warning-text-emphasis);
	}

	.inspector-line--met {
		color: var(--bs-primary-text-emphasis);
	}

	.inspector-line--synergy-unacquired {
		color: rgba(var(--bs-warning-rgb), 0.78);
	}

	.inspector-control-btn {
		min-width: 2rem;
	}

	.skill-description {
		white-space: pre-line;
	}
</style>
