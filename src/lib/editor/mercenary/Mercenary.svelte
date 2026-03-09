	<script>
	import names from "./names.json";
	import variants from "./variants.json";
	import { Difficulty, u32MAX } from "../../utils/Constants.svelte";
	import { enforceMinMax } from "../../utils/actions.js";

	let { save = $bindable() } = $props();

	const MercenaryClass = {
		Rogue: "Rogue",
		Desert: "Desert Mercenary",
		IronWolf: "Iron Wolf",
		Barbarian: "Barbarian",
	};

	function xpFromLevel(level, rate) {
		return rate * (level + 1) * (level * level);
	}

	function levelFromXp(experience, rate) {
		let xpConstant = experience / rate;
		let s = Math.floor(Math.pow(xpConstant, 1 / 3));
		if (xpConstant < Math.pow(s, 3) + Math.pow(s, 2)) {
			return s - 1;
		} else {
			return s;
		}
	}

	function variantIDToInfo(variantID) {
		const result = variants.filter((info) => info.id == variantID);
		if (result.length != 1) {
			console.error(`Error trying to get variant from variant id ${variantID}.`);
			return variants[0];
		}
		return JSON.parse(JSON.stringify(result[0]));
	}

	// Check if mercenary is hired and disable everything if not.
	let isHired = $state(save.character.mercenary.id != 0);
	$effect(() => {
		isHired = save.character.mercenary.id != 0;
	});

	function setHired(nextHired) {
		isHired = nextHired;
		save.character.mercenary.id = nextHired ? Math.floor(Math.random() * u32MAX) : 0;
		if (!nextHired) {
			save.character.mercenary.dead = false;
		}
	}

	function setAlive(nextAlive) {
		save.character.mercenary.dead = !nextAlive;
	}

	// Variants
	let mercVariant = $state(variantIDToInfo(save.character.mercenary.variant_id));

	let possibleVariants = $state(
		variants.filter(
		(merc) => merc.difficulty == mercVariant.difficulty && merc.type == mercVariant.type
		)
	);

	function updateVariant() {
		possibleVariants = variants.filter(
			(merc) => merc.difficulty == mercVariant.difficulty && merc.type == mercVariant.type
		);
		if (possibleVariants.length === 0) {
			return;
		}

		const matchedVariant =
			possibleVariants.find((merc) => merc.variant == mercVariant.variant) ?? possibleVariants[0];

		mercVariant = JSON.parse(JSON.stringify(matchedVariant));
		save.character.mercenary.variant_id = matchedVariant.id;
		changeExperience();
	}

	// Experience
	let mercLevel = $state(1);

	$effect(() => {
		mercVariant.rate;
		save.character.mercenary.experience;
		changeExperience();
	});

	function changeExperience() {
		mercLevel = levelFromXp(save.character.mercenary.experience, mercVariant.rate);
	}

	function changeLevel() {
		save.character.mercenary.experience = xpFromLevel(mercLevel, mercVariant.rate);
	}

	// Names
	const variantNames = $derived(names[mercVariant.type] ?? []);

	function updateName() {
		if (variantNames.length === 0) {
			return;
		}
		save.character.mercenary.name_id = Math.floor(Math.random() * variantNames.length);
	}

	$effect(() => {
		if (variantNames.length > 0) {
			const index = Math.max(0, Math.min(save.character.mercenary.name_id, variantNames.length - 1));
			save.character.mercenary.name = variantNames[index];
		}
	});
</script>

