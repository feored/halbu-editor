<script lang="ts">
	import SkillNode from "$lib/editor/skills/components/SkillNode.svelte";
	import type { SkillState } from "$lib/editor/skills/skillsState";
	import type { TreeLayout } from "$lib/editor/skills/skillsLayout";

	let { nodeRects, skillStatesById, selectedSkillId, onSelect, onIncrement, onDecrement } =
		$props<{
			nodeRects: TreeLayout["nodeRects"];
			skillStatesById: Record<number, SkillState>;
			selectedSkillId: number | null;
			onSelect: (skillId: number) => void;
			onIncrement: (skillId: number) => void;
			onDecrement: (skillId: number) => void;
		}>();
</script>

<div class="skill-node-layer">
	{#each nodeRects as nodeRect (nodeRect.id)}
		{@const skillState = skillStatesById[nodeRect.id]}
		<div
			class="skill-node-shell"
			style={`left:${nodeRect.x}px;top:${nodeRect.y}px;width:${nodeRect.width}px;height:${nodeRect.height}px;`}
		>
			<SkillNode
				skillData={nodeRect.skill}
				points={skillState.points}
				nodeState={skillState.state}
				isSelected={selectedSkillId === nodeRect.id}
				canIncrement={skillState.canIncrement}
				incrementReason={skillState.incrementReason}
				canDecrement={skillState.canDecrement}
				{onSelect}
				{onIncrement}
				{onDecrement}
			/>
		</div>
	{/each}
</div>

<style>
	.skill-node-layer {
		position: absolute;
		inset: 0;
		z-index: 3;
	}

	.skill-node-shell {
		position: absolute;
	}
</style>
