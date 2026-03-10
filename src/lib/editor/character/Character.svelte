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
	import { Difficulty, Act } from "../../utils/constants.js";
	import {
		buildCharacterEditValidation,
		experienceForLevel,
		levelForExperience,
		validateCharacterName,
	} from "./characterLogic.js";

	let { save = $bindable(), editValidation = $bindable({ errors: [], warnings: [] }) } = $props();

	const MAX_GOLD_PER_LEVEL = 10000;
	const MAX_XP = 3520485254;
	const ATTRIBUTE_MIN = 0;
	const ATTRIBUTE_MAX = 1023;
	const STAT_POINTS_MAX = 1023;
	const SKILL_POINTS_MAX = 255;
	const MAP_SEED_MAX = 0xffffffff;
	const QUICK_ADJUST_NEGATIVE_STEPS = Object.freeze([-10]);
	const QUICK_ADJUST_POSITIVE_STEPS = Object.freeze([10]);

	let nameRef;
	let validName = $state(true);
	let nameValidationMessage = $state("");
	let mapSeedDisplayMode = $state("decimal");
	let mapSeedDraft = $state("");
	let mapSeedInputRef;
	let isMapSeedEditing = $state(false);

	const goldInventoryMax = $derived(MAX_GOLD_PER_LEVEL * save.character.level);
	const normalizedMapSeed = $derived.by(() => {
		const parsed = Number(save?.character?.map_seed);
		if (!Number.isFinite(parsed)) {
			return null;
		}
		return Math.trunc(parsed) >>> 0;
	});
	const mapSeedDisplayValue = $derived(formatMapSeed(normalizedMapSeed, mapSeedDisplayMode));

	$effect(() => {
		if (!isMapSeedEditing && mapSeedDraft !== mapSeedDisplayValue) {
			mapSeedDraft = mapSeedDisplayValue;
		}
	});

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
		editValidation = buildCharacterEditValidation(
			validName,
			nameValidationMessage,
			classSupportWarning,
		);
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
		save.attributes.experience.value = experienceForLevel(
			save.attributes.level.value,
			experienceTable,
		);
	}

	async function changeExperience() {
		const new_level = levelForExperience(save.attributes.experience.value, experienceTable);
		if (new_level != save.attributes.level.value) {
			save.attributes.level.value = new_level;
			save.character.level = new_level;
		}
	}

	function clampInteger(value, min, max) {
		const parsed = Number(value);
		const normalized = Number.isFinite(parsed) ? Math.trunc(parsed) : min;
		return Math.max(min, Math.min(max, normalized));
	}

	function getAttributeValue(attributeId) {
		return clampInteger(save.attributes?.[attributeId]?.value, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
	}

	function setAttributeValue(attributeId, rawValue) {
		if (save.attributes?.[attributeId] == null) {
			return;
		}
		save.attributes[attributeId].value = clampInteger(rawValue, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
	}

	function adjustAttributeValue(attributeId, delta) {
		const currentValue = getAttributeValue(attributeId);
		setAttributeValue(attributeId, currentValue + Number(delta || 0));
	}

	function isAttributeAdjustmentDisabled(attributeId, delta) {
		const currentValue = getAttributeValue(attributeId);
		return delta < 0 ? currentValue <= ATTRIBUTE_MIN : currentValue >= ATTRIBUTE_MAX;
	}

	function getPointsValue(pointsKey, maxValue) {
		return clampInteger(save.attributes?.[pointsKey]?.value, ATTRIBUTE_MIN, maxValue);
	}

	function setPointsValue(pointsKey, rawValue, maxValue) {
		if (save.attributes?.[pointsKey] == null) {
			return;
		}
		save.attributes[pointsKey].value = clampInteger(rawValue, ATTRIBUTE_MIN, maxValue);
	}

	function adjustPointsValue(pointsKey, delta, maxValue) {
		const currentValue = getPointsValue(pointsKey, maxValue);
		setPointsValue(pointsKey, currentValue + Number(delta || 0), maxValue);
	}

	function isPointsAdjustmentDisabled(pointsKey, delta, maxValue) {
		const currentValue = getPointsValue(pointsKey, maxValue);
		return delta < 0 ? currentValue <= ATTRIBUTE_MIN : currentValue >= maxValue;
	}

	function formatMapSeed(value, mode) {
		if (!Number.isFinite(value)) {
			return "";
		}
		const normalized = Math.trunc(value) >>> 0;
		if (mode === "hex") {
			return `0x${normalized.toString(16).toUpperCase().padStart(8, "0")}`;
		}
		return String(normalized);
	}

	function parseMapSeedInput(rawValue) {
		const value = String(rawValue ?? "").trim();
		let parsed = Number.NaN;
		if (/^0x[0-9a-f]+$/i.test(value)) {
			parsed = Number.parseInt(value.slice(2), 16);
		} else if (/^[0-9]+$/.test(value)) {
			parsed = Number.parseInt(value, 10);
		}
		if (!Number.isFinite(parsed)) {
			return null;
		}
		const clamped = clampInteger(parsed, 0, MAP_SEED_MAX);
		return clamped >>> 0;
	}

	function commitMapSeedDraft() {
		if (save?.character == null) {
			return;
		}
		const parsed = parseMapSeedInput(mapSeedDraft);
		if (parsed == null) {
			if (mapSeedInputRef != null) {
				mapSeedInputRef.setCustomValidity("Use decimal digits or 0x-prefixed hex.");
				mapSeedInputRef.reportValidity();
				mapSeedInputRef.setCustomValidity("");
			}
			mapSeedDraft = mapSeedDisplayValue;
			return;
		}
		save.character.map_seed = parsed;
		mapSeedDraft = formatMapSeed(parsed, mapSeedDisplayMode);
	}

	function handleMapSeedInput(event) {
		mapSeedDraft = event.currentTarget.value;
		if (mapSeedInputRef != null) {
			mapSeedInputRef.setCustomValidity("");
		}
	}

	function handleMapSeedFocus() {
		isMapSeedEditing = true;
	}

	function handleMapSeedBlur() {
		commitMapSeedDraft();
		isMapSeedEditing = false;
	}

	function handleMapSeedKeydown(event) {
		if (event.key !== "Enter") {
			return;
		}
		event.preventDefault();
		commitMapSeedDraft();
		event.currentTarget.blur();
	}

	function setMapSeedDisplayMode(nextMode) {
		mapSeedDisplayMode = nextMode === "hex" ? "hex" : "decimal";
	}

	// Name validation

	function validateName() {
		if (nameRef == null) {
			return;
		}
		const result = validateCharacterName(nameRef.value);
		validName = result.valid;
		nameValidationMessage = result.message;
		nameRef.setCustomValidity(result.message);
		if (validName) {
			save.character.name = result.value;
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
		<section
			class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-[0.6rem] py-[0.44rem]"
		>
			<h3 class="editor-card-title mb-[0.34rem]">Identity</h3>
			<div
				class="grid grid-cols-[7.6rem_minmax(0,1fr)] items-center gap-x-[0.62rem] gap-y-[0.26rem]"
			>
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

			<div
				class="mt-[0.24rem] grid grid-cols-[7.6rem_minmax(0,1fr)] items-center gap-x-[0.62rem]"
			>
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
				<div class="form-text mt-[0.2rem] text-halbu-warning sm:pl-[8.1rem]">
					{classSupportWarning}
				</div>
			{/if}

			<div
				class="mt-[0.24rem] grid grid-cols-[7.6rem_minmax(0,1fr)] items-start gap-x-[0.62rem] gap-y-[0.16rem]"
			>
				<span class="form-label mb-0">Mode</span>
				<div
					class="flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.28rem] text-[0.9rem]"
				>
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

		<section
			class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.44rem]"
		>
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
					<select
						class="form-select"
						bind:value={save.character.act}
						name="currentAct"
						id="currentAct"
					>
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
						<option value="Normal" selected={difficultyBeaten === "Normal"}
							>Normal</option
						>
						<option value="Nightmare" selected={difficultyBeaten === "Nightmare"}
							>Nightmare</option
						>
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

		<section
			class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.44rem]"
		>
			<h3 class="editor-card-title mb-[0.34rem]">Gold</h3>
			<div
				class="grid grid-cols-[7.4rem_minmax(0,1fr)] gap-y-[0.28rem] sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-[0.62rem]"
			>
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

		<section
			class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.44rem]"
		>
			<h3 class="editor-card-title mb-[0.34rem]">Map Seed</h3>
			<div
				class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.44rem] gap-y-[0.3rem]"
			>
				<span class="form-label mb-0">Format</span>
				<div
					class="inline-flex w-fit overflow-hidden rounded-xs border border-halbu-borderStrong"
				>
					<button
						type="button"
						class={`h-[1.86rem] min-w-[4.7rem] px-[0.52rem] text-[0.82rem] font-semibold transition ${
							mapSeedDisplayMode === "decimal"
								? "bg-halbu-primary text-halbu-white"
								: "bg-halbu-panel2 text-halbu-text hover:bg-halbu-primarySoft"
						}`}
						onclick={() => setMapSeedDisplayMode("decimal")}
					>
						Decimal
					</button>
					<button
						type="button"
						class={`h-[1.86rem] min-w-[4.7rem] border-l border-halbu-borderStrong px-[0.52rem] text-[0.82rem] font-semibold transition ${
							mapSeedDisplayMode === "hex"
								? "bg-halbu-primary text-halbu-white"
								: "bg-halbu-panel2 text-halbu-text hover:bg-halbu-primarySoft"
						}`}
						onclick={() => setMapSeedDisplayMode("hex")}
					>
						Hex
					</button>
				</div>

				<label class="form-label mb-0" for="mapSeed">Seed</label>
				<input
					class="form-control max-w-[10.6rem]"
					type="text"
					name="mapSeed"
					id="mapSeed"
					placeholder="123456789 or 0x075BCD15"
					bind:this={mapSeedInputRef}
					bind:value={mapSeedDraft}
					onfocus={handleMapSeedFocus}
					oninput={handleMapSeedInput}
					onblur={handleMapSeedBlur}
					onkeydown={handleMapSeedKeydown}
				/>

				<div></div>
			</div>
		</section>
	</div>

	<div class="grid content-start gap-[0.6rem]">
		<section
			class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]"
		>
			<h3 class="editor-card-title mb-[0.34rem]">Attributes</h3>
			<div class="grid gap-y-[0.28rem]">
				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="strength">Strength</label>
					<div class="flex items-center gap-[0.2rem]">
						{#each QUICK_ADJUST_NEGATIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("strength", delta)}
								disabled={isAttributeAdjustmentDisabled("strength", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} strength by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
						<input
							class="form-control max-w-[4.6rem] text-center"
							type="number"
							name="strength"
							id="strength"
							min="0"
							max="1023"
							step="1"
							use:enforceMinMax
							bind:value={save.attributes.strength.value}
							onchange={(event) =>
								setAttributeValue("strength", event.currentTarget.value)}
						/>
						{#each QUICK_ADJUST_POSITIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("strength", delta)}
								disabled={isAttributeAdjustmentDisabled("strength", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} strength by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="dexterity">Dexterity</label>
					<div class="flex items-center gap-[0.2rem]">
						{#each QUICK_ADJUST_NEGATIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("dexterity", delta)}
								disabled={isAttributeAdjustmentDisabled("dexterity", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} dexterity by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
						<input
							class="form-control max-w-[4.6rem] text-center"
							type="number"
							name="dexterity"
							id="dexterity"
							min="0"
							max="1023"
							step="1"
							use:enforceMinMax
							bind:value={save.attributes.dexterity.value}
							onchange={(event) =>
								setAttributeValue("dexterity", event.currentTarget.value)}
						/>
						{#each QUICK_ADJUST_POSITIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("dexterity", delta)}
								disabled={isAttributeAdjustmentDisabled("dexterity", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} dexterity by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="vitality">Vitality</label>
					<div class="flex items-center gap-[0.2rem]">
						{#each QUICK_ADJUST_NEGATIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("vitality", delta)}
								disabled={isAttributeAdjustmentDisabled("vitality", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} vitality by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
						<input
							class="form-control max-w-[4.6rem] text-center"
							type="number"
							name="vitality"
							id="vitality"
							min="0"
							max="1023"
							step="1"
							use:enforceMinMax
							bind:value={save.attributes.vitality.value}
							onchange={(event) =>
								setAttributeValue("vitality", event.currentTarget.value)}
						/>
						{#each QUICK_ADJUST_POSITIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("vitality", delta)}
								disabled={isAttributeAdjustmentDisabled("vitality", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} vitality by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-[7.1rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="energy">Energy</label>
					<div class="flex items-center gap-[0.2rem]">
						{#each QUICK_ADJUST_NEGATIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("energy", delta)}
								disabled={isAttributeAdjustmentDisabled("energy", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} energy by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
						<input
							class="form-control max-w-[4.6rem] text-center"
							type="number"
							name="energy"
							id="energy"
							min="0"
							max="1023"
							step="1"
							use:enforceMinMax
							bind:value={save.attributes.energy.value}
							onchange={(event) =>
								setAttributeValue("energy", event.currentTarget.value)}
						/>
						{#each QUICK_ADJUST_POSITIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustAttributeValue("energy", delta)}
								disabled={isAttributeAdjustmentDisabled("energy", delta)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} energy by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<section
			class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]"
		>
			<h3 class="editor-card-title mb-[0.34rem]">Points</h3>
			<div class="grid gap-y-[0.28rem]">
				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="statPointsLeft">Stat points left</label>
					<div class="flex items-center gap-[0.2rem]">
						{#each QUICK_ADJUST_NEGATIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustPointsValue("statpts", delta, STAT_POINTS_MAX)}
								disabled={isPointsAdjustmentDisabled(
									"statpts",
									delta,
									STAT_POINTS_MAX,
								)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} stat points by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
						<input
							class="form-control max-w-[4.6rem] text-center"
							use:enforceMinMax
							type="number"
							name="statPointsLeft"
							id="statPointsLeft"
							min="0"
							max={STAT_POINTS_MAX}
							step="1"
							bind:value={save.attributes.statpts.value}
							onchange={(event) =>
								setPointsValue(
									"statpts",
									event.currentTarget.value,
									STAT_POINTS_MAX,
								)}
						/>
						{#each QUICK_ADJUST_POSITIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustPointsValue("statpts", delta, STAT_POINTS_MAX)}
								disabled={isPointsAdjustmentDisabled(
									"statpts",
									delta,
									STAT_POINTS_MAX,
								)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} stat points by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-[7.4rem_minmax(0,1fr)] items-center gap-x-[0.62rem]">
					<label class="form-label mb-0" for="skillPointsLeft">Skill points left</label>
					<div class="flex items-center gap-[0.2rem]">
						{#each QUICK_ADJUST_NEGATIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() =>
									adjustPointsValue("newskills", delta, SKILL_POINTS_MAX)}
								disabled={isPointsAdjustmentDisabled(
									"newskills",
									delta,
									SKILL_POINTS_MAX,
								)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} skill points by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
						<input
							class="form-control max-w-[4.6rem] text-center"
							use:enforceMinMax
							type="number"
							name="skillPointsLeft"
							id="skillPointsLeft"
							min="0"
							max={SKILL_POINTS_MAX}
							step="1"
							bind:value={save.attributes.newskills.value}
							onchange={(event) =>
								setPointsValue(
									"newskills",
									event.currentTarget.value,
									SKILL_POINTS_MAX,
								)}
						/>
						{#each QUICK_ADJUST_POSITIVE_STEPS as delta}
							<button
								type="button"
								class="h-[1.9rem] min-w-[2.15rem] rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-[0.28rem] text-[0.76rem] font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() =>
									adjustPointsValue("newskills", delta, SKILL_POINTS_MAX)}
								disabled={isPointsAdjustmentDisabled(
									"newskills",
									delta,
									SKILL_POINTS_MAX,
								)}
								aria-label={`${delta < 0 ? "Decrease" : "Increase"} skill points by ${Math.abs(delta)}`}
							>
								{delta > 0 ? `+${delta}` : `${delta}`}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<section
			class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]"
		>
			<h3 class="editor-card-title mb-[0.34rem]">Resources</h3>
			<div
				class="grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-[0.62rem] gap-y-[0.3rem]"
			>
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
