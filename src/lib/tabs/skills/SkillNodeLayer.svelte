<script>
	import SkillNode from "./SkillNode.svelte";

	let {
		nodeRects,
		skillStatesById,
		selectedSkillId,
		onSelect,
		onIncrement,
		onDecrement,
	} = $props();
</script>

<div class="skill-node-layer">
	{#each nodeRects as nodeRect (nodeRect.id)}
		{@const skillState = skillStatesById[Number(nodeRect.id)]}
		<div
			class="skill-node-shell"
			style={`left:${nodeRect.x}px;top:${nodeRect.y}px;width:${nodeRect.width}px;height:${nodeRect.height}px;`}
		>
			<SkillNode
				skillData={nodeRect.skill}
				points={skillState.points}
				nodeState={skillState.state}
				isSelected={Number(selectedSkillId) === Number(nodeRect.id)}
				canIncrement={skillState.canIncrement}
				canDecrement={skillState.canDecrement}
				onSelect={onSelect}
				onIncrement={onIncrement}
				onDecrement={onDecrement}
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
