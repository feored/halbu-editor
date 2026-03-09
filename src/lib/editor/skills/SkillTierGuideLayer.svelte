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
		stroke: color-mix(in srgb, var(--halbu-text) 4%, transparent);
		stroke-width: 1;
	}

	.skill-tier-label {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.05em;
		fill: color-mix(in srgb, var(--halbu-text) 42%, transparent);
		text-anchor: end;
	}
</style>
