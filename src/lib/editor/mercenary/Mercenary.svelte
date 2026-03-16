<script>
	import names from "./names.json";
	import variants from "./variants.json";
	import { Difficulty } from "../../utils/constants";
	import { enforceMinMax } from "../../utils/actions.js";
	import { clampInteger } from "../../utils/numbers";

	let { save = $bindable() } = $props();

	const MercenaryClass = {
		Rogue: "Rogue",
		Desert: "Desert Mercenary",
		IronWolf: "Iron Wolf",
		Barbarian: "Barbarian",
	};
	const U32_MAX = 4294967295;
	const MERCENARY_LEVEL_MIN = 1;
	const MERCENARY_LEVEL_MAX = 98;

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

	let isHired = $state(save.character.mercenary.id != 0);
	$effect(() => {
		isHired = save.character.mercenary.id != 0;
	});

	function setHired(nextHired) {
		isHired = nextHired;
		save.character.mercenary.id = nextHired ? Math.floor(Math.random() * U32_MAX) : 0;
		if (!nextHired) {
			save.character.mercenary.is_dead = false;
		}
	}

	let mercVariant = $state(
		structuredClone(
			variants.find((info) => info.id == save.character.mercenary.variant_id) ?? variants[0],
		),
	);

	let possibleVariants = $state(
		variants.filter(
			(merc) => merc.difficulty == mercVariant.difficulty && merc.type == mercVariant.type,
		),
	);

	function updateVariant() {
		possibleVariants = variants.filter(
			(merc) => merc.difficulty == mercVariant.difficulty && merc.type == mercVariant.type,
		);
		if (possibleVariants.length === 0) {
			return;
		}

		const matchedVariant =
			possibleVariants.find((merc) => merc.variant == mercVariant.variant) ??
			possibleVariants[0];

		mercVariant = structuredClone(matchedVariant);
		save.character.mercenary.variant_id = matchedVariant.id;
		changeExperience();
	}

	let mercLevel = $state(1);
	const mercenaryLevelCap = $derived(
		clampInteger(save.attributes.level.value, MERCENARY_LEVEL_MIN, MERCENARY_LEVEL_MAX),
	);

	$effect(() => {
		mercVariant.rate;
		save.character.mercenary.experience;
		mercenaryLevelCap;
		changeExperience();
	});

	function clampMercenaryLevel(level) {
		return clampInteger(level, MERCENARY_LEVEL_MIN, mercenaryLevelCap);
	}

	function changeExperience() {
		const nextMercLevel = clampMercenaryLevel(
			levelFromXp(save.character.mercenary.experience, mercVariant.rate),
		);
		mercLevel = nextMercLevel;
		const nextExperience = xpFromLevel(nextMercLevel, mercVariant.rate);
		if (save.character.mercenary.experience !== nextExperience) {
			save.character.mercenary.experience = nextExperience;
		}
	}

	function changeLevel() {
		mercLevel = clampMercenaryLevel(mercLevel);
		save.character.mercenary.experience = xpFromLevel(mercLevel, mercVariant.rate);
	}

	const variantNames = $derived(names[mercVariant.type] ?? []);

	function updateName() {
		if (variantNames.length === 0) {
			return;
		}
		save.character.mercenary.name_id = Math.floor(Math.random() * variantNames.length);
	}

	$effect(() => {
		if (variantNames.length === 0) {
			return;
		}
		if (save.character.mercenary.name_id >= variantNames.length) {
			save.character.mercenary.name_id = variantNames.length - 1;
		}
	});
</script>

<div class="grid max-w-3xl content-start gap-2.5">
	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Status</h3>
		<div class="grid gap-1 text-sm">
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
					checked={!save.character.mercenary.is_dead}
					onchange={(event) => (save.character.mercenary.is_dead = !event.currentTarget.checked)}
					disabled={!isHired}
				/>
				<span>Alive</span>
			</label>
		</div>
		{#if !isHired}
			<div class="form-text mt-1">
				Mercenary data is inactive until the mercenary is hired.
			</div>
		{/if}
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-1.5">Identity</h3>
		<div
			class="grid grid-cols-form-32 items-center gap-x-2 gap-y-1.5"
		>
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
				max={U32_MAX}
				step="1"
				use:enforceMinMax
				bind:value={save.character.mercenary.id}
				disabled={!isHired}
			/>
		</div>
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-1.5">Type</h3>
		<div
			class="grid grid-cols-form-32 items-center gap-x-2 gap-y-1.5"
		>
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
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-1.5">Progression</h3>
		<div
			class="grid grid-cols-form-32 items-center gap-x-2 gap-y-1.5"
		>
			<label class="form-label mb-0" for="level">Level</label>
			<input
				class="form-control"
				use:enforceMinMax
				type="number"
				name="level"
				id="level"
				min="1"
				max={mercenaryLevelCap}
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
				max={U32_MAX}
				step="1"
				bind:value={save.character.mercenary.experience}
				oninput={changeExperience}
				disabled={!isHired}
			/>
		</div>
	</section>
</div>
