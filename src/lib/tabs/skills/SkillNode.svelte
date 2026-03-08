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
				class="btn btn-sm skill-node__control"
				onclick={decrement}
				disabled={!canDecrement}
				aria-label={`Remove point from ${skillData.name}`}
			>
				-
			</button>
			<button
				type="button"
				class="btn btn-sm skill-node__control"
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
		row-gap: 0.12rem;
		width: 100%;
		height: 100%;
		min-height: 0;
		border: 1px solid rgba(var(--bs-secondary-rgb), 0.35);
		border-radius: 0.55rem;
		background: rgba(var(--bs-dark-rgb), 0.12);
		padding: 0.6rem 0.68rem 0.44rem;
		text-align: left;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.skill-node:focus-visible {
		outline: none;
		box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
	}

	.skill-node__top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.25rem;
	}

	.skill-node__name {
		font-size: 0.74rem;
		font-weight: 600;
		line-height: 1.1;
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
		min-width: 1.08rem;
		height: 1.08rem;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: rgba(var(--bs-dark-rgb), 0.8);
		color: var(--bs-light);
		font-size: 0.62rem;
		font-weight: 700;
		border: 1px solid rgba(var(--bs-light-rgb), 0.15);
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
		width: 1.24rem;
		height: 1.24rem;
		padding: 0;
		line-height: 1.1;
		border-radius: 0.26rem;
		border: 1px solid rgba(var(--bs-secondary-rgb), 0.45);
		background: rgba(var(--bs-body-bg-rgb), 0.8);
		color: var(--bs-body-color);
	}

	.skill-node__control:hover:not(:disabled) {
		border-color: rgba(var(--bs-primary-rgb), 0.65);
		color: var(--bs-primary-text-emphasis);
	}

	.skill-node__control:disabled {
		opacity: 0.45;
	}

	.skill-node:hover .skill-node__quick-edit,
	.skill-node--selected .skill-node__quick-edit,
	.skill-node__quick-edit--visible {
		opacity: 1;
		visibility: visible;
	}

	.skill-node--available {
		background-color: rgba(var(--bs-dark-rgb), 0.12);
		color: var(--bs-body-color);
	}

	.skill-node--available:hover {
		background-color: rgba(var(--bs-dark-rgb), 0.18);
	}

	.skill-node--invested {
		background-color: rgba(var(--bs-dark-rgb), 0.14);
		border-color: rgba(var(--bs-primary-rgb), 0.45);
		color: var(--bs-body-color);
	}

	.skill-node--invested .skill-node__points {
		border-color: rgba(var(--bs-primary-rgb), 0.5);
	}

	.skill-node--locked-level {
		background-color: rgba(var(--bs-dark-rgb), 0.12);
		border-color: rgba(var(--bs-warning-rgb), 0.32);
		color: rgba(var(--bs-body-color-rgb), 0.78);
	}

	.skill-node--locked-prereq {
		background-color: rgba(var(--bs-dark-rgb), 0.12);
		border-color: rgba(var(--bs-warning-rgb), 0.32);
		color: rgba(var(--bs-body-color-rgb), 0.78);
	}

	.skill-node--selected {
		border-color: var(--bs-primary);
		background-color: rgba(var(--bs-primary-rgb), 0.1);
		box-shadow: inset 0 0 0 1px rgba(var(--bs-primary-rgb), 0.45);
	}
</style>
