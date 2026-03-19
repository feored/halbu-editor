<script lang="ts">
	import type { SkillState } from "$lib/editor/skills/skillsState";
	import type { SkillData } from "$lib/editor/skills/skillsTypes";

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
	} = $props<{
		skillData: SkillData;
		points: number;
		nodeState: SkillState["state"];
		isSelected: boolean;
		canIncrement: boolean;
		canDecrement: boolean;
		onSelect: (skillId: number) => void;
		onIncrement: (skillId: number) => void;
		onDecrement: (skillId: number) => void;
	}>();

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

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			selectSkill();
		}
	}

	function increment(event: MouseEvent) {
		event.stopPropagation();
		onIncrement(skillData.id);
	}

	function decrement(event: MouseEvent) {
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
		<div
			class={`skill-node__quick-edit ${isSelected ? "skill-node__quick-edit--visible" : ""}`}
		>
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
		row-gap: 0.125rem;
		width: 100%;
		height: 100%;
		min-height: 0;
		border: 1px solid var(--halbu-border);
		border-radius: var(--app-radius-sm);
		background: var(--halbu-panel2);
		padding: 0.25rem 0.375rem 0.25rem;
		text-align: left;
		cursor: pointer;
		overflow: hidden;
		transition:
			background-color 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
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
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.12;
		word-break: break-word;
		flex: 1;
		color: var(--halbu-text);
	}

	.skill-node__bottom {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 0.25rem;
	}

	.skill-node__points {
		display: inline-flex;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.25rem;
		align-items: center;
		justify-content: center;
		border-radius: var(--app-radius-sm);
		background: var(--halbu-panel);
		color: var(--halbu-text);
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid var(--halbu-border-strong);
		flex: 0 0 auto;
	}

	.skill-node__quick-edit {
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		opacity: 1;
		visibility: visible;
		transition: opacity 0.15s ease;
	}

	.skill-node__control {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		line-height: 1.1;
		font-size: 0.75rem;
		font-weight: 700;
		border-radius: var(--app-radius-sm);
		border: 1px solid var(--halbu-border-strong);
		background: var(--halbu-panel);
		color: var(--halbu-text-muted);
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

	.skill-node--available {
		background-color: var(--halbu-panel2);
		color: var(--halbu-text);
	}

	.skill-node--available:hover {
		background-color: var(--halbu-panel);
	}

	.skill-node--invested {
		background-color: color-mix(in srgb, var(--halbu-primary) 8%, var(--halbu-panel2));
		border-color: color-mix(in srgb, var(--halbu-primary) 55%, var(--halbu-border));
		color: var(--halbu-text);
	}

	.skill-node--invested .skill-node__points {
		border-color: color-mix(in srgb, var(--halbu-primary) 55%, var(--halbu-border));
	}

	.skill-node--locked-level {
		background-color: color-mix(in srgb, var(--halbu-danger) 5%, var(--halbu-panel2));
		border-color: color-mix(in srgb, var(--halbu-danger) 45%, var(--halbu-border));
		color: rgb(var(--halbu-danger-rgb) / 0.75);
	}

	.skill-node--locked-prereq {
		background-color: color-mix(in srgb, var(--halbu-danger) 5%, var(--halbu-panel2));
		border-color: color-mix(in srgb, var(--halbu-danger) 45%, var(--halbu-border));
		color: rgb(var(--halbu-danger-rgb) / 0.75);
	}

	.skill-node--selected {
		border-color: var(--halbu-primary);
		background-color: color-mix(in srgb, var(--halbu-primary) 16%, var(--halbu-panel2));
		box-shadow: inset 0 0 0 1px rgb(var(--halbu-primary-rgb) / 0.35);
	}
</style>
