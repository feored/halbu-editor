<script>
	let { save = $bindable() } = $props();

	const ROGUE_ENCAMPMENT = "RogueEncampment";

	const WAYPOINT_NAMES = {
		RogueEncampment: "Rogue Encampment",
		ColdPlains: "Cold Plains",
		StonyField: "Stony Field",
		DarkWood: "Dark Wood",
		BlackMarsh: "Black Marsh",
		OuterCloister: "Outer Cloister",
		Jail: "Jail",
		InnerCloister: "Inner Cloister",
		Catacombs: "Catacombs",
		LutGholein: "Lut Gholein",
		Sewers: "Sewers",
		DryHills: "Dry Hills",
		HallsOfTheDead: "Halls of the Dead",
		FarOasis: "Far Oasis",
		LostCity: "Lost City",
		PalaceCellar: "Palace Cellar",
		ArcaneSanctuary: "Arcane Sanctuary",
		CanyonOfTheMagi: "Canyon of the Magi",
		KurastDocks: "Kurast Docks",
		SpiderForest: "Spider Forest",
		GreatMarsh: "Great Marsh",
		FlayerJungle: "Flayer Jungle",
		LowerKurast: "Lower Kurast",
		KurastBazaar: "Kurast Bazaar",
		UpperKurast: "Upper Kurast",
		Travincal: "Travincal",
		DuranceOfHate: "Durance of Hate",
		PandemoniumFortress: "Pandemonium Fortress",
		CityOfTheDamned: "City of the Damned",
		RiverOfFlames: "River of Flames",
		Harrogath: "Harrogath",
		FrigidHighlands: "Frigid Highlands",
		ArreatPlateau: "Arreat Plateau",
		CrystallinePassage: "Crystalline Passage",
		HallsOfPain: "Halls of Pain",
		GlacialTrail: "Glacial Trail",
		FrozenTundra: "Frozen Tundra",
		TheAncientsWay: "The Ancients' Way",
		WorldstoneKeep: "Worldstone Keep",
	};

	const difficulties = [
		{
			id: "normal",
			display: "Normal",
		},
		{
			id: "nightmare",
			display: "Nightmare",
		},
		{
			id: "hell",
			display: "Hell",
		},
	];

	const acts = [
		{ id: "act1", display: "Act I" },
		{ id: "act2", display: "Act II" },
		{ id: "act3", display: "Act III" },
		{ id: "act4", display: "Act IV" },
		{ id: "act5", display: "Act V" },
	];
	const actColumns = [acts.slice(0, 3), acts.slice(3)];
	let activeDifficultyId = $state("normal");

	function setActWaypoints(difficulty, act, value) {
		for (const waypoint of save.waypoints[difficulty.id][act.id].waypoints) {
			if (waypoint.id !== ROGUE_ENCAMPMENT) {
				waypoint.acquired = value;
			}
		}
	}

	function countActWaypoints(difficulty, act) {
		let total = 0;
		let acquired = 0;
		for (const waypoint of save.waypoints[difficulty.id][act.id].waypoints) {
			if (waypoint.id === ROGUE_ENCAMPMENT && act.id !== "act1") {
				continue;
			}
			total += 1;
			if (waypoint.acquired) {
				acquired += 1;
			}
		}
		return { acquired, total };
	}

	function countTotalWaypoints() {
		let total = 0;
		let acquired = 0;
		for (const difficulty of difficulties) {
			for (const act of acts) {
				const counts = countActWaypoints(difficulty, act);
				total += counts.total;
				acquired += counts.acquired;
			}
		}
		return { acquired, total };
	}

	const totalWaypointProgress = $derived.by(() => {
		const counts = countTotalWaypoints();
		const percent = counts.total > 0 ? Math.round((counts.acquired / counts.total) * 100) : 0;
		return { ...counts, percent };
	});
</script>

