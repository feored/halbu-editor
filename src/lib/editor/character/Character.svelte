<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";

	import { enforceMinMax } from "$lib/utils/actions";
	import { RESOURCE_Q8_SCALE } from "$lib/utils/resources";
	import { clampInteger, getMaxValueForBitLength } from "$lib/utils/numbers";
	import {
		getSupportedClass,
		getSaveExpansionType,
		getSupportedClassNames,
		isClassSupportedForVersion,
	} from "$lib/utils/GameSupport";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import {
		ACT_LABELS,
		DIFFICULTY_LABELS,
		EXPANSION_TYPE_LABELS,
		getAttributeLabel,
	} from "$lib/editor/editorMetadata";

	import experienceTable from "$lib/editor/character/experience.json";
	import {
		buildCharacterEditValidation,
		formatMapSeedValue,
		parseMapSeedInput,
		resolveResourceDisplayValue,
		validateCharacterName,
	} from "$lib/editor/character/characterLogic";
	import {
		getCharacterDerivedState,
		setCharacterClass,
		setCharacterExperience,
		setCharacterLevel,
		setClampedAttributeValue,
		setDifficultyBeaten,
		setExpansionType,
		setMapSeed,
		setPrimaryAttributeValueInGameRulesMode,
		syncInventoryGoldToLevel,
		type DifficultyBeaten,
	} from "$lib/editor/character/characterActions";
	import { getGameRulesClassPrimaryAttributes } from "$lib/editor/character/gameRules";
	import {
		cancelFieldEdit,
		finishFieldEdit,
		initFieldEdit,
		setFieldError,
		setFieldInput,
		startFieldEdit,
		syncFieldFromValue,
		type FieldEditState,
	} from "$lib/utils/fieldEdit";

	import { toEditorSave } from "$lib/types/converters";
	import type { BackendEditorSave } from "$lib/types/backend";
	import type { EditorSave } from "$lib/types/editor";
	import { DEFAULT_SKILL_SLOT_COUNT, resizeSkillSlots } from "$lib/editor/skills/skillsSlots";
	import { editorState } from "$lib/editor/editorState.svelte";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mode = $derived(session.mode);
	const effectiveDerivedValues = $derived(editorState.gameRulesValues.values);
	const effectiveDerivedValuesError = $derived(editorState.gameRulesValues.error);
	const layoutVersion = $derived(editorState.layoutVersion);

	const MAX_GOLD_PER_LEVEL = 10000;
	const MAX_XP = 3520485254;
	const MAP_SEED_MAX = 0xffffffff;
	const QUICK_ADJUST_STEP = 10;
	const RESOURCE_DISPLAY_MIN = 1;
	const RESOURCE_DISPLAY_MAX = 8181;

	type PrimaryAttributeId = "strength" | "dexterity" | "vitality" | "energy";
	type PointsAttributeId = "statpts" | "newskills";
	type ResourceAttributeId =
		| "hitpoints"
		| "maxhp"
		| "mana"
		| "maxmana"
		| "stamina"
		| "maxstamina";

	type ResourceFieldDescriptor = {
		label: string;
		currentId: string;
		currentAttr: ResourceAttributeId;
		baseId: string;
		baseAttr: ResourceAttributeId;
	};

	type DifficultyOption = DifficultyBeaten | "None";

	const primaryAttributes: ReadonlyArray<PrimaryAttributeId> = [
		"strength",
		"dexterity",
		"vitality",
		"energy",
	];

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

	const resourceFields: ReadonlyArray<ResourceFieldDescriptor> = [
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

	const derivedAttributeIds = new Set<keyof EditorSave["attributes"]>([
		"hitpoints",
		"maxhp",
		"mana",
		"maxmana",
		"stamina",
		"maxstamina",
		"statpts",
		"newskills",
	]);

	let nameInput: HTMLInputElement | null = null;
	let mapSeedInput: HTMLInputElement | null = null;

	let classChangeError = $state("");
	let validName = $state(true);
	let nameValidationMessage = $state("");
	let selectedClass = $state<string | null>(null);
	let mapSeedDisplayMode = $state<"decimal" | "hex">("decimal");

	let levelEdit = $state(initFieldEdit(""));
	let experienceEdit = $state(initFieldEdit(""));
	let nameEdit = $state(initFieldEdit(""));
	let mapSeedEdit = $state(initFieldEdit(""));
	let resourceEditByField = $state<Record<string, FieldEditState>>({});

	const isGameRulesMode = $derived(mode === "game-rules");
	const isRawMode = $derived(!isGameRulesMode);
	const effectiveVersion = $derived(layoutVersion == null ? save.version : layoutVersion);
	const supportedClasses = $derived(getSupportedClassNames(effectiveVersion));
	const mapSeedDisplayValue = $derived(
		formatMapSeedValue(save.character.mapSeed, mapSeedDisplayMode),
	);
	const characterDerivedState = $derived(getCharacterDerivedState(save));
	const difficultyBeaten = $derived(characterDerivedState.difficultyBeaten);
	const title = $derived(characterDerivedState.title);

	const classSupportWarning = $derived.by(() => {
		if (!isClassSupportedForVersion(effectiveVersion, save.character.className)) {
			return `Current class (${save.character.className}) is not recognized for layout version ${effectiveVersion}. Apply a supported class template to continue.`;
		}

		return "";
	});

	const progressionValidationWarning = $derived.by(() => {
		const expansionType = getSaveExpansionType(save);
		const difficultyIndex = ["None", "Normal", "Nightmare", "Hell"].indexOf(difficultyBeaten);

		if (difficultyIndex < 0) {
			return "";
		}

		const expectedProgression = (4 + (expansionType !== "Classic" ? 1 : 0)) * difficultyIndex;

		if (save.character.progression === expectedProgression) {
			return "";
		}

		return `Progression value ${save.character.progression} is non-canonical for ${difficultyBeaten} ${expansionType}. Re-select Difficulty beaten to normalize it.`;
	});

	const gameRulesClassPrimaryAttributes = $derived.by(() =>
		getGameRulesClassPrimaryAttributes(save.character.className),
	);

	function getAttributeValue(attributeId: keyof EditorSave["attributes"]): number {
		if (
			isGameRulesMode &&
			effectiveDerivedValues != null &&
			derivedAttributeIds.has(attributeId) &&
			attributeId in effectiveDerivedValues
		) {
			return effectiveDerivedValues[attributeId];
		}

		return save.attributes[attributeId].value;
	}

	function getPrimaryAttributeMinimum(attributeId: PrimaryAttributeId): number {
		if (!isGameRulesMode || gameRulesClassPrimaryAttributes == null) {
			return 0;
		}

		return gameRulesClassPrimaryAttributes[attributeId] ?? 0;
	}

	function getAvailableStatPoints(): number {
		if (!isGameRulesMode) {
			return save.attributes.statpts.value;
		}

		if (effectiveDerivedValues == null || !("statpts" in effectiveDerivedValues)) {
			return 0;
		}

		return Math.max(0, effectiveDerivedValues.statpts);
	}

	function canDecreasePrimaryAttribute(attributeId: PrimaryAttributeId): boolean {
		return save.attributes[attributeId].value > getPrimaryAttributeMinimum(attributeId);
	}

	function canIncreasePrimaryAttribute(attributeId: PrimaryAttributeId): boolean {
		const attribute = save.attributes[attributeId];
		const maxValue = getMaxValueForBitLength(attribute.bitLength);

		if (attribute.value >= maxValue) {
			return false;
		}

		if (isGameRulesMode && getAvailableStatPoints() < 1) {
			return false;
		}

		return true;
	}

	function adjustPrimaryAttribute(attributeId: PrimaryAttributeId, delta: number): void {
		const nextValue = save.attributes[attributeId].value + delta;

		if (isGameRulesMode) {
			setPrimaryAttributeValueInGameRulesMode(
				save,
				attributeId,
				nextValue,
				getAvailableStatPoints(),
				getPrimaryAttributeMinimum(attributeId),
			);
			return;
		}

		setClampedAttributeValue(save, attributeId, nextValue);
	}

	function setPrimaryAttributeFromInput(
		attributeId: PrimaryAttributeId,
		inputValue: string,
	): void {
		const parsedValue = Number(inputValue);
		if (!Number.isFinite(parsedValue)) {
			return;
		}

		if (isGameRulesMode) {
			setPrimaryAttributeValueInGameRulesMode(
				save,
				attributeId,
				parsedValue,
				getAvailableStatPoints(),
				getPrimaryAttributeMinimum(attributeId),
			);
			return;
		}

		setClampedAttributeValue(save, attributeId, parsedValue);
	}

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

	function getResourceDisplayValue(attributeId: ResourceAttributeId): number {
		const attribute = save.attributes[attributeId];

		return resolveResourceDisplayValue(
			getAttributeValue(attributeId),
			attribute.bitLength,
			RESOURCE_Q8_SCALE,
		);
	}

	function getResourceCanonicalDisplayString(attributeId: ResourceAttributeId): string {
		return String(
			clampInteger(
				getResourceDisplayValue(attributeId),
				RESOURCE_DISPLAY_MIN,
				RESOURCE_DISPLAY_MAX,
			),
		);
	}

	function getOrCreateResourceEdit(fieldId: string, attributeId: ResourceAttributeId) {
		const existingEdit = resourceEditByField[fieldId];
		if (existingEdit != null) {
			return existingEdit;
		}

		const nextEdit = initFieldEdit(getResourceCanonicalDisplayString(attributeId));
		resourceEditByField = {
			...resourceEditByField,
			[fieldId]: nextEdit,
		};
		return nextEdit;
	}

	function dropResourceEdit(fieldId: string): void {
		if (!(fieldId in resourceEditByField)) {
			return;
		}

		const nextEdits = { ...resourceEditByField };
		delete nextEdits[fieldId];
		resourceEditByField = nextEdits;
	}

	function getResourceInputValue(fieldId: string, attributeId: ResourceAttributeId): string {
		const resourceEdit = resourceEditByField[fieldId];
		if (resourceEdit != null) {
			return resourceEdit.input;
		}

		return getResourceCanonicalDisplayString(attributeId);
	}

	function syncNameValidationState(): void {
		const result = validateCharacterName(save.character.name);
		validName = result.valid;
		nameValidationMessage = result.message;

		if (nameInput != null) {
			nameInput.setCustomValidity(result.message);
		}
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
		const result = validateCharacterName(nameEdit.input);
		if (!result.valid) {
			setFieldError(nameEdit, result.message);
			validName = false;
			nameValidationMessage = result.message;
			reportInputValidity(nameInput, result.message);
			cancelFieldEdit(nameEdit, save.character.name);
			return;
		}

		save.character.name = result.value;
		finishFieldEdit(nameEdit);
		syncFieldFromValue(nameEdit, save.character.name);
		syncNameValidationState();
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
			validName = true;
			nameValidationMessage = "";
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

	function finishResourceEdit(fieldId: string, attributeId: ResourceAttributeId): void {
		if (isGameRulesMode) {
			return;
		}

		const resourceEdit = resourceEditByField[fieldId];
		if (resourceEdit == null) {
			return;
		}

		const parsedValue = Number.parseFloat(resourceEdit.input.trim());
		if (!Number.isFinite(parsedValue)) {
			setFieldError(resourceEdit, "Enter a number.");
			cancelFieldEdit(resourceEdit, getResourceCanonicalDisplayString(attributeId));
			dropResourceEdit(fieldId);
			return;
		}

		const clampedDisplayValue = clampInteger(
			parsedValue,
			RESOURCE_DISPLAY_MIN,
			RESOURCE_DISPLAY_MAX,
		);

		const attribute = save.attributes[attributeId];
		const storedValue = clampInteger(
			Math.round(clampedDisplayValue * RESOURCE_Q8_SCALE),
			0,
			getMaxValueForBitLength(attribute.bitLength),
		);

		save.attributes[attributeId].value = storedValue;
		finishFieldEdit(resourceEdit);
		syncFieldFromValue(
			resourceEdit,
			String(
				resolveResourceDisplayValue(
					storedValue,
					save.attributes[attributeId].bitLength,
					RESOURCE_Q8_SCALE,
				),
			),
		);

		dropResourceEdit(fieldId);
	}

	function cancelResourceEdit(fieldId: string, attributeId: ResourceAttributeId): void {
		const resourceEdit = resourceEditByField[fieldId];
		if (resourceEdit != null) {
			cancelFieldEdit(resourceEdit, getResourceCanonicalDisplayString(attributeId));
		}
		dropResourceEdit(fieldId);
	}

	async function applyClassTemplate(nextClassName: string | null): Promise<void> {
		if (nextClassName == null) {
			return;
		}

		classChangeError = "";

		try {
			const response = await invoke<BackendEditorSave>("new_save", {
				version: effectiveVersion,
				class: nextClassName,
			});

			const templateSave = toEditorSave(response);
			setCharacterClass(save, nextClassName);

			const slotCount =
				save.skills.length > 0 ? save.skills.length : DEFAULT_SKILL_SLOT_COUNT;
			save.skills = resizeSkillSlots(templateSave.skills, slotCount);
		} catch (error) {
			classChangeError = getErrorMessage(error, "Failed to apply class template.");
			selectedClass = getSupportedClass(effectiveVersion, save.character.className);
		}
	}

	function handleExpansionTypeChange(nextExpansionType: string): void {
		setExpansionType(save, nextExpansionType);
	}

	function handleDifficultyBeatenChange(nextDifficultyBeaten: string): void {
		setDifficultyBeaten(save, nextDifficultyBeaten as DifficultyBeaten);
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
		syncNameValidationState();
	});

	$effect(() => {
		selectedClass = getSupportedClass(effectiveVersion, save.character.className);
	});

	$effect(() => {
		if (!isGameRulesMode) {
			return;
		}

		if (Object.keys(resourceEditByField).length > 0) {
			resourceEditByField = {};
		}
	});

	$effect(() => {
		for (const resource of resourceFields) {
			const currentEdit = resourceEditByField[resource.currentId];
			if (currentEdit != null) {
				syncFieldFromValue(
					currentEdit,
					getResourceCanonicalDisplayString(resource.currentAttr),
				);
			}

			const baseEdit = resourceEditByField[resource.baseId];
			if (baseEdit != null) {
				syncFieldFromValue(baseEdit, getResourceCanonicalDisplayString(resource.baseAttr));
			}
		}
	});

	$effect(() => {
		session.editValidation = buildCharacterEditValidation(
			validName,
			nameValidationMessage,
			classSupportWarning,
			progressionValidationWarning,
		);
	});
</script>

<div class="grid grid-cols-1 content-start gap-2.5 xl:grid-cols-2">
	<div class="grid content-start gap-2.5">
		<section class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Identity</h3>

			<div class="grid grid-cols-form-32 items-center gap-x-2.5 gap-y-1">
				<label class="form-label mb-0" for="name">Name</label>
				<input
					class="form-control"
					bind:this={nameInput}
					type="text"
					id="name"
					name="name"
					autocomplete="off"
					required
					minlength="2"
					maxlength="15"
					size="15"
					value={nameEdit.input}
					title="2-15 characters"
					onfocus={() => startFieldEdit(nameEdit, save.character.name)}
					oninput={(event) => {
						setFieldInput(nameEdit, event.currentTarget.value);
						validName = true;
						nameValidationMessage = "";
						if (nameInput != null) {
							nameInput.setCustomValidity("");
						}
					}}
					onblur={finishNameEdit}
					onkeydown={handleNameKeydown}
				/>

				<div></div>
				<div class="form-text m-0">
					Name rules: 2-15 characters, starts with a letter, letters plus `_` or `-` only,
					and at most one `_` and one `-`.
				</div>
			</div>

			<div class="mt-1 grid grid-cols-form-32 items-center gap-x-2.5">
				<label class="form-label mb-0" for="class">Class</label>

				{#if selectedClass != null}
					<select
						class="form-select"
						bind:value={selectedClass}
						name="class"
						id="class"
						onchange={() => applyClassTemplate(selectedClass)}
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
						value={save.character.className}
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

			<div class="mt-1 grid grid-cols-form-32 items-start gap-x-2.5 gap-y-0.5">
				<label class="form-label mb-0" for="expansionType">Expansion</label>
				<select
					class="form-select h-7 w-full py-0"
					id="expansionType"
					name="expansionType"
					value={getSaveExpansionType(save)}
					onchange={(event) => handleExpansionTypeChange(event.currentTarget.value)}
				>
					<option value="Classic">{EXPANSION_TYPE_LABELS.Classic}</option>
					<option value="Expansion">{EXPANSION_TYPE_LABELS.Expansion}</option>
					<option value="RotW">{EXPANSION_TYPE_LABELS.RotW}</option>
				</select>
			</div>

			<div class="grid grid-cols-form-32 items-start gap-x-2.5 gap-y-0.5">
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
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
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
						value={levelEdit.input}
						onfocus={() =>
							startFieldEdit(levelEdit, String(save.attributes.level.value))}
						oninput={(event) => setFieldInput(levelEdit, event.currentTarget.value)}
						onblur={finishLevelEdit}
						onkeydown={handleLevelKeydown}
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
					<label class="form-label mb-0" for="difficultyBeaten">Difficulty beaten</label>
					<select
						class="form-select"
						value={difficultyBeaten}
						name="difficultyBeaten"
						id="difficultyBeaten"
						onchange={(event) =>
							handleDifficultyBeatenChange(event.currentTarget.value)}
					>
						{#each difficultyBeatenOptions as option}
							<option value={option}>
								{option === "None" ? "None" : DIFFICULTY_LABELS[option]}
							</option>
						{/each}
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
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Gold</h3>

			<div class="grid grid-cols-form-28 gap-y-1 sm:grid-cols-form-32 sm:gap-x-2.5">
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
		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Attributes</h3>

			{#if isGameRulesMode}
				<div class="form-text mb-1">
					Game rules mode: increasing attributes spends recalculated stat points;
					decreasing attributes refunds points. Class base attributes are the minimum.
				</div>
			{/if}

			<div class="grid gap-y-1">
				{#each primaryAttributes as field}
					<div class="grid grid-cols-form-28 items-center gap-x-2.5">
						<label class="form-label mb-0" for={field}>{getAttributeLabel(field)}</label
						>

						<div class="flex items-center gap-1">
							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustPrimaryAttribute(field, -QUICK_ADJUST_STEP)}
								disabled={!canDecreasePrimaryAttribute(field)}
								aria-label={`Decrease ${getAttributeLabel(field).toLowerCase()} by ${QUICK_ADJUST_STEP}`}
							>
								-{QUICK_ADJUST_STEP}
							</button>

							<input
								class="form-control max-w-20 text-center"
								type="number"
								name={field}
								id={field}
								min={getPrimaryAttributeMinimum(field)}
								max={getMaxValueForBitLength(save.attributes[field].bitLength)}
								step="1"
								use:enforceMinMax
								value={save.attributes[field].value}
								onchange={(event) =>
									setPrimaryAttributeFromInput(field, event.currentTarget.value)}
							/>

							<button
								type="button"
								class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => adjustPrimaryAttribute(field, QUICK_ADJUST_STEP)}
								disabled={!canIncreasePrimaryAttribute(field)}
								aria-label={`Increase ${getAttributeLabel(field).toLowerCase()} by ${QUICK_ADJUST_STEP}`}
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

			{#if isGameRulesMode}
				<div class="form-text mb-1">
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
									value={getAttributeValue(field.id)}
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

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Resources</h3>

			{#if isGameRulesMode}
				<div class="form-text mb-1">
					Game rules mode: resources are recalculated. Edit level or attributes to change
					them.
				</div>
			{/if}

			<div class="grid grid-cols-form-28-2 items-center gap-x-2.5 gap-y-1">
				<div></div>
				<div class="text-sm text-halbu-textMuted">Current</div>
				<div class="text-sm text-halbu-textMuted">Base</div>

				{#each resourceFields as resource}
					<div class="text-sm text-halbu-text">{resource.label}</div>

					{#each [{ id: resource.currentId, attributeId: resource.currentAttr }, { id: resource.baseId, attributeId: resource.baseAttr }] as field}
						<input
							class={`form-control${isGameRulesMode ? " form-control-readonly" : ""}`}
							type="number"
							name={field.id}
							id={field.id}
							min={RESOURCE_DISPLAY_MIN}
							max={RESOURCE_DISPLAY_MAX}
							step="1"
							value={getResourceInputValue(field.id, field.attributeId)}
							disabled={!isRawMode}
							onfocus={() => {
								const resourceEdit = getOrCreateResourceEdit(
									field.id,
									field.attributeId,
								);
								startFieldEdit(
									resourceEdit,
									getResourceCanonicalDisplayString(field.attributeId),
								);
							}}
							oninput={(event) => {
								const resourceEdit = getOrCreateResourceEdit(
									field.id,
									field.attributeId,
								);
								setFieldInput(resourceEdit, event.currentTarget.value);
							}}
							onblur={() => finishResourceEdit(field.id, field.attributeId)}
							onkeydown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									finishResourceEdit(field.id, field.attributeId);
									event.currentTarget.blur();
									return;
								}

								if (event.key === "Escape") {
									event.preventDefault();
									cancelResourceEdit(field.id, field.attributeId);
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
