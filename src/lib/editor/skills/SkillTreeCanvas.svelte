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
		return skillsData.filter((skill) => Number(skill.page) === Number(pageIndex) + 1);
	}

	function pageTitle(pageIndex) {
		return skillPageNames[pageIndex] ?? `Skill Page ${pageIndex + 1}`;
	}
</script>

<section class="inline-block w-max max-w-full rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]">
	{#if pageIndexes.length > 1}
		<div class="mb-[0.42rem] flex min-h-[2.5rem] w-fit items-center gap-[0.38rem] rounded-sm border border-halbu-border bg-halbu-panel px-[0.34rem] py-[0.34rem]">
			{#each pageIndexes as pageIndex}
				<button
					type="button"
					class={`rounded-xs border px-[0.72rem] py-[0.36rem] text-[0.92rem] font-medium leading-none transition ${
						Number(activePageIndex) === Number(pageIndex)
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
			title={pageTitle(activePageIndex)}
			showTitle={pageIndexes.length <= 1}
			skills={skillsForPage(activePageIndex)}
			skillStatesById={skillStatesById}
			selectedSkillId={selectedSkillId}
			onSelect={onSelect}
			onIncrement={onIncrement}
			onDecrement={onDecrement}
		/>
	{/if}
</section>