<div class="grid gap-2.5">
	<div class="flex flex-wrap items-stretch justify-between gap-2">
		<div
			class="flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-halbu-border bg-halbu-panel px-1.5 py-1.5"
		>
			{#each difficulties as difficulty}
				<button
					type="button"
					class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
						activeDifficultyId === difficulty.id
							? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
							: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
					}`}
					onclick={() => {
						activeDifficultyId = difficulty.id;
					}}
				>
					{difficulty.display}
				</button>
			{/each}
		</div>
		<div
			class="flex min-h-10 min-w-56 flex-1 flex-col justify-center rounded-sm border border-halbu-border bg-halbu-panel px-2 py-1.5"
		>
			<div class="mb-1 flex items-center justify-between gap-2 text-sm">
				<span class="text-halbu-textMuted">Total waypoint progress</span>
				<span class="text-halbu-text">
					{totalWaypointProgress.acquired}/{totalWaypointProgress.total} ({totalWaypointProgress.percent}%)
				</span>
			</div>
			<div class="h-1 overflow-hidden rounded-xs bg-halbu-border">
				<div
					class="h-full bg-halbu-info transition-[width] duration-200"
					style={`width: ${totalWaypointProgress.percent}%`}
				></div>
			</div>
		</div>
	</div>

	{#each difficulties as difficulty}
		{#if difficulty.id === activeDifficultyId}
			<div class="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
				{#snippet actCard(difficulty, act)}
					{@const actCounts = countActWaypoints(difficulty, act)}
					{@const actPercent =
						actCounts.total > 0
							? Math.round((actCounts.acquired / actCounts.total) * 100)
							: 0}
					<section
						class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
					>
						<div class="mb-1.5 flex items-start justify-between gap-2">
							<div class="min-w-0">
								<h3 class="editor-card-title">{act.display}</h3>
								<p class="m-0 mt-0.5 text-xs text-halbu-textMuted">
									{actCounts.acquired}/{actCounts.total} acquired
								</p>
							</div>
							<div class="inline-flex shrink-0 items-center gap-1">
								<button
									type="button"
									class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-xs font-medium text-halbu-text hover:bg-halbu-panel"
									onclick={() => setActWaypoints(difficulty, act, true)}
								>
									All
								</button>
								<button
									type="button"
									class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-xs font-medium text-halbu-textMuted hover:bg-halbu-panel hover:text-halbu-text"
									onclick={() => setActWaypoints(difficulty, act, false)}
								>
									None
								</button>
								<span class="ml-0.5 text-sm text-halbu-textMuted"
									>{actPercent}%</span
								>
							</div>
						</div>

						<div class="mb-1.5 h-1 overflow-hidden rounded-xs bg-halbu-border">
							<div
								class="h-full bg-halbu-info transition-[width] duration-200"
								style={`width: ${actPercent}%`}
							></div>
						</div>

						<div class="grid gap-0.5">
							{#each save.waypoints[difficulty.id][act.id].waypoints as wp}
								<label
									class={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-xs border px-2 py-1 text-sm ${
										wp.id === ROGUE_ENCAMPMENT
											? "border-halbu-border bg-halbu-panel2 text-halbu-textMuted"
											: "border-halbu-border bg-halbu-panel2 text-halbu-text"
									}`}
									for={difficulty.id + "-" + act.id + "-" + wp.id}
								>
									<input
										class="form-check-input mt-0"
										type="checkbox"
										id={difficulty.id + "-" + act.id + "-" + wp.id}
										name={difficulty.id + "-" + act.id + "-" + wp.id}
										bind:checked={wp.acquired}
										disabled={wp.id === ROGUE_ENCAMPMENT}
									/>
									<span class="min-w-0">
										<span class="block leading-[1.2]"
											>{WAYPOINT_NAMES[wp.id]}</span
										>
										{#if wp.id === ROGUE_ENCAMPMENT}
											<span class="form-text m-0">Acquired by default.</span>
										{/if}
									</span>
								</label>
							{/each}
						</div>
					</section>
				{/snippet}
				{#each actColumns as actColumn}
					<div class="grid content-start gap-2.5">
						{#each actColumn as act}
							{@render actCard(difficulty, act)}
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	{/each}
</div>
