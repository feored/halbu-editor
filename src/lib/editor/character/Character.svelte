<script lang="ts">
	import { enforceMinMax } from "$lib/utils/actions";
	import { clampInteger, getMaxValueForBitLength } from "$lib/utils/numbers";
	import { getSupportedExpansionTypes, isClassSupportedForVersion } from "$lib/utils/gameData";
	import {
		ACT_LABELS,
		DIFFICULTY_LABELS,
		EXPANSION_TYPE_LABELS,
		getAttributeLabel,
	} from "$lib/editor/editorMetadata";

	import experienceTable from "$lib/editor/character/experience.json";
	import { formatMapSeedValue, parseMapSeedInput } from "$lib/editor/character/characterLogic";
	import {
		getCharacterDerivedState,
		setCharacterExperience,
		setCharacterLevel,
		setClampedAttributeValue,
		setDifficultyBeaten,
		setExpansionType,
		setMapSeed,
		syncInventoryGoldToLevel,
		type DifficultyBeaten,
	} from "$lib/editor/character/characterActions";
	import {
		cancelFieldEdit,
		finishFieldEdit,
		initFieldEdit,
		setFieldError,
		setFieldInput,
		startFieldEdit,
		syncFieldFromValue,
	} from "$lib/utils/fieldEdit";

	import { editorState } from "$lib/editor/editorState.svelte";

	import AttributesSection from "$lib/editor/character/AttributesSection.svelte";
	import ClassSelector from "$lib/editor/character/ClassSelector.svelte";
	import ResourcesSection from "$lib/editor/character/ResourcesSection.svelte";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mode = $derived(session.mode);
	const effectiveDerivedValues = $derived(editorState.gameRulesValues.values);
	const effectiveDerivedValuesError = $derived(editorState.gameRulesValues.error);
	const layoutVersion = $derived(editorState.layoutVersion);
	const validationIssues = $derived(session.validationReport.issues);

	const MAX_GOLD_PER_LEVEL = 10000;
	const MAX_XP = 3520485254;
	const MAP_SEED_MAX = 0xffffffff;
	const QUICK_ADJUST_STEP = 5;

	type PointsAttributeId = "statpts" | "newskills";

	type DifficultyOption = DifficultyBeaten | "None";

	const pointFields: ReadonlyArray<{
		id: PointsAttributeId;
		inputId: string;
	}> = [
		{
			id: "statpts",
			inputId: "statPointsLeft",
		},
		{
			id: "newskills",
			inputId: "skillPointsLeft",
		},
	];

	const difficultyBeatenOptions: ReadonlyArray<DifficultyOption> = [
		"None",
		"Normal",
		"Nightmare",
		"Hell",
	];

	let mapSeedInput: HTMLInputElement | null = null;

	let mapSeedDisplayMode = $state<"decimal" | "hex">("decimal");

	let levelEdit = $state(initFieldEdit(""));
	let experienceEdit = $state(initFieldEdit(""));
	let nameEdit = $state(initFieldEdit(""));
	let mapSeedEdit = $state(initFieldEdit(""));

	const isGameRulesMode = $derived(mode === "game-rules");
	const effectiveVersion = $derived(layoutVersion == null ? save.version : layoutVersion);
	const editingVersion = $derived(editorState.targetVersion ?? effectiveVersion);
	const mapSeedDisplayValue = $derived(
		formatMapSeedValue(save.character.mapSeed, mapSeedDisplayMode),
	);
	const characterDerivedState = $derived(getCharacterDerivedState(save));
	const difficultyBeaten = $derived(characterDerivedState.difficultyBeaten);
	const title = $derived(characterDerivedState.title);
	const supportedExpansionTypes = $derived(getSupportedExpansionTypes(editingVersion));
	let showPointsGameRulesHelp = $state(false);

	const classSupportWarning = $derived.by(() => {
		if (!isClassSupportedForVersion(editingVersion, save.character.className)) {
			return `Current class (${save.character.className}) is not recognized for editing version ${editingVersion}. Apply a supported class template to continue.`;
		}

		return "";
	});

	const progressionValidationWarning = $derived.by(() => {
		const issue = validationIssues.find(
			(candidate) => candidate.code === "ProgressionNonCanonical",
		);

		return issue?.message ?? "";
	});

	$effect(() => {
		if (supportedExpansionTypes.length === 0) {
			return;
		}

		if (!supportedExpansionTypes.includes(save.expansionType)) {
			setExpansionType(save, supportedExpansionTypes[0]);
		}
	});

	function finishLevelEdit(): void {
		const parsedValue = Number(levelEdit.input);
		if (!Number.isFinite(parsedValue)) {
			setFieldError(levelEdit, "Enter a number.");
			cancelFieldEdit(levelEdit, String(save.attributes.level.value));
			return;
		}

		setCharacterLevel(save, parsedValue, experienceTable);
		finishFieldEdit(levelEdit);
		syncFieldFromValue(levelEdit, String(save.attributes.level.value));
		syncFieldFromValue(experienceEdit, String(save.attributes.experience.value));
	}

	function handleLevelKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			finishLevelEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(levelEdit, String(save.attributes.level.value));
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	function finishExperienceEdit(): void {
		const parsedValue = Number(experienceEdit.input);
		if (!Number.isFinite(parsedValue)) {
			setFieldError(experienceEdit, "Enter a number.");
			cancelFieldEdit(experienceEdit, String(save.attributes.experience.value));
			return;
		}

		setCharacterExperience(save, parsedValue, experienceTable, MAX_XP);
		finishFieldEdit(experienceEdit);
		syncFieldFromValue(experienceEdit, String(save.attributes.experience.value));
		syncFieldFromValue(levelEdit, String(save.attributes.level.value));
	}

	function handleExperienceKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			finishExperienceEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(experienceEdit, String(save.attributes.experience.value));
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	function canAdjustPointsField(attributeId: PointsAttributeId, delta: number): boolean {
		if (isGameRulesMode) {
			return false;
		}

		const attribute = save.attributes[attributeId];
		const nextValue = attribute.value + delta;
		const maxValue = getMaxValueForBitLength(attribute.bitLength);

		return clampInteger(nextValue, 0, maxValue) !== attribute.value;
	}

	function adjustPointsField(attributeId: PointsAttributeId, delta: number): void {
		if (isGameRulesMode) {
			return;
		}

		setClampedAttributeValue(save, attributeId, save.attributes[attributeId].value + delta);
	}

	function reportInputValidity(input: HTMLInputElement | null, message: string): void {
		if (input == null) {
			return;
		}

		input.setCustomValidity(message);
		input.reportValidity();
		input.setCustomValidity("");
	}

	function finishNameEdit(): void {
		save.character.name = nameEdit.input;
		finishFieldEdit(nameEdit);
		syncFieldFromValue(nameEdit, save.character.name);
	}

	function handleNameKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			finishNameEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(nameEdit, save.character.name);
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	function finishMapSeedEdit(): void {
		const parsedValue = parseMapSeedInput(mapSeedEdit.input, MAP_SEED_MAX);
		if (parsedValue == null) {
			const error = "Use decimal digits or 0x-prefixed hex.";
			setFieldError(mapSeedEdit, error);
			reportInputValidity(mapSeedInput, error);
			cancelFieldEdit(mapSeedEdit, mapSeedDisplayValue);
			return;
		}

		setMapSeed(save, parsedValue);
		finishFieldEdit(mapSeedEdit);
		syncFieldFromValue(mapSeedEdit, formatMapSeedValue(parsedValue, mapSeedDisplayMode));
	}

	function handleMapSeedKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			finishMapSeedEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(mapSeedEdit, mapSeedDisplayValue);
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	$effect(() => {
		syncFieldFromValue(nameEdit, save.character.name);
	});

	$effect(() => {
		syncFieldFromValue(levelEdit, String(save.attributes.level.value));
	});

	$effect(() => {
		syncFieldFromValue(experienceEdit, String(save.attributes.experience.value));
	});

	$effect(() => {
		syncFieldFromValue(mapSeedEdit, mapSeedDisplayValue);
	});

	$effect(() => {
		syncInventoryGoldToLevel(save, MAX_GOLD_PER_LEVEL);
	});

	$effect(() => {
		if (!isGameRulesMode) {
			showPointsGameRulesHelp = false;
		}
	});
