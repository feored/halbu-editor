<script lang="ts">
	import SkillConnectorLayer from "$lib/editor/skills/components/SkillConnectorLayer.svelte";
	import SkillNodeLayer from "$lib/editor/skills/components/SkillNodeLayer.svelte";
	import SkillTierGuideLayer from "$lib/editor/skills/components/SkillTierGuideLayer.svelte";
	import { buildTreeLayout } from "$lib/editor/skills/skillsLayout";
	import type { SkillState } from "$lib/editor/skills/skillsState";
	import type { SkillData } from "$lib/editor/skills/skillsTypes";

	let { skills, skillStatesById, selectedSkillId, onSelect, onIncrement, onDecrement } = $props<{
		skills: SkillData[];
		skillStatesById: Record<number, SkillState>;
		selectedSkillId: number | null;
		onSelect: (skillId: number) => void;
		onIncrement: (skillId: number) => void;
		onDecrement: (skillId: number) => void;
	}>();

	const treeLayout = $derived.by(() =>
		buildTreeLayout({
			skills,
			selectedSkillId,
		}),
	);

	const canvasWidth = $derived(treeLayout.canvasWidth);
	const canvasHeight = $derived(treeLayout.canvasHeight);
	const tierGuides = $derived(treeLayout.tierGuides);
	const connectors = $derived(treeLayout.connectors);
	const nodeRects = $derived(treeLayout.nodeRects);
</script>

<section class="skills-tree-section">
	<div class="tree-scroll">
		<div class="tree-surface" style={`width:${canvasWidth}px;height:${canvasHeight}px;`}>
			<SkillTierGuideLayer {tierGuides} {canvasWidth} {canvasHeight} />
			<SkillConnectorLayer {connectors} {canvasWidth} {canvasHeight} />
			<SkillNodeLayer
				{nodeRects}
				{skillStatesById}
				{selectedSkillId}
				{onSelect}
				{onIncrement}
				{onDecrement}
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