<div class="grid max-w-[46rem] content-start gap-[0.6rem]">
	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]">
		<h3 class="editor-card-title mb-[0.36rem]">Status</h3>
		<div class="grid gap-[0.26rem] text-[0.92rem]">
			<label class="inline-flex items-center gap-2">
				<input
					class="form-check-input mt-0"
					type="checkbox"
					id="hired"
					name="hired"
					checked={isHired}
					onchange={(event) => setHired(event.currentTarget.checked)}
				/>
				<span>Hired</span>
			</label>
			<label class="inline-flex items-center gap-2">
				<input
					class="form-check-input mt-0"
					type="checkbox"
					id="alive"
					name="alive"
					checked={!save.character.mercenary.dead}
					onchange={(event) => setAlive(event.currentTarget.checked)}
					disabled={!isHired}
				/>
				<span>Alive</span>
			</label>
		</div>
		{#if !isHired}
			<div class="form-text mt-[0.26rem]">
				Mercenary data is inactive until the mercenary is hired.
			</div>
		{/if}
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem] ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-[0.36rem]">Identity</h3>
		<div class="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-[0.55rem] gap-y-[0.34rem]">
			<label class="form-label mb-0" for="name_id">Name</label>
			<select
				class="form-select"
				bind:value={save.character.mercenary.name_id}
				name="name_id"
				id="name_id"
				disabled={!isHired}
			>
				{#each variantNames as name, index}
					<option value={index}>{name}</option>
				{/each}
			</select>

			<label class="form-label mb-0" for="id">ID</label>
			<input
				class="form-control"
				type="number"
				name="id"
				id="id"
				min="0"
				max={u32MAX}
				step="1"
				use:enforceMinMax
				bind:value={save.character.mercenary.id}
				disabled={!isHired}
			/>
		</div>
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem] ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-[0.36rem]">Type</h3>
		<div class="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-[0.55rem] gap-y-[0.34rem]">
			<label class="form-label mb-0" for="class">Class</label>
			<select
				class="form-select"
				bind:value={mercVariant.type}
				name="class"
				id="class"
				onchange={() => {
					updateVariant();
					updateName();
				}}
				disabled={!isHired}
			>
				<option value={MercenaryClass.Rogue}>Rogue</option>
				<option value={MercenaryClass.Desert}>Desert Mercenary</option>
				<option value={MercenaryClass.IronWolf}>Iron Wolf</option>
				<option value={MercenaryClass.Barbarian}>Barbarian</option>
			</select>

			<label class="form-label mb-0" for="mercVariant">Variant</label>
			<select
				class="form-select"
				bind:value={mercVariant.variant}
				name="variant"
				id="mercVariant"
				onchange={updateVariant}
				disabled={!isHired}
			>
				{#each possibleVariants as merc}
					<option value={merc["variant"]}>{merc["variant"]}</option>
				{/each}
			</select>

			<label class="form-label mb-0" for="difficultyHired">Difficulty hired</label>
			<select
				class="form-select"
				bind:value={mercVariant.difficulty}
				name="difficultyHired"
				id="difficultyHired"
				onchange={updateVariant}
				disabled={!isHired}
			>
				<option value={Difficulty.Normal}>Normal</option>
				<option value={Difficulty.Nightmare}>Nightmare</option>
				<option value={Difficulty.Hell}>Hell</option>
			</select>
		</div>
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem] ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-[0.36rem]">Progression</h3>
		<div class="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-[0.55rem] gap-y-[0.34rem]">
			<label class="form-label mb-0" for="level">Level</label>
			<input
				class="form-control"
				use:enforceMinMax
				type="number"
				name="level"
				id="level"
				min="1"
				max="98"
				step="1"
				bind:value={mercLevel}
				oninput={changeLevel}
				disabled={!isHired}
			/>

			<label class="form-label mb-0" for="experience">Experience</label>
			<input
				class="form-control"
				use:enforceMinMax
				type="number"
				name="experience"
				id="experience"
				min="0"
				max={u32MAX}
				step="1"
				bind:value={save.character.mercenary.experience}
				oninput={changeExperience}
				disabled={!isHired}
			/>
		</div>
		<div class="form-text mt-[0.26rem]">
			Hirelings use different XP curves depending on class and hired difficulty.
		</div>
	</section>
</div>
