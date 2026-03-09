<script>
	import Button from "../../components/ui/button/button.svelte";

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

<aside class="sticky top-4 rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]">
	{#if skillDetails == null}
		<p class="m-0 text-[0.9rem] text-halbu-textMuted">
			Select a skill to inspect details and edit points.
		</p>
	{:else}
		<header class="mb-[0.42rem] border-b border-halbu-border pb-[0.34rem]">
			<h3 class="editor-card-title">{skillDetails.name}</h3>
			<div class="mt-[0.26rem] flex flex-wrap items-center gap-[0.26rem]">
				<span
					class={`inline-flex items-center rounded-xs border px-[0.42rem] py-[0.14rem] text-[0.82rem] font-medium ${
						skillDetails.available
							? "border-halbu-border bg-halbu-panel2 text-halbu-textMuted"
							: "border-halbu-warning bg-halbu-warningSoft text-halbu-warning"
					}`}
				>
					{skillDetails.available ? "Ready" : "Locked"}
				</span>
				<span
					class={`inline-flex items-center rounded-xs border px-[0.42rem] py-[0.14rem] text-[0.82rem] font-medium ${
						skillDetails.levelRequirementMet
							? "border-halbu-border bg-halbu-panel2 text-halbu-textMuted"
							: "border-halbu-warning bg-halbu-warningSoft text-halbu-warning"
					}`}
				>
					Req Lvl {skillDetails.reqLevel}
				</span>
			</div>
		</header>

		<section>
			<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">Controls</h4>
			<label class="form-label mb-[0.16rem]" for="inspector-invested-points">Invested</label>
			<div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[0.24rem]">
				<Button
					type="button"
					variant="secondary"
					class="h-[1.85rem] w-[1.9rem] rounded-xs px-0"
					onclick={onDecrement}
					disabled={disabled || !canDecrement}
				>
					-
				</Button>
				<input
					id="inspector-invested-points"
					class="form-control text-right"
					type="number"
					min="0"
					max="255"
					step="1"
					value={skillDetails.currentPoints}
					oninput={handlePointsInput}
					disabled={disabled}
				/>
				<Button
					type="button"
					variant="secondary"
					class="h-[1.85rem] w-[1.9rem] rounded-xs px-0"
					onclick={onIncrement}
					disabled={disabled || !canIncrement}
				>
					+
				</Button>
			</div>
		</section>

		{#if skillDetails.description.length > 0}
			<section class="mt-[0.5rem] border-t border-halbu-border pt-[0.5rem]">
				<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">Description</h4>
				<p class="m-0 whitespace-pre-line text-[0.9rem] text-halbu-text">{skillDetails.description}</p>
			</section>
		{/if}

		<section class="mt-[0.5rem] border-t border-halbu-border pt-[0.5rem]">
			<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">Requirements</h4>
			{#if skillDetails.prerequisites.length === 0}
				<p class="m-0 text-[0.9rem] text-halbu-textMuted">Prerequisites: none</p>
			{:else}
				<ul class="m-0 grid list-none gap-[0.14rem] p-0 text-[0.9rem]">
					{#each skillDetails.prerequisites as prerequisite}
						<li class={prerequisite.met ? "text-halbu-info" : "text-halbu-warning"}>
							{prerequisite.name}
						</li>
					{/each}
				</ul>
			{/if}

			{#if skillDetails.lockReasons.length > 0}
				<ul class="m-0 mt-[0.3rem] grid list-none gap-[0.14rem] p-0 text-[0.9rem]">
					{#each skillDetails.lockReasons as reason}
						<li class="text-halbu-warning">{reason}</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if skillDetails.currentPoints === 0 && skillDetails.currentLines.length > 0}
			<section class="mt-[0.5rem] border-t border-halbu-border pt-[0.5rem]">
				<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">First level</h4>
				<ul class="m-0 grid list-none gap-[0.14rem] p-0 text-[0.9rem]">
					{#each skillDetails.currentLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if skillDetails.currentPoints > 0 && skillDetails.currentLines.length > 0}
			<section class="mt-[0.5rem] border-t border-halbu-border pt-[0.5rem]">
				<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">Current</h4>
				<ul class="m-0 grid list-none gap-[0.14rem] p-0 text-[0.9rem]">
					{#each skillDetails.currentLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if skillDetails.currentPoints > 0 && skillDetails.nextLevelLines.length > 0}
			<section class="mt-[0.5rem] border-t border-halbu-border pt-[0.5rem]">
				<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">Next level</h4>
				<ul class="m-0 grid list-none gap-[0.14rem] p-0 text-[0.9rem]">
					{#each skillDetails.nextLevelLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if skillDetails.synergyLines.length > 0}
			<section class="mt-[0.5rem] border-t border-halbu-border pt-[0.5rem]">
				<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">Synergies</h4>
				<ul class="m-0 grid list-none gap-[0.14rem] p-0 text-[0.9rem]">
					{#each skillDetails.synergyEntries as synergy}
						<li
							class={
								synergy.acquired === true
									? "text-halbu-info"
									: synergy.acquired === false
										? "text-halbu-textMuted"
										: "text-halbu-text"
							}
						>
							{synergy.line}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if skillDetails.extraLines.length > 0}
			<section class="mt-[0.5rem] border-t border-halbu-border pt-[0.5rem]">
				<h4 class="mb-[0.24rem] text-[0.88rem] font-medium text-halbu-textMuted">Notes</h4>
				<ul class="m-0 grid list-none gap-[0.14rem] p-0 text-[0.9rem]">
					{#each skillDetails.extraLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</aside>
