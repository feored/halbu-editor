<script>
	import SkillTreeSection from "./SkillTreeSection.svelte";

	let {
		pageIndexes,
		skillPageNames,
		skillsData,
		skillStatesById,
		activePageIndex,
		selectedSkillId,
		onPageSelect,
		onSelect,
		onIncrement,
		onDecrement,
	} = $props();

	function skillsForPage(pageIndex) {
		return skillsData.filter((skill) => skill.page === pageIndex + 1);
	}

	function pageTitle(pageIndex) {
		return skillPageNames[pageIndex] ?? `Skill Page ${pageIndex + 1}`;
	}
</script>

<section class="w-full min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
	{#if pageIndexes.length > 1}
		<div class="mb-1.5 flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-halbu-border bg-halbu-panel px-1.5 py-1.5">
			{#each pageIndexes as pageIndex}
				<button
					type="button"
					class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
						activePageIndex === pageIndex
							? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
							: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
					}`}
					onclick={() => onPageSelect(pageIndex)}
				>
					{pageTitle(pageIndex)}
				</button>
			{/each}
		</div>
	{/if}

	{#if activePageIndex != null}
		<SkillTreeSection
			skills={skillsForPage(activePageIndex)}
			skillStatesById={skillStatesById}
			selectedSkillId={selectedSkillId}
			onSelect={onSelect}
			onIncrement={onIncrement}
			onDecrement={onDecrement}
		/>
	{/if}
</section>
