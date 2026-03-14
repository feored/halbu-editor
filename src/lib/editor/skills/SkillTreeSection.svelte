<script>
	import SkillConnectorLayer from "./SkillConnectorLayer.svelte";
	import SkillNodeLayer from "./SkillNodeLayer.svelte";
	import SkillTierGuideLayer from "./SkillTierGuideLayer.svelte";
	import { computeTreeLayout } from "./treeLayout";

let {
		skills,
		skillStatesById,
		selectedSkillId,
		onSelect,
		onIncrement,
		onDecrement,
	} = $props();

	const treeLayout = $derived.by(() =>
		computeTreeLayout({
			skills,
			selectedSkillId,
		})
	);

	const canvasWidth = $derived(treeLayout.canvasWidth);
	const canvasHeight = $derived(treeLayout.canvasHeight);
	const tierGuides = $derived(treeLayout.tierGuides);
	const connectors = $derived(treeLayout.connectors);
	const nodeRects = $derived(treeLayout.nodeRects);
</script>

<section class="skills-tree-section">
	<div class="tree-scroll">
		<div
			class="tree-surface"
			style={`width:${canvasWidth}px;height:${canvasHeight}px;`}
		>
			<SkillTierGuideLayer
				tierGuides={tierGuides}
				canvasWidth={canvasWidth}
				canvasHeight={canvasHeight}
			/>
			<SkillConnectorLayer
				connectors={connectors}
				canvasWidth={canvasWidth}
				canvasHeight={canvasHeight}
			/>
			<SkillNodeLayer
				nodeRects={nodeRects}
				skillStatesById={skillStatesById}
				selectedSkillId={selectedSkillId}
				onSelect={onSelect}
				onIncrement={onIncrement}
				onDecrement={onDecrement}
			/>
		</div>
	</div>
</section>

<style>
	.skills-tree-section {
		min-width: 0;
	}

	.tree-scroll {
		overflow: auto;
		padding-bottom: 0.125rem;
	}

	.tree-surface {
		position: relative;
	}
</style>
