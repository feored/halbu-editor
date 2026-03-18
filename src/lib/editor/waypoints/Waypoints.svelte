<script lang="ts">
	import { editorState } from "$lib/editor/editorState.svelte";
	import {
		countActWaypoints,
		countAllWaypoints,
		isDefaultWaypoint,
		setActWaypoints,
		WAYPOINT_NAMES,
	} from "$lib/editor/waypoints/waypointsLogic";

	import { type Act, type Difficulty, DIFFICULTY_NAMES } from "$lib/types/editor";
	import { ACT_LABELS } from "$lib/editor/editorMetadata";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);

	const acts: Array<{ id: Act; display: string }> = [
		{ id: "Act1", display: ACT_LABELS.Act1 },
		{ id: "Act2", display: ACT_LABELS.Act2 },
		{ id: "Act3", display: ACT_LABELS.Act3 },
		{ id: "Act4", display: ACT_LABELS.Act4 },
		{ id: "Act5", display: ACT_LABELS.Act5 },
	];

	const actColumns = [acts.slice(0, 3), acts.slice(3)];

	let activeDifficulty = $state<Difficulty>("Normal");

	const totalProgress = $derived.by(() => {
		return countAllWaypoints(save.waypoints);
	});
</script>

<div class="grid gap-2.5">
	<div class="flex flex-wrap items-stretch justify-between gap-2">
		<div
			class="flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-halbu-border bg-halbu-panel px-1.5 py-1.5"
		>
			{#each DIFFICULTY_NAMES as difficulty}
				<button
					type="button"
					class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
						activeDifficulty === difficulty
							? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
							: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
					}`}
					onclick={() => {
						activeDifficulty = difficulty;
					}}
				>
					{difficulty}
				</button>
			{/each}
		</div>

		<div
			class="flex min-h-10 min-w-56 flex-1 flex-col justify-center rounded-sm border border-halbu-border bg-halbu-panel px-2 py-1.5"
		>
			<div class="mb-1 flex items-center justify-between gap-2 text-sm">
				<span class="text-halbu-textMuted">Total waypoint progress</span>
				<span class="text-halbu-text">
					{totalProgress.acquired}/{totalProgress.total} ({totalProgress.percent}%)
				</span>
			</div>
			<div class="h-1 overflow-hidden rounded-xs bg-halbu-border">
				<div
					class="h-full bg-halbu-info transition-[width] duration-200"
					style={`width: ${totalProgress.percent}%`}
				></div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
		{#each actColumns as actColumn}
			<div class="grid content-start gap-2.5">
				{#each actColumn as act}
					{@const actProgress = countActWaypoints(
						save.waypoints,
						activeDifficulty,
						act.id,
					)}
					<section
						class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
					>
						<div class="mb-1.5 flex items-start justify-between gap-2">
							<div class="min-w-0">
								<h3 class="editor-card-title">{act.display}</h3>
								<p class="m-0 mt-0.5 text-xs text-halbu-textMuted">
									{actProgress.acquired}/{actProgress.total} acquired
								</p>
							</div>

							<div class="inline-flex shrink-0 items-center gap-1">
								<button
									type="button"
									class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-xs font-medium text-halbu-text hover:bg-halbu-panel"
									onclick={() =>
										setActWaypoints(
											save.waypoints,
											activeDifficulty,
											act.id,
											true,
										)}
								>
									All
								</button>
								<button
									type="button"
									class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-xs font-medium text-halbu-textMuted hover:bg-halbu-panel hover:text-halbu-text"
									onclick={() =>
										setActWaypoints(
											save.waypoints,
											activeDifficulty,
											act.id,
											false,
										)}
								>
									None
								</button>
								<span class="ml-0.5 text-sm text-halbu-textMuted">
									{actProgress.percent}%
								</span>
							</div>
						</div>

						<div class="mb-1.5 h-1 overflow-hidden rounded-xs bg-halbu-border">
							<div
								class="h-full bg-halbu-info transition-[width] duration-200"
								style={`width: ${actProgress.percent}%`}
							></div>
						</div>

						<div class="grid gap-0.5">
							{#each save.waypoints[activeDifficulty][act.id].waypoints as waypoint}
								{@const defaultWaypoint = isDefaultWaypoint(waypoint.id)}
								<label
									class={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-xs border px-2 py-1 text-sm ${
										defaultWaypoint
											? "border-halbu-border bg-halbu-panel2 text-halbu-textMuted"
											: "border-halbu-border bg-halbu-panel2 text-halbu-text"
									}`}
									for={`${activeDifficulty}-${act.id}-${waypoint.id}`}
								>
									<input
										class="form-check-input mt-0"
										type="checkbox"
										id={`${activeDifficulty}-${act.id}-${waypoint.id}`}
										name={`${activeDifficulty}-${act.id}-${waypoint.id}`}
										bind:checked={waypoint.acquired}
										disabled={defaultWaypoint}
									/>
									<span class="min-w-0">
										<span class="block leading-[1.2]">
											{WAYPOINT_NAMES[waypoint.id] ?? waypoint.id}
										</span>
										{#if defaultWaypoint}
											<span class="form-text m-0">Acquired by default.</span>
										{/if}
									</span>
								</label>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/each}
	</div>
</div>
