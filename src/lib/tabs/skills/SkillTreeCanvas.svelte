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

<section class="skill-tree-canvas bg-custom-light p-3">
	{#if pageIndexes.length > 1}
		<div class="skill-page-tabs-wrap mb-3">
			<ul class="skill-page-tabs nav">
				{#each pageIndexes as pageIndex}
					<li class="nav-item">
						<button
							type="button"
							class={`nav-link skill-page-tab ${Number(activePageIndex) === Number(pageIndex) ? "active" : ""}`}
							onclick={() => onPageSelect(pageIndex)}
						>
							{pageTitle(pageIndex)}
						</button>
					</li>
				{/each}
			</ul>
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

<style>
	.skill-tree-canvas {
		display: inline-block;
		width: max-content;
		max-width: 100%;
		border: 1px solid rgba(var(--bs-secondary-rgb), 0.25);
		border-radius: 0.6rem;
		box-shadow: none;
	}

	.skill-page-tabs {
		display: inline-flex;
		width: max-content;
		gap: 0.2rem;
		border-bottom: 1px solid rgba(var(--bs-secondary-rgb), 0.25);
		padding-bottom: 0.25rem;
		flex-wrap: nowrap;
	}

	.skill-page-tabs-wrap {
		overflow-x: auto;
		overflow-y: hidden;
	}

	.skill-page-tab {
		border: 0;
		border-radius: 0.4rem;
		background: transparent;
		color: var(--bs-secondary-color);
		font-size: 0.88rem;
		padding: 0.35rem 0.55rem;
	}

	.skill-page-tab:hover {
		color: var(--bs-body-color);
		background: rgba(var(--bs-secondary-rgb), 0.12);
	}

	.skill-page-tab.active {
		background: rgba(var(--bs-primary-rgb), 0.15);
		color: var(--bs-primary-text-emphasis);
		font-weight: 600;
	}
</style>
