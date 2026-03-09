<script>
	import { invoke } from "@tauri-apps/api/core";
	import { enforceMinMax } from "../../utils/actions.js";
	import { calcTitle, calcDifficultyBeaten } from "../../utils/Utils.svelte";
	import {
		classLabel,
		getSupportedClasses,
		isClassSupportedForVersion,
		isKnownSaveVersion,
		normalizeClassForVersion,
		requiresExpansion,
	} from "../../utils/GameSupport";

	import experienceTable from "./experience.json";
	import { Difficulty, Act } from "../../utils/Constants.svelte";

	let { save = $bindable(), editValidation = $bindable({ errors: [], warnings: [] }) } = $props();

	const MAX_GOLD_PER_LEVEL = 10000;
	const MAX_XP = 3520485254;

	let nameRef;
	let validName = $state(true);
	let nameValidationMessage = $state("");

	const goldInventoryMax = $derived(MAX_GOLD_PER_LEVEL * save.character.level);

	let currentLife = $state(save.attributes.hitpoints.value / 256);
	$effect(() => {
		save.attributes.hitpoints.value = Math.round(currentLife * 256);
	});

	let baseLife = $state(save.attributes.maxhp.value / 256);
	$effect(() => {
		save.attributes.maxhp.value = Math.round(baseLife * 256);
	});

	let currentMana = $state(save.attributes.mana.value / 256);
	$effect(() => {
		save.attributes.mana.value = Math.round(currentMana * 256);
	});

	let baseMana = $state(save.attributes.maxmana.value / 256);
	$effect(() => {
		save.attributes.maxmana.value = Math.round(baseMana * 256);
	});

	let currentStamina = $state(save.attributes.stamina.value / 256);
	$effect(() => {
		save.attributes.stamina.value = Math.round(currentStamina * 256);
	});

	let baseStamina = $state(save.attributes.maxstamina.value / 256);
	$effect(() => {
		save.attributes.maxstamina.value = Math.round(baseStamina * 256);
	});

	// Title & Progression

	const difficultiesToBeat = ["None", "Normal", "Nightmare", "Hell"];
	let difficultyBeaten = $state(calcDifficultyBeaten(save.character));
	let title = $state("");
	updateTitle();

	let selectedClassForEdit = $state(null);
	const supportedClasses = $derived(getSupportedClasses(save.version));
	const isKnownVersion = $derived(isKnownSaveVersion(save.version));
	const canEditClass = $derived(isKnownVersion && selectedClassForEdit != null);
	const classSupportWarning = $derived.by(() => {
		if (!isKnownVersion) {
			return `Class editing is disabled for unsupported save version ${save.version}.`;
		}

		if (
			typeof save.character.class !== "string" ||
			!isClassSupportedForVersion(save.version, save.character.class)
		) {
			return `Current class (${classLabel(save.character.class)}) is not recognized for version ${save.version}. Select a supported class to continue.`;
		}
		return "";
	});

	$effect(() => {
		const errors = [];
		const warnings = [];
		if (!validName) {
			errors.push(
				nameValidationMessage.length > 0
					? nameValidationMessage
					: "Character name is invalid."
			);
		}
		if (classSupportWarning.length > 0) {
			warnings.push(classSupportWarning);
		}
		editValidation = { errors, warnings };
	});

	$effect(() => {
		selectedClassForEdit = normalizeClassForVersion(save.version, save.character.class);
	});

	$effect(() => {
		if (requiresExpansion(save.version, save.character.class)) {
			save.character.status.expansion = true;
		}
	});

	function updateTitle() {
		save.character.progression =
			(4 + (save.character.status.expansion ? 1 : 0)) *
			difficultiesToBeat.indexOf(difficultyBeaten);
		title = calcTitle(save.character);
	}

	// Level & XP

	async function changeLevel() {
		if (save.character.level == save.attributes.level.value) {
			return; // if we have changed to the same value, don't erase old xp
		}
		save.character.level = save.attributes.level.value;
		save.attributes.experience.value = experienceTable[save.attributes.level.value - 1];
	}

	async function changeExperience() {
		let new_level = 99;
		for (let i = 0; i < 99; i++) {
			if (experienceTable[i] > save.attributes.experience.value) {
				new_level = i;
				break;
			}
		}
		if (new_level != save.attributes.level.value) {
			save.attributes.level.value = new_level;
			save.character.level = new_level;
		}
	}

	// Name validation

	function validateName() {
		if (nameRef == null) {
			return;
		}
		const value = String(nameRef.value ?? "");
		let message = "";
		let characters = Array.from(value).length;
		if (characters < 2 || characters > 15) {
			message = "Name must be 2-15 characters";
		}
		if (message.length === 0 && !RegExp(/^\p{L}[\p{L}_-]*$/, "u").test(value)) {
			// Check that string starts with a unicode letters
			// and only contains unicode letters or _ -
			message = "Name must start with a letter and only contain letters, _ or -";
		}
		let dashes = 0;
		let underscores = 0;
		for (const char of value) {
			if (char === "-") {
				dashes += 1;
			} else if (char === "_") {
				underscores += 1;
			}
		}
		if (message.length === 0 && (dashes > 1 || underscores > 1)) {
			message = "Name can only contain 1 _ or -";
		}
		validName = message.length === 0;
		nameValidationMessage = message;
		nameRef.setCustomValidity(message);
		if (validName) {
			save.character.name = value;
		}
	}

	$effect(() => {
		if (nameRef != null) {
			validateName();
		}
	});

	async function changeClass(nextClass) {
		if (nextClass == null) {
			return;
		}

		try {
			let newSave = await invoke("new_save", {
				version: Number(save.version),
				class: nextClass,
			});
			save.character.class = nextClass;
			save.skills = newSave.skills;
			newSave.attributes.statpts.value = save.attributes.statpts.value;
			newSave.attributes.newskills.value = save.attributes.newskills.value;
			newSave.attributes.experience.value = save.attributes.experience.value;
			newSave.attributes.level.value = save.attributes.level.value;
			newSave.attributes.gold.value = save.attributes.gold.value;
			newSave.attributes.goldbank.value = save.attributes.goldbank.value;
			save.attributes = newSave.attributes;
			updateTitle();
		} catch (err) {
			console.error(err);
			selectedClassForEdit = normalizeClassForVersion(save.version, save.character.class);
		}
	}
