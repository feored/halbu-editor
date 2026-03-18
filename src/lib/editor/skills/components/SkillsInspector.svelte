<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { AlertCircleIcon, CheckIcon, ChevronRightIcon } from "lucide-svelte";
	import {
		cancelFieldEdit,
		finishFieldEdit,
		initFieldEdit,
		setFieldError,
		setFieldInput,
		startFieldEdit,
		syncFieldFromValue,
	} from "$lib/utils/fieldEdit";
	import { clampSkillPoints } from "$lib/editor/skills/skillsSlots";
	import type { SkillDetails } from "$lib/editor/skills/skillsDescriptions";

	let {
		skillDetails,
		disabled,
		canIncrement,
		canDecrement,
		onIncrement,
		onDecrement,
		onSetPoints,
	} = $props<{
		skillDetails: SkillDetails | null;
		disabled: boolean;
		canIncrement: boolean;
		canDecrement: boolean;
		onIncrement: () => void;
		onDecrement: () => void;
		onSetPoints: (points: number) => void;
	}>();

	let pointsEdit = $state(initFieldEdit(""));

	function finishPointsEdit(): void {
		if (skillDetails == null) {
			return;
		}

		const parsed = Number(pointsEdit.input);
		if (Number.isFinite(parsed)) {
			const clampedPoints = clampSkillPoints(parsed);
			onSetPoints(clampedPoints);
			finishFieldEdit(pointsEdit);
			syncFieldFromValue(pointsEdit, String(clampedPoints));
			return;
		}

		setFieldError(pointsEdit, "Enter a number.");
		cancelFieldEdit(pointsEdit, String(skillDetails.currentPoints));
	}

	function handlePointsKeydown(event: KeyboardEvent): void {
		if (skillDetails == null) {
			return;
		}

		if (event.key === "Enter") {
			event.preventDefault();
			finishPointsEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(pointsEdit, String(skillDetails.currentPoints));
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	let firstLevelOpen = $state(true);
	let synergiesOpen = $state(true);
	let descriptionOpen = $state(false);

	$effect(() => {
		if (skillDetails == null) {
			syncFieldFromValue(pointsEdit, "");
			return;
		}

		syncFieldFromValue(pointsEdit, String(skillDetails.currentPoints));
	});
</script>

<aside
	class="rounded-sm border border-halbu-borderStrong border-l-2 border-l-halbu-borderStrong bg-halbu-bg px-2.5 py-2"
>
	{#if skillDetails == null}
		<p class="m-0 text-sm text-halbu-textMuted">
			Select a skill to inspect details and edit points.
		</p>
	{:else}
		<header class="mb-1.5 border-b border-halbu-border pb-1.5">
			<h3 class="editor-card-title">{skillDetails.name}</h3>
			<div class="mt-1 flex flex-wrap items-center gap-1">
				<span
					class="inline-flex items-center gap-1 rounded-xs border border-halbu-border bg-halbu-panel2 px-1.5 py-0.5 text-sm font-medium text-halbu-textMuted"
				>
					{#if skillDetails.available}
						<CheckIcon size={12} strokeWidth={2} />
					{:else}
						<AlertCircleIcon size={12} strokeWidth={2} />
					{/if}
					{skillDetails.available ? "Ready" : "Locked"}
				</span>
				<span
					class="inline-flex items-center gap-1 rounded-xs border border-halbu-border bg-halbu-panel2 px-1.5 py-0.5 text-sm font-medium text-halbu-textMuted"
				>
					{#if skillDetails.levelRequirementMet}
						<CheckIcon size={12} strokeWidth={2} />
					{:else}
						<AlertCircleIcon size={12} strokeWidth={2} />
					{/if}
					Req Lvl {skillDetails.reqLevel}
				</span>
			</div>
		</header>

		<section>
			<label class="form-label mb-0.5" for="inspector-invested-points">Invested</label>
			<div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
				<Button
					type="button"
					variant="secondary"
					class="h-8 w-9 rounded-xs px-0"
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
					value={pointsEdit.input}
					onfocus={() => startFieldEdit(pointsEdit, String(skillDetails.currentPoints))}
					oninput={(event) => setFieldInput(pointsEdit, event.currentTarget.value)}
					onblur={finishPointsEdit}
					onkeydown={handlePointsKeydown}
					{disabled}
				/>
				<Button
					type="button"
					variant="secondary"
					class="h-8 w-9 rounded-xs px-0"
					onclick={onIncrement}
					disabled={disabled || !canIncrement}
				>
					+
				</Button>
			</div>
		</section>

		{#if skillDetails.extraLines.length > 0}
			<section class="mt-2 border-t border-halbu-border pt-2">
				<h4 class="mb-1 text-sm font-medium text-halbu-textMuted">Misc</h4>
				<ul class="m-0 grid list-none gap-0.5 p-0 text-sm">
					{#each skillDetails.extraLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="mt-2 border-t border-halbu-border pt-2">
			<h4 class="mb-1 text-sm font-medium text-halbu-textMuted">Requirements</h4>
			{#if skillDetails.prerequisites.length === 0}
				<p class="m-0 text-sm text-halbu-textMuted">Prerequisites: none</p>
			{:else}
				<ul class="m-0 grid list-none gap-0.5 p-0 text-sm">
					{#each skillDetails.prerequisites as prerequisite}
						<li class="inline-flex items-center gap-1 text-halbu-text">
							{#if prerequisite.met}
								<CheckIcon
									size={13}
									strokeWidth={2}
									class="shrink-0 text-halbu-textMuted"
								/>
							{:else}
								<AlertCircleIcon
									size={13}
									strokeWidth={2}
									class="shrink-0 text-halbu-textMuted"
								/>
							{/if}
							{prerequisite.name}
						</li>
					{/each}
				</ul>
			{/if}

			{#if skillDetails.lockReasons.length > 0}
				<ul class="m-0 mt-1 grid list-none gap-0.5 p-0 text-sm">
					{#each skillDetails.lockReasons as reason}
						<li class="inline-flex items-center gap-1 text-halbu-textMuted">
							<AlertCircleIcon
								size={13}
								strokeWidth={2}
								class="shrink-0 text-halbu-textMuted"
							/>
							{reason}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if skillDetails.currentPoints === 0 && skillDetails.currentLines.length > 0}
			<details class="mt-2 border-t border-halbu-border pt-2" bind:open={firstLevelOpen}>
				<summary class="collapsible-summary">
					<ChevronRightIcon
						size={13}
						strokeWidth={2}
						class={`text-halbu-textMuted transition-transform ${
							firstLevelOpen ? "rotate-90" : ""
						}`}
					/>
					<span>First Level Stats</span>
				</summary>
				<ul class="m-0 mt-1 grid list-none gap-0.5 p-0 text-sm">
					{#each skillDetails.currentLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</details>
		{/if}

		{#if skillDetails.currentPoints > 0 && skillDetails.currentLines.length > 0}
			<section class="mt-2 border-t border-halbu-border pt-2">
				<h4 class="mb-1 text-sm font-medium text-halbu-textMuted">Current</h4>
				<ul class="m-0 grid list-none gap-0.5 p-0 text-sm">
					{#each skillDetails.currentLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if skillDetails.currentPoints > 0 && skillDetails.nextLevelLines.length > 0}
			<section class="mt-2 border-t border-halbu-border pt-2">
				<h4 class="mb-1 text-sm font-medium text-halbu-textMuted">Next level</h4>
				<ul class="m-0 grid list-none gap-0.5 p-0 text-sm">
					{#each skillDetails.nextLevelLines as line}
						<li class="text-halbu-text">{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if skillDetails.synergyLines.length > 0}
			<details class="mt-2 border-t border-halbu-border pt-2" bind:open={synergiesOpen}>
				<summary class="collapsible-summary">
					<ChevronRightIcon
						size={13}
						strokeWidth={2}
						class={`text-halbu-textMuted transition-transform ${
							synergiesOpen ? "rotate-90" : ""
						}`}
					/>
					<span>Synergies</span>
				</summary>
				<ul class="m-0 mt-1 grid list-none gap-0.5 p-0 text-sm">
					{#each skillDetails.synergyEntries as synergy}
						<li class="inline-flex items-center gap-1 text-halbu-text">
							{#if synergy.acquired === true}
								<CheckIcon
									size={13}
									strokeWidth={2}
									class="shrink-0 text-halbu-textMuted"
								/>
							{:else if synergy.acquired === false}
								<AlertCircleIcon
									size={13}
									strokeWidth={2}
									class="shrink-0 text-halbu-textMuted"
								/>
							{/if}
							{synergy.line}
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		{#if skillDetails.description.length > 0}
			<details class="mt-2 border-t border-halbu-border pt-2" bind:open={descriptionOpen}>
				<summary class="collapsible-summary">
					<ChevronRightIcon
						size={13}
						strokeWidth={2}
						class={`text-halbu-textMuted transition-transform ${
							descriptionOpen ? "rotate-90" : ""
						}`}
					/>
					<span>Description</span>
				</summary>
				<p class="m-0 mt-1 whitespace-pre-line text-sm text-halbu-text">
					{skillDetails.description}
				</p>
			</details>
		{/if}
	{/if}
</aside>

<style>
	.collapsible-summary {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
		list-style: none;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--halbu-text-muted);
	}

	.collapsible-summary::-webkit-details-marker {
		display: none;
	}
</style>
