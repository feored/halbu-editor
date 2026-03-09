<script>
	let {
		skillData,
		points,
		nodeState,
		isSelected,
		canIncrement,
		canDecrement,
		onSelect,
		onIncrement,
		onDecrement,
	} = $props();

	const stateClasses = $derived.by(() => {
		const classes = [`skill-node--${nodeState}`];
		if (isSelected) {
			classes.push("skill-node--selected");
		}
		return classes.join(" ");
	});

	function selectSkill() {
		onSelect(skillData.id);
	}

	function handleKeydown(event) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			selectSkill();
		}
	}

	function increment(event) {
		event.stopPropagation();
		onIncrement(skillData.id);
	}

	function decrement(event) {
		event.stopPropagation();
		onDecrement(skillData.id);
	}
</script>

<div
	class={`skill-node ${stateClasses}`}
	onclick={selectSkill}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
	aria-pressed={isSelected}
>
	<div class="skill-node__top">
		<div class="skill-node__name">{skillData.name}</div>
		<span class="skill-node__points">{points}</span>
	</div>

	<div class="skill-node__bottom">
		<div class={`skill-node__quick-edit ${isSelected ? "skill-node__quick-edit--visible" : ""}`}>
			<button
				type="button"
				class="skill-node__control"
				onclick={decrement}
				disabled={!canDecrement}
				aria-label={`Remove point from ${skillData.name}`}
			>
				-
			</button>
			<button
				type="button"
				class="skill-node__control"
				onclick={increment}
				disabled={!canIncrement}
				aria-label={`Add point to ${skillData.name}`}
			>
				+
			</button>
		</div>
	</div>
</div>

<style>
	.skill-node {
		display: grid;
		grid-template-rows: 1fr auto;
		row-gap: 0.08rem;
		width: 100%;
		height: 100%;
		min-height: 0;
		border: 1px solid var(--halbu-border);
		border-radius: 0.25rem;
		background: var(--halbu-panel2);
		padding: 0.36rem 0.46rem 0.26rem;
		text-align: left;
		cursor: pointer;
		overflow: hidden;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.skill-node:focus-visible {
		outline: none;
		box-shadow: var(--app-focus-ring);
	}

	.skill-node__top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.25rem;
	}

	.skill-node__name {
		font-size: 0.84rem;
		font-weight: 600;
		line-height: 1.12;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
		flex: 1;
	}

	.skill-node__bottom {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 0.2rem;
	}

	.skill-node__points {
		display: inline-flex;
		min-width: 1.16rem;
		height: 1.16rem;
		padding: 0 0.22rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.22rem;
		background: var(--halbu-panel);
		color: var(--halbu-text);
		font-size: 0.8rem;
		font-weight: 600;
		border: 1px solid var(--halbu-border-strong);
		flex: 0 0 auto;
	}

	.skill-node__quick-edit {
		display: flex;
		justify-content: center;
		gap: 0.2rem;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.15s ease;
	}

	.skill-node__control {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.08rem;
		height: 1.08rem;
		padding: 0;
		line-height: 1.1;
		font-size: 0.8rem;
		font-weight: 700;
		border-radius: 0.2rem;
		border: 1px solid var(--halbu-border-strong);
		background: var(--halbu-panel);
		color: var(--halbu-textMuted);
		cursor: pointer;
		user-select: none;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.skill-node__control:hover:not(:disabled) {
		background: var(--halbu-panel2);
		border-color: var(--halbu-primary);
		color: var(--halbu-text);
		box-shadow: inset 0 0 0 1px var(--halbu-primary-soft);
	}

	.skill-node__control:active:not(:disabled) {
		background: var(--halbu-primary-soft);
		border-color: var(--halbu-primary);
		color: var(--halbu-primary-active);
	}

	.skill-node__control:focus-visible {
		outline: none;
		box-shadow: var(--app-focus-ring);
	}

	.skill-node__control:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.skill-node:hover .skill-node__quick-edit,
	.skill-node--selected .skill-node__quick-edit,
	.skill-node__quick-edit--visible {
		opacity: 1;
		visibility: visible;
	}

	.skill-node--available {
		background-color: var(--halbu-panel2);
		color: var(--bs-body-color);
	}

	.skill-node--available:hover {
		background-color: var(--halbu-panel);
	}

	.skill-node--invested {
		background-color: var(--halbu-panel2);
		border-color: var(--halbu-primary);
		color: var(--bs-body-color);
	}

	.skill-node--invested .skill-node__points {
		border-color: var(--halbu-primary);
	}

	.skill-node--locked-level {
		background-color: var(--halbu-panel2);
		border-color: var(--halbu-warning);
		color: var(--halbu-textMuted);
	}

	.skill-node--locked-prereq {
		background-color: var(--halbu-panel2);
		border-color: var(--halbu-warning);
		color: var(--halbu-textMuted);
	}

	.skill-node--selected {
		border-color: var(--halbu-primary);
		background-color: var(--halbu-primary-soft);
		box-shadow: inset 0 0 0 1px var(--halbu-primary);
	}
</style>
