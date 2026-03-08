<script>
	let { connectors, canvasWidth, canvasHeight } = $props();
</script>

<svg
	class="skill-connector-layer"
	viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
	preserveAspectRatio="xMinYMin meet"
	aria-hidden="true"
>
	{#each connectors as connector (connector.key)}
		<path
			class={`skill-connector ${connector.leadingToSelected ? "skill-connector--selected" : ""}`}
			d={connector.path}
		/>
	{/each}
</svg>

<style>
	.skill-connector-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 2;
	}

	.skill-connector {
		fill: none;
		stroke: rgba(var(--bs-secondary-rgb), 0.36);
		stroke-width: 0.95;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.skill-connector--selected {
		stroke: var(--bs-primary);
		stroke-width: 1.15;
	}
</style>
