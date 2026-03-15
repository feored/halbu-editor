<script>
	import { invoke } from "@tauri-apps/api/core";
	import { enforceMinMax } from "../../utils/actions.js";
	import { calcTitle, calcDifficultyBeaten } from "../../utils/Utils.svelte";
	import { RESOURCE_Q8_SCALE } from "../../utils/resources.js";
	import {
		clampInteger,
	} from "../../utils/numbers.js";
	import {
		getSupportedClass,
		getSaveExpansionType,
		getSupportedClasses,
		isExpandedMode,
		isClassSupportedForVersion,
		toExpansionType,
	} from "../../utils/GameSupport";
	import { getErrorMessage } from "../../utils/errorMessage.js";

	import experienceTable from "./experience.json";
	import { Difficulty, Act } from "../../utils/constants.js";
	import {
		buildCharacterEditValidation,
		experienceForLevel,
		levelForExperience,
		validateCharacterName,
	} from "./characterLogic";
	import {
		commitResourceDraftValue,
		formatMapSeedValue,
		parseMapSeedDraft,
		resolveResourceDisplayValue,
	} from "./characterFieldLogic";
	import { toEditorSave } from "../../types/editorPayload";
	import { DEFAULT_SKILL_SLOT_COUNT, resizeSkillSlots } from "../skills/skillSlots";

	let {
		save = $bindable(),
		editValidation = $bindable({ errors: [], warnings: [] }),
		parserLayoutVersion = null,
	} = $props();

	const MAX_GOLD_PER_LEVEL = 10000;
	const MAX_XP = 3520485254;
	const ATTRIBUTE_MIN = 0;
	const ATTRIBUTE_MAX = 1023;
	const STAT_POINTS_MAX = 1023;
	const SKILL_POINTS_MAX = 255;
	const MAP_SEED_MAX = 0xffffffff;
	const QUICK_ADJUST_STEP = 10;
	const RESOURCE_DISPLAY_MIN = 1;
	const RESOURCE_DISPLAY_MAX = 8181;
	const primaryAttributes = [
		{ id: "strength", label: "Strength", attribute: "strength", max: ATTRIBUTE_MAX },
		{ id: "dexterity", label: "Dexterity", attribute: "dexterity", max: ATTRIBUTE_MAX },
		{ id: "vitality", label: "Vitality", attribute: "vitality", max: ATTRIBUTE_MAX },
		{ id: "energy", label: "Energy", attribute: "energy", max: ATTRIBUTE_MAX },
	];
	const pointFields = [
		{
			id: "statPointsLeft",
			label: "Stat points left",
			attribute: "statpts",
			max: STAT_POINTS_MAX,
			ariaLabel: "stat points",
		},
		{
			id: "skillPointsLeft",
			label: "Skill points left",
			attribute: "newskills",
			max: SKILL_POINTS_MAX,
			ariaLabel: "skill points",
		},
	];
	const resourceFields = [
		{
			label: "Life",
			currentId: "lifeCurrent",
			currentAttr: "hitpoints",
			baseId: "lifeBase",
			baseAttr: "maxhp",
		},
		{
			label: "Mana",
			currentId: "manaCurrent",
			currentAttr: "mana",
			baseId: "manaBase",
			baseAttr: "maxmana",
		},
		{
			label: "Stamina",
			currentId: "staminaCurrent",
			currentAttr: "stamina",
			baseId: "staminaBase",
			baseAttr: "maxstamina",
		},
	];

	let nameRef;
	let validName = $state(true);
	let nameValidationMessage = $state("");
	let classChangeError = $state("");
	let mapSeedDisplayMode = $state("decimal");
	let mapSeedDraft = $state("");
	let mapSeedInputRef;
	let isMapSeedEditing = $state(false);
	let resourceDraftByField = $state({});

	const normalizedLevelForGold = $derived.by(() =>
		clampInteger(save.attributes.level.value, 1, 99)
	);
	const goldInventoryMax = $derived(MAX_GOLD_PER_LEVEL * normalizedLevelForGold);
	const mapSeedDisplayValue = $derived(
		formatMapSeedValue(save.character.map_seed, mapSeedDisplayMode)
	);

	$effect(() => {
		if (!isMapSeedEditing && mapSeedDraft !== mapSeedDisplayValue) {
			mapSeedDraft = mapSeedDisplayValue;
		}
	});

	// Title & Progression

	const DIFFICULTY_BEATEN_ORDER = ["None", "Normal", "Nightmare", "Hell"];
	let difficultyBeaten = $state(calcDifficultyBeaten(save.character, getSaveExpansionType(save)));
	let title = $state("");
	updateTitle();

	let selectedClassForEdit = $state(null);
	const effectiveVersion = $derived(
		parserLayoutVersion == null ? save.version : parserLayoutVersion,
	);
	const supportedClasses = $derived(getSupportedClasses(effectiveVersion));
	const canEditClass = $derived(selectedClassForEdit != null);
	const classSupportWarning = $derived.by(() => {
		if (!isClassSupportedForVersion(effectiveVersion, save.character.class)) {
			return `Current class (${save.character.class}) is not recognized for layout version ${effectiveVersion}. Select a supported class to continue.`;
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
		selectedClassForEdit = getSupportedClass(effectiveVersion, save.character.class);
	});

	function updateTitle() {
		const expansionType = getSaveExpansionType(save);
		save.character.progression =
			(4 + (isExpandedMode(expansionType) ? 1 : 0)) *
			DIFFICULTY_BEATEN_ORDER.indexOf(difficultyBeaten);
		title = calcTitle(save.character, expansionType);
	}

	function setExpansionType(nextExpansionType) {
		const expansionType = toExpansionType(nextExpansionType);
		save.expansion_type = expansionType;
		updateTitle();
	}

	// Level & XP

	function changeLevel() {
		if (save.character.level == save.attributes.level.value) {
			return; // if we have changed to the same value, don't erase old xp
		}
		save.character.level = save.attributes.level.value;
		save.attributes.experience.value = experienceForLevel(
			save.attributes.level.value,
			experienceTable,
		);
	}

	function changeExperience() {
		const newLevel = levelForExperience(save.attributes.experience.value, experienceTable);
		if (newLevel != save.attributes.level.value) {
			save.attributes.level.value = newLevel;
			save.character.level = newLevel;
		}
	}

	$effect(() => {
		const currentGold = clampInteger(save.attributes.gold.value, 0, 2500000);
		if (currentGold > goldInventoryMax) {
			save.attributes.gold.value = goldInventoryMax;
		}
	});

	function setClamped(attribute, nextValue, maxValue = ATTRIBUTE_MAX) {
		attribute.value = clampInteger(nextValue, ATTRIBUTE_MIN, maxValue);
	}

	function isClampedAtBoundary(value, maxValue, delta) {
		const clamped = clampInteger(value, ATTRIBUTE_MIN, maxValue);
		return delta < 0 ? clamped <= ATTRIBUTE_MIN : clamped >= maxValue;
	}

	function resourceDisplayValue(attributeId) {
		const attribute = save.attributes[attributeId];
		return resolveResourceDisplayValue(
			attribute.value,
			attribute.bit_length,
			RESOURCE_Q8_SCALE,
		);
	}

	function resourceInputValue(fieldId, attributeId) {
		const draftValue = resourceDraftByField[fieldId];
		if (draftValue != null) {
			return draftValue;
		}
		return String(
			clampInteger(resourceDisplayValue(attributeId), RESOURCE_DISPLAY_MIN, RESOURCE_DISPLAY_MAX),
		);
	}

	function commitQ8Draft(fieldId, attributeId) {
		const draftValue = resourceDraftByField[fieldId] ?? "";
		const attribute = save.attributes[attributeId];
		attribute.value = commitResourceDraftValue(
			draftValue,
			resourceDisplayValue(attributeId),
			attribute.bit_length,
			RESOURCE_DISPLAY_MIN,
			RESOURCE_DISPLAY_MAX,
			RESOURCE_Q8_SCALE,
		);
		if (!(fieldId in resourceDraftByField)) {
			return;
		}
		const nextDraftByField = { ...resourceDraftByField };
		delete nextDraftByField[fieldId];
		resourceDraftByField = nextDraftByField;
	}

	function commitMapSeedDraft() {
		const parsed = parseMapSeedDraft(mapSeedDraft, MAP_SEED_MAX);
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
		mapSeedDraft = formatMapSeedValue(parsed, mapSeedDisplayMode);
	}

	function handleMapSeedKeydown(event) {
		if (event.key !== "Enter") {
			return;
		}
		event.preventDefault();
		commitMapSeedDraft();
		event.currentTarget.blur();
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

		classChangeError = "";
		try {
			/** @type {import("../../types/editorPayload").BackendEditorSaveDto} */
			const response = await invoke("new_save", {
				version: effectiveVersion,
				class: nextClass,
			});
			const newSave = toEditorSave(response);
			save.character.class = nextClass;
			const slotCount = save.skills.length > 0 ? save.skills.length : DEFAULT_SKILL_SLOT_COUNT;
			save.skills = resizeSkillSlots(newSave.skills, slotCount);
			updateTitle();
		} catch (err) {
			classChangeError = getErrorMessage(err, "Failed to change class.");
			selectedClassForEdit = getSupportedClass(effectiveVersion, save.character.class);
		}
	}
</script>

<div class="grid grid-cols-1 content-start gap-2.5 xl:grid-cols-2">
	<div class="grid content-start gap-2.5">
		<section
			class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2.5 py-2"
		>
			<h3 class="editor-card-title mb-1.5">Identity</h3>
			<div
				class="grid grid-cols-form-32 items-center gap-x-2.5 gap-y-1"
			>
				<label class="form-label mb-0" for="name">Name</label>
					<input
						class="form-control"
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
				class="mt-1 grid grid-cols-form-32 items-center gap-x-2.5"
			>
				<label class="form-label mb-0" for="class">Class</label>
				{#if canEditClass}
					<select
						class="form-select"
						bind:value={selectedClassForEdit}
						name="class"
						id="class"
						onchange={() => changeClass(selectedClassForEdit)}
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
						value={save.character.class}
						readonly
					/>
				{/if}
			</div>
				{#if classSupportWarning.length > 0}
					<div class="form-text mt-1 text-halbu-warning sm:pl-32">
						{classSupportWarning}
					</div>
				{/if}
				{#if classChangeError.length > 0}
					<div class="form-text mt-1 text-halbu-warning sm:pl-32">{classChangeError}</div>
				{/if}

			<div
				class="mt-1 grid grid-cols-form-32 items-start gap-x-2.5 gap-y-0.5"
			>
				<label class="form-label mb-0" for="expansionType">Expansion</label>
				<select
					class="form-select h-7 w-full py-0"
					id="expansionType"
					name="expansionType"
					value={getSaveExpansionType(save)}
					onchange={(event) => setExpansionType(event.currentTarget.value)}
				>
					<option value="Classic">Classic</option>
					<option value="Expansion">Expansion</option>
					<option value="RotW">Reign of the Warlock</option>
				</select>
			</div>

			<div
				class="grid grid-cols-form-32 items-start gap-x-2.5 gap-y-0.5"
			>
				<span class="form-label mb-0">Game Flags</span>
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
					<label class="inline-flex items-center gap-1.5">
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
					<label class="inline-flex items-center gap-1.5">
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
						<label class="inline-flex items-center gap-1.5">
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
			class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
		>
			<h3 class="editor-card-title mb-1.5">Progression</h3>
			<div class="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-3">
				<div class="grid grid-cols-form-24 items-center gap-x-2">
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

				<div class="grid grid-cols-form-24 items-center gap-x-2">
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

				<div class="grid grid-cols-form-24 items-center gap-x-2">
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

				<div class="grid grid-cols-form-24 items-center gap-x-2">
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

				<div class="grid grid-cols-form-24 items-center gap-x-2">
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

				<div class="grid grid-cols-form-24 items-center gap-x-2">
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
			class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
		>
			<h3 class="editor-card-title mb-1.5">Gold</h3>
			<div
				class="grid grid-cols-form-28 gap-y-1 sm:grid-cols-form-32 sm:gap-x-2.5"
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
			class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
		>
			<h3 class="editor-card-title mb-1.5">Map Seed</h3>
			<div
				class="grid grid-cols-form-28 items-center gap-x-2 gap-y-1"
			>
				<span class="form-label mb-0">Format</span>
				<div
					class="inline-flex w-fit overflow-hidden rounded-xs border border-halbu-borderStrong"
				>
					<button
						type="button"
						class={`h-7 min-w-20 px-2 text-sm font-semibold transition ${
							mapSeedDisplayMode === "decimal"
								? "bg-halbu-infoSoft text-halbu-info"
								: "bg-halbu-panel2 text-halbu-text hover:bg-halbu-infoSoft"
						}`}
						onclick={() => (mapSeedDisplayMode = "decimal")}
					>
						Decimal
					</button>
					<button
						type="button"
						class={`h-7 min-w-20 border-l border-halbu-borderStrong px-2 text-sm font-semibold transition ${
							mapSeedDisplayMode === "hex"
								? "bg-halbu-infoSoft text-halbu-info"
								: "bg-halbu-panel2 text-halbu-text hover:bg-halbu-infoSoft"
						}`}
						onclick={() => (mapSeedDisplayMode = "hex")}
					>
						Hex
					</button>
				</div>

				<label class="form-label mb-0" for="mapSeed">Seed</label>
				<input
					class="form-control max-w-44"
					type="text"
					name="mapSeed"
					id="mapSeed"
					placeholder="123456789 or 0x075BCD15"
					bind:this={mapSeedInputRef}
					bind:value={mapSeedDraft}
					onfocus={() => (isMapSeedEditing = true)}
					oninput={(event) => {
						mapSeedDraft = event.currentTarget.value;
						if (mapSeedInputRef != null) {
							mapSeedInputRef.setCustomValidity("");
						}
					}}
					onblur={() => {
						commitMapSeedDraft();
						isMapSeedEditing = false;
					}}
					onkeydown={handleMapSeedKeydown}
				/>

				<div></div>
			</div>
		</section>
	</div>

	<div class="grid content-start gap-2.5">
		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Attributes</h3>
			<div class="grid gap-y-1">
				{#each primaryAttributes as field}
					<div class="grid grid-cols-form-28 items-center gap-x-2.5">
						<label class="form-label mb-0" for={field.id}>{field.label}</label>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() =>
									setClamped(
										save.attributes[field.attribute],
										save.attributes[field.attribute].value - QUICK_ADJUST_STEP,
										field.max,
									)}
								disabled={isClampedAtBoundary(
									save.attributes[field.attribute].value,
									field.max,
									-QUICK_ADJUST_STEP,
								)}
								aria-label={`Decrease ${field.label.toLowerCase()} by ${QUICK_ADJUST_STEP}`}
							>
								-{QUICK_ADJUST_STEP}
							</button>
							<input
								class="form-control max-w-20 text-center"
								type="number"
								name={field.id}
								id={field.id}
								min="0"
								max={field.max}
								step="1"
								use:enforceMinMax
								bind:value={save.attributes[field.attribute].value}
								onchange={(event) =>
									setClamped(save.attributes[field.attribute], event.currentTarget.value, field.max)}
							/>
							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() =>
									setClamped(
										save.attributes[field.attribute],
										save.attributes[field.attribute].value + QUICK_ADJUST_STEP,
										field.max,
									)}
								disabled={isClampedAtBoundary(
									save.attributes[field.attribute].value,
									field.max,
									QUICK_ADJUST_STEP,
								)}
								aria-label={`Increase ${field.label.toLowerCase()} by ${QUICK_ADJUST_STEP}`}
							>
								+{QUICK_ADJUST_STEP}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Points</h3>
			<div class="grid gap-y-1">
				{#each pointFields as field}
					<div class="grid grid-cols-form-28 items-center gap-x-2.5">
						<label class="form-label mb-0" for={field.id}>{field.label}</label>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() =>
									setClamped(
										save.attributes[field.attribute],
										save.attributes[field.attribute].value - QUICK_ADJUST_STEP,
										field.max,
									)}
								disabled={isClampedAtBoundary(
									save.attributes[field.attribute].value,
									field.max,
									-QUICK_ADJUST_STEP,
								)}
								aria-label={`Decrease ${field.ariaLabel} by ${QUICK_ADJUST_STEP}`}
							>
								-{QUICK_ADJUST_STEP}
							</button>
							<input
								class="form-control max-w-20 text-center"
								use:enforceMinMax
								type="number"
								name={field.id}
								id={field.id}
								min="0"
								max={field.max}
								step="1"
								bind:value={save.attributes[field.attribute].value}
								onchange={(event) =>
									setClamped(save.attributes[field.attribute], event.currentTarget.value, field.max)}
							/>
							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() =>
									setClamped(
										save.attributes[field.attribute],
										save.attributes[field.attribute].value + QUICK_ADJUST_STEP,
										field.max,
									)}
								disabled={isClampedAtBoundary(
									save.attributes[field.attribute].value,
									field.max,
									QUICK_ADJUST_STEP,
								)}
								aria-label={`Increase ${field.ariaLabel} by ${QUICK_ADJUST_STEP}`}
							>
								+{QUICK_ADJUST_STEP}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section
			class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
		>
			<h3 class="editor-card-title mb-1.5">Resources</h3>
			<div
				class="grid grid-cols-form-28-2 items-center gap-x-2.5 gap-y-1"
			>
				<div></div>
				<div class="text-sm text-halbu-textMuted">Current</div>
				<div class="text-sm text-halbu-textMuted">Base</div>
				{#each resourceFields as resource}
					<div class="text-sm text-halbu-text">{resource.label}</div>
					{#each [
						{ id: resource.currentId, attributeId: resource.currentAttr },
						{ id: resource.baseId, attributeId: resource.baseAttr },
					] as field}
						<input
							class="form-control"
							type="number"
							name={field.id}
							id={field.id}
							min={RESOURCE_DISPLAY_MIN}
							max={RESOURCE_DISPLAY_MAX}
							step="1"
							value={resourceInputValue(field.id, field.attributeId)}
							onfocus={() => {
								resourceDraftByField = {
									...resourceDraftByField,
									[field.id]: resourceInputValue(field.id, field.attributeId),
								};
							}}
							oninput={(event) => {
								resourceDraftByField = {
									...resourceDraftByField,
									[field.id]: event.currentTarget.value,
								};
							}}
							onblur={() => {
								if (!(field.id in resourceDraftByField)) {
									return;
								}
								commitQ8Draft(field.id, field.attributeId);
							}}
							onkeydown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									commitQ8Draft(field.id, field.attributeId);
									event.currentTarget.blur();
									return;
								}
								if (event.key === "Escape") {
									event.preventDefault();
									if (field.id in resourceDraftByField) {
										const nextDraftByField = { ...resourceDraftByField };
										delete nextDraftByField[field.id];
										resourceDraftByField = nextDraftByField;
									}
									event.currentTarget.blur();
								}
							}}
						/>
					{/each}
				{/each}
			</div>
		</section>
	</div>
</div>