</script>

<div class="grid grid-cols-1 content-start gap-[0.6rem] xl:grid-cols-2">
	<div class="grid content-start gap-[0.6rem]">
		<section class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-[0.6rem] py-[0.44rem]">
			<h3 class="editor-card-title mb-[0.34rem]">Identity</h3>
			<div class="grid grid-cols-[7.6rem_minmax(0,1fr)] items-center gap-x-[0.62rem] gap-y-[0.26rem]">
				<label class="form-label mb-0" for="name">Name</label>
				<input
					class="form-control"
					onkeydown={validateName}
					oninput={validateName}
					onchange={validateName}
					title="2-15 characters"
					bind:this={nameRef}
					type="text"
					id="name"
					placeholder="default"
					name="name"
					required
					minlength="2"
					maxlength="15"
					size="15"
					value={save.character.name}
				/>
				<div></div>
				<div class="form-text m-0">
					Name rules: 2-15 characters, starts with a letter, letters plus `_` or `-` only,
					and at most one `_` and one `-`.
				</div>
			</div>

			<div class="mt-[0.24rem] grid grid-cols-[7.6rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
				<label class="form-label mb-0" for="class">Class</label>
				{#if canEditClass}
					<select
						class="form-select"
						bind:value={selectedClassForEdit}
						name="class"
						id="class"
						onchange={() => {
							changeClass(selectedClassForEdit);
						}}
					>
						{#each supportedClasses as className}
							<option value={className}>{className}</option>
						{/each}
					</select>
				{:else}
					<input
						class="form-control"
						type="text"
						name="class"
						id="class"
						value={classLabel(save.character.class)}
						readonly
					/>
				{/if}
			</div>
			{#if classSupportWarning.length > 0}
				<div class="form-text mt-[0.2rem] text-halbu-warning sm:pl-[8.1rem]">{classSupportWarning}</div>
			{/if}

			<div class="mt-[0.24rem] grid grid-cols-[7.6rem_minmax(0,1fr)] items-start gap-x-[0.62rem] gap-y-[0.16rem]">
				<span class="form-label mb-0">Mode</span>
				<div class="flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.28rem] text-[0.9rem]">
					<label class="inline-flex items-center gap-[0.36rem]">
						<input
							class="form-check-input mt-0"
							type="checkbox"
							id="expansion"
							name="expansion"
							bind:checked={save.character.status.expansion}
							disabled={requiresExpansion(save.version, save.character.class)}
							onchange={updateTitle}
						/>
						<span>Expansion</span>
					</label>
					<label class="inline-flex items-center gap-[0.36rem]">
						<input
							class="form-check-input mt-0"
							type="checkbox"
							id="hardcore"
							name="hardcore"
							bind:checked={save.character.status.hardcore}
							onchange={updateTitle}
						/>
						<span>Hardcore</span>
					</label>
					<label class="inline-flex items-center gap-[0.36rem]">
						<input
							class="form-check-input mt-0"
							type="checkbox"
							id="ladder"
							name="ladder"
							bind:checked={save.character.status.ladder}
						/>
							<span>Ladder</span>
						</label>
					<div class="inline-flex items-center">
						<label class="inline-flex items-center gap-[0.36rem]">
							<input
								class="form-check-input mt-0"
								type="checkbox"
								id="died"
								name="died"
								bind:checked={save.character.status.died}
							/>
							<span>Died</span>
						</label>
					</div>
				</div>
			</div>
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.44rem]">
			<h3 class="editor-card-title mb-[0.34rem]">Progression</h3>
			<div class="grid grid-cols-1 gap-[0.3rem] sm:grid-cols-2 sm:gap-x-[0.72rem]">
				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.44rem]">
					<label class="form-label mb-0" for="level">Level</label>
					<input
						class="form-control"
						type="number"
						name="level"
						id="level"
						min="1"
						max="99"
						step="1"
						use:enforceMinMax
						bind:value={save.attributes.level.value}
						oninput={changeLevel}
					/>
				</div>

				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.44rem]">
					<label class="form-label mb-0" for="experience">Experience</label>
					<input
						class="form-control"
						type="number"
						name="experience"
						id="experience"
						min="0"
						max={MAX_XP}
						step="1"
						use:enforceMinMax
						bind:value={save.attributes.experience.value}
						oninput={changeExperience}
					/>
				</div>

				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.44rem]">
					<label class="form-label mb-0" for="currentAct">Act</label>
					<select class="form-select" bind:value={save.character.act} name="currentAct" id="currentAct">
						<option value={Act.Act1}>Act I</option>
						<option value={Act.Act2}>Act II</option>
						<option value={Act.Act3}>Act III</option>
						<option value={Act.Act4}>Act IV</option>
						<option value={Act.Act5}>Act V</option>
					</select>
				</div>

				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.44rem]">
					<label class="form-label mb-0" for="currentDifficulty">Difficulty</label>
					<select
						class="form-select"
						bind:value={save.character.difficulty}
						name="currentDifficulty"
						id="currentDifficulty"
					>
						<option value={Difficulty.Normal}>Normal</option>
						<option value={Difficulty.Nightmare}>Nightmare</option>
						<option value={Difficulty.Hell}>Hell</option>
					</select>
				</div>

				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.44rem]">
					<label class="form-label mb-0" for="difficultyBeaten">Difficulty beaten</label>
					<select
						class="form-select"
						bind:value={difficultyBeaten}
						onchange={updateTitle}
						name="difficultyBeaten"
						id="difficultyBeaten"
					>
						<option value="None" selected={difficultyBeaten === "None"}>None</option>
						<option value="Normal" selected={difficultyBeaten === "Normal"}>Normal</option>
						<option value="Nightmare" selected={difficultyBeaten === "Nightmare"}>Nightmare</option>
						<option value="Hell" selected={difficultyBeaten === "Hell"}>Hell</option>
					</select>
				</div>

				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.44rem]">
					<label class="form-label mb-0" for="title">Title</label>
					<input
						class="form-control form-control-readonly"
						type="text"
						name="title"
						id="title"
						bind:value={title}
						readonly
					/>
				</div>

			</div>
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.44rem]">
			<h3 class="editor-card-title mb-[0.34rem]">Gold</h3>
			<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] gap-y-[0.28rem] sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-[0.62rem]">
				<label class="form-label mb-0" for="goldInventory">Inventory</label>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="goldInventory"
					id="goldInventory"
					min="0"
					max={goldInventoryMax}
					step="1"
					bind:value={save.attributes.gold.value}
				/>

				<label class="form-label mb-0" for="goldStash">Stash</label>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="goldStash"
					id="goldStash"
					min="0"
					max="2500000"
					step="1"
					bind:value={save.attributes.goldbank.value}
				/>
			</div>
		</section>
	</div>

	<div class="grid content-start gap-[0.6rem]">
		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]">
			<h3 class="editor-card-title mb-[0.34rem]">Attributes & Points</h3>
			<div class="grid grid-cols-1 gap-y-[0.28rem] md:grid-cols-2 md:gap-x-[0.72rem]">
				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="strength">Strength</label>
					<input
						class="form-control"
						type="number"
						name="strength"
						id="strength"
						min="0"
						max="1023"
						step="1"
						use:enforceMinMax
						bind:value={save.attributes.strength.value}
					/>
				</div>
				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="statPointsLeft">Stat points left</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="statPointsLeft"
						id="statPointsLeft"
						min="0"
						max="1023"
						step="1"
						bind:value={save.attributes.statpts.value}
					/>
				</div>

				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="dexterity">Dexterity</label>
					<input
						class="form-control"
						type="number"
						name="dexterity"
						id="dexterity"
						min="0"
						max="1023"
						step="1"
						use:enforceMinMax
						bind:value={save.attributes.dexterity.value}
					/>
				</div>
				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="skillPointsLeft">Skill points left</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="skillPointsLeft"
						id="skillPointsLeft"
						min="0"
						max="255"
						step="1"
						bind:value={save.attributes.newskills.value}
					/>
				</div>

				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="vitality">Vitality</label>
					<input
						class="form-control"
						type="number"
						name="vitality"
						id="vitality"
						min="0"
						max="1023"
						step="1"
						use:enforceMinMax
						bind:value={save.attributes.vitality.value}
					/>
				</div>
				<div class="hidden md:block"></div>

				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="energy">Energy</label>
					<input
						class="form-control"
						type="number"
						name="energy"
						id="energy"
						min="0"
						max="1023"
						step="1"
						use:enforceMinMax
						bind:value={save.attributes.energy.value}
					/>
				</div>
				<div class="hidden md:block"></div>
			</div>
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]">
			<h3 class="editor-card-title mb-[0.34rem]">Resources</h3>
			<div class="grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-[0.62rem] gap-y-[0.3rem]">
				<div></div>
				<div class="text-[0.84rem] text-halbu-textMuted">Current</div>
				<div class="text-[0.84rem] text-halbu-textMuted">Base</div>

				<div class="text-[0.9rem] text-halbu-text">Life</div>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="lifeCurrent"
					id="lifeCurrent"
					min="1"
					max="8181"
					step="0.001"
					bind:value={currentLife}
				/>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="lifeBase"
					id="lifeBase"
					min="1"
					max="8181"
					step="0.001"
					bind:value={baseLife}
				/>

				<div class="text-[0.9rem] text-halbu-text">Mana</div>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="manaCurrent"
					id="manaCurrent"
					min="1"
					max="8181"
					step="0.001"
					bind:value={currentMana}
				/>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="manaBase"
					id="manaBase"
					min="1"
					max="8181"
					step="0.001"
					bind:value={baseMana}
				/>

				<div class="text-[0.9rem] text-halbu-text">Stamina</div>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="staminaCurrent"
					id="staminaCurrent"
					min="1"
					max="8181"
					step="0.001"
					bind:value={currentStamina}
				/>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="staminaBase"
					id="staminaBase"
					min="1"
					max="8181"
					step="0.001"
					bind:value={baseStamina}
				/>

			</div>
		</section>
	</div>
</div>