</script>

<div class="grid grid-cols-1 content-start gap-2.5 xl:grid-cols-2">
	<div class="grid content-start gap-2.5">
		<section class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Identity</h3>

			<div class="grid gap-1">
				<div class="grid grid-cols-form-32 items-center gap-x-2.5">
					<label class="form-label mb-0" for="name">Name</label>
					<input
						class="form-control"
						type="text"
						id="name"
						name="name"
						autocomplete="off"
						size="15"
						value={nameEdit.input}
						onfocus={() => startFieldEdit(nameEdit, save.character.name)}
						oninput={(event) => setFieldInput(nameEdit, event.currentTarget.value)}
						onblur={finishNameEdit}
						onkeydown={handleNameKeydown}
					/>
				</div>

				<ClassSelector {editingVersion} {classSupportWarning} />

				<div class="grid grid-cols-form-32 items-center gap-x-2.5">
					<label class="form-label mb-0" for="expansionType">Expansion</label>
					<select
						class="form-select"
						id="expansionType"
						name="expansionType"
						value={save.expansionType}
						onchange={(event) => setExpansionType(save, event.currentTarget.value)}
					>
						{#each supportedExpansionTypes as expansionType}
							<option value={expansionType}
								>{EXPANSION_TYPE_LABELS[expansionType]}</option
							>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-form-32 items-start gap-x-2.5">
					<span class="form-label mb-0">Game Flags</span>
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
						<label class="inline-flex items-center gap-1.5">
							<input
								class="form-check-input mt-0"
								type="checkbox"
								id="hardcore"
								name="hardcore"
								bind:checked={save.character.status.hardcore}
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

		{#if progressionValidationWarning.length > 0}
			<div
				class="rounded-sm border border-halbu-warning bg-halbu-warningSoft px-2 py-1.5 text-sm text-halbu-warning"
			>
				{progressionValidationWarning}
			</div>
		{/if}

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Progression</h3>

			<div
				class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:divide-x sm:divide-halbu-borderStrong"
			>
				<div class="grid gap-1 sm:pr-3">
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
							value={levelEdit.input}
							onfocus={() =>
								startFieldEdit(levelEdit, String(save.attributes.level.value))}
							oninput={(event) => setFieldInput(levelEdit, event.currentTarget.value)}
							onblur={finishLevelEdit}
							onkeydown={handleLevelKeydown}
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
							<option value="Act1">{ACT_LABELS.Act1}</option>
							<option value="Act2">{ACT_LABELS.Act2}</option>
							<option value="Act3">{ACT_LABELS.Act3}</option>
							<option value="Act4">{ACT_LABELS.Act4}</option>
							<option value="Act5">{ACT_LABELS.Act5}</option>
						</select>
					</div>

					<div class="grid grid-cols-form-24 items-center gap-x-2">
						<label class="form-label mb-0" for="difficultyBeaten"
							>Difficulty beaten</label
						>
						<select
							class="form-select"
							value={difficultyBeaten}
							name="difficultyBeaten"
							id="difficultyBeaten"
							onchange={(event) =>
								setDifficultyBeaten(
									save,
									event.currentTarget.value as DifficultyBeaten,
								)}
						>
							{#each difficultyBeatenOptions as option}
								<option value={option}>
									{option === "None" ? "None" : DIFFICULTY_LABELS[option]}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid gap-1 sm:pl-3">
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
							value={experienceEdit.input}
							onfocus={() =>
								startFieldEdit(
									experienceEdit,
									String(save.attributes.experience.value),
								)}
							oninput={(event) =>
								setFieldInput(experienceEdit, event.currentTarget.value)}
							onblur={finishExperienceEdit}
							onkeydown={handleExperienceKeydown}
						/>
					</div>

					<div class="grid grid-cols-form-24 items-center gap-x-2">
						<label class="form-label mb-0" for="currentDifficulty">Difficulty</label>
						<select
							class="form-select"
							bind:value={save.character.difficulty}
							name="currentDifficulty"
							id="currentDifficulty"
						>
							<option value="Normal">{DIFFICULTY_LABELS.Normal}</option>
							<option value="Nightmare">{DIFFICULTY_LABELS.Nightmare}</option>
							<option value="Hell">{DIFFICULTY_LABELS.Hell}</option>
						</select>
					</div>

					<div class="grid grid-cols-form-24 items-center gap-x-2">
						<label class="form-label mb-0" for="title">Title</label>
						<input
							class="form-control form-control-readonly"
							type="text"
							name="title"
							id="title"
							value={title}
							readonly
						/>
					</div>
				</div>
			</div>
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Gold</h3>

			<div
				class="grid grid-cols-form-28 items-center gap-y-1 sm:grid-cols-form-32 sm:gap-x-2.5"
			>
				<label class="form-label mb-0" for="goldInventory">Inventory</label>
				<input
					class="form-control"
					use:enforceMinMax
					type="number"
					name="goldInventory"
					id="goldInventory"
					min="0"
					max={MAX_GOLD_PER_LEVEL * clampInteger(save.character.level, 1, 99)}
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

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Map Seed</h3>

			<div class="grid grid-cols-form-28 items-center gap-x-2 gap-y-1">
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
						onclick={() => {
							mapSeedDisplayMode = "decimal";
						}}
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
						onclick={() => {
							mapSeedDisplayMode = "hex";
						}}
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
					bind:this={mapSeedInput}
					value={mapSeedEdit.input}
					onfocus={() => startFieldEdit(mapSeedEdit, mapSeedDisplayValue)}
					oninput={(event) => {
						setFieldInput(mapSeedEdit, event.currentTarget.value);
						if (mapSeedInput != null) {
							mapSeedInput.setCustomValidity("");
						}
					}}
					onblur={finishMapSeedEdit}
					onkeydown={handleMapSeedKeydown}
				/>

				<div></div>
			</div>
		</section>
	</div>

	<div class="grid content-start gap-2.5">
		<AttributesSection />

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<div class="mb-1.5 flex items-center justify-between gap-2">
				<h3 class="editor-card-title mb-0">Points</h3>
				{#if isGameRulesMode}
					<button
						type="button"
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-halbu-borderStrong bg-halbu-panel2 text-2xs font-semibold leading-none text-halbu-textMuted transition hover:bg-halbu-primarySoft hover:text-halbu-text"
						aria-label={showPointsGameRulesHelp
							? "Hide game rules explanation"
							: "Show game rules explanation"}
						aria-expanded={showPointsGameRulesHelp}
						onclick={() => {
							showPointsGameRulesHelp = !showPointsGameRulesHelp;
						}}
					>
						?
					</button>
				{/if}
			</div>
			{#if isGameRulesMode && showPointsGameRulesHelp}
				<div class="form-text mb-1 mt-0.5">
					Game rules mode: points are recalculated from level, attributes, skills, and
					completed quests.
				</div>
			{/if}

			{#if isGameRulesMode && effectiveDerivedValuesError.length > 0}
				<div class="form-text mb-1 text-halbu-warning">{effectiveDerivedValuesError}</div>
			{/if}

			<div class="grid gap-y-1">
				{#each pointFields as field}
					<div class="grid grid-cols-form-28 items-center gap-x-2.5">
						<label class="form-label mb-0" for={field.inputId}
							>{getAttributeLabel(field.id)}</label
						>

						<div class="flex items-center gap-1">
							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustPointsField(field.id, -QUICK_ADJUST_STEP)}
								disabled={!canAdjustPointsField(field.id, -QUICK_ADJUST_STEP)}
								aria-label={`Decrease ${getAttributeLabel(field.id).toLowerCase()} by ${QUICK_ADJUST_STEP}`}
							>
								-{QUICK_ADJUST_STEP}
							</button>

							{#if isGameRulesMode}
								<input
									class="form-control form-control-readonly max-w-20 text-center"
									type="number"
									name={field.inputId}
									id={field.inputId}
									value={isGameRulesMode && effectiveDerivedValues != null
										? effectiveDerivedValues[field.id]
										: save.attributes[field.id].value}
									readonly
								/>
							{:else}
								<input
									class="form-control max-w-20 text-center"
									use:enforceMinMax
									type="number"
									name={field.inputId}
									id={field.inputId}
									min="0"
									max={getMaxValueForBitLength(
										save.attributes[field.id].bitLength,
									)}
									step="1"
									bind:value={save.attributes[field.id].value}
									onchange={(event) =>
										setClampedAttributeValue(
											save,
											field.id,
											Number(event.currentTarget.value),
										)}
								/>
							{/if}

							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustPointsField(field.id, QUICK_ADJUST_STEP)}
								disabled={!canAdjustPointsField(field.id, QUICK_ADJUST_STEP)}
								aria-label={`Increase ${getAttributeLabel(field.id).toLowerCase()} by ${QUICK_ADJUST_STEP}`}
							>
								+{QUICK_ADJUST_STEP}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<ResourcesSection />
	</div>
</div>
