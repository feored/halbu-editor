<script>
	let { tierGuides, canvasWidth, canvasHeight } = $props();
</script>

<svg
	class="skill-tier-layer"
	viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
	preserveAspectRatio="xMinYMin meet"
	aria-hidden="true"
>
	{#each tierGuides as tier (tier.row)}
		<line
			class="skill-tier-separator"
			x1={tier.lineX1}
			y1={tier.lineY}
			x2={tier.lineX2}
			y2={tier.lineY}
		/>
		<text class="skill-tier-label" x={tier.labelX} y={tier.labelY}>Lvl {tier.level}</text>
	{/each}
</svg>

<style>
	.skill-tier-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
	}

	.skill-tier-separator {
		stroke: rgba(var(--bs-body-color-rgb), 0.04);
		stroke-width: 1;
	}

	.skill-tier-label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.05em;
		fill: rgba(var(--bs-body-color-rgb), 0.42);
		text-anchor: end;
	}
</style>
