<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { save as pickSavePath } from "@tauri-apps/plugin-dialog";
	import Button from "$lib/components/ui/button/button.svelte";
	import { Message, buildMessage } from "$lib/utils/appMessage";
	import * as settings from "$lib/utils/settings";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { toEditorSave } from "$lib/types/converters";
	import experienceTable from "$lib/editor/character/experience.json";
	import { experienceForLevel } from "$lib/editor/character/characterLogic";
	import {
		applyProjectedGameRulesValues,
		getGameRulesClassPrimaryAttributes,
		projectGameRulesDerivedValues,
	} from "$lib/editor/character/gameRules";
	import {
		NEW_CHARACTER_TEMPLATE_OPTIONS,
		applyAllWaypointsTemplate,
		applyCampaignCompletedTemplate,
		type NewCharacterTemplateId,
	} from "$lib/newCharacter/newCharacterTemplates";
	import {
		getSupportedExpansionTypes,
		getSupportedClassesForExpansionType,
	} from "$lib/utils/gameData";
	import { GAME_EDITIONS } from "$lib/types/editor";
	import type { EditorSave, ExpansionType, GameEdition, KnownClassName } from "$lib/types/editor";
	import type { BackendEditorSave, OutputFormatOption } from "$lib/types/backend";
	import type { OpenedSessionData } from "$lib/editor/editorSession";
	import type { AppMessage } from "$lib/utils/appMessage";

	const DEFAULT_CHARACTER_NAME = "NewCharacter";

	let {
		onmessage,
		outputFormatOptions = [],
	}: {
		onmessage: (message: AppMessage) => void;
		outputFormatOptions?: OutputFormatOption[];
	} = $props();

	let selectedTemplate = $state<NewCharacterTemplateId>("blank");
	let characterName = $state(DEFAULT_CHARACTER_NAME);
	let selectedEdition = $state<GameEdition>(GAME_EDITIONS[0]);
	let selectedExpansionMode = $state<ExpansionType>("Expansion");
	let selectedClass = $state<KnownClassName | null>(null);
	let hardcoreEnabled = $state(false);
	let ladderEnabled = $state(false);
	let selectedSavePath = $state("");
	let createPending = $state(false);
	let createError = $state("");
	let pathError = $state("");

	const configuredSaveFolder = $derived.by(() => {
		const configuredValue = settings.get(settings.Key.SaveFolder);
		return typeof configuredValue === "string" ? configuredValue : "";
	});
	const selectedVersion = $derived.by(() => {
		return (
			outputFormatOptions.find((option) => option.gameEdition === selectedEdition)?.version ??
			null
		);
	});
	const availableExpansionModes = $derived.by((): readonly ExpansionType[] => {
		if (selectedVersion == null) {
			return [];
		}
		return getSupportedExpansionTypes(selectedVersion);
	});
	const availableClasses = $derived.by((): readonly KnownClassName[] => {
		if (selectedVersion == null) {
			return [];
		}
		return getSupportedClassesForExpansionType(selectedVersion, selectedExpansionMode).map(
			(entry) => entry.name,
		);
	});

	const suggestedFileName = $derived.by(() => {
		const trimmedName = characterName.trim();
		const baseName = trimmedName.length > 0 ? trimmedName : DEFAULT_CHARACTER_NAME;
		if (baseName.toLowerCase().endsWith(".d2s")) {
			return baseName;
		}
		return `${baseName}.d2s`;
	});
	const suggestedPath = $derived.by(() => {
		const saveFolder = configuredSaveFolder.trim();
		if (saveFolder.length < 1) {
			return "";
		}
		const pathSeparator = saveFolder.includes("\\") ? "\\" : "/";
		const hasTrailingSeparator = saveFolder.endsWith("\\") || saveFolder.endsWith("/");
		return hasTrailingSeparator
			? `${saveFolder}${suggestedFileName}`
			: `${saveFolder}${pathSeparator}${suggestedFileName}`;
	});
	const effectiveSavePath = $derived.by(() =>
		selectedSavePath.trim().length > 0 ? selectedSavePath.trim() : suggestedPath,
	);
	const hasSelectedSavePath = $derived(selectedSavePath.trim().length > 0);
	const createBlockedReason = $derived.by(() => {
		if (selectedVersion == null) {
			return "No supported output format is available for this edition.";
		}
		if (selectedClass == null) {
			return "Select a valid class for the current edition/mode.";
		}
		if (classDisabled(selectedClass)) {
			return classDisabledReason(selectedClass);
		}
		return "";
	});
	const canCreate = $derived(!createPending && createBlockedReason.length === 0);

	function classDisabled(className: KnownClassName): boolean {
		if (selectedVersion == null) {
			return true;
		}
		if (getGameRulesClassPrimaryAttributes(className) == null) {
			return true;
		}
		if (className === "Warlock") {
			return !(selectedEdition === "RotW" && selectedExpansionMode === "RotW");
		}
		if (
			(className === "Druid" || className === "Assassin") &&
			selectedExpansionMode === "Classic"
		) {
			return true;
		}
		return false;
	}

	function classDisabledReason(className: KnownClassName): string {
		if (selectedVersion == null) {
			return "Selected edition is unavailable.";
		}
		if (getGameRulesClassPrimaryAttributes(className) == null) {
			return "Missing class defaults in charstats.txt.";
		}
		if (className === "Warlock" && selectedEdition !== "RotW") {
			return "Warlock requires RotW edition.";
		}
		if (className === "Warlock" && selectedExpansionMode !== "RotW") {
			return "Warlock requires RotW expansion mode.";
		}
		if (
			(className === "Druid" || className === "Assassin") &&
			selectedExpansionMode === "Classic"
		) {
			return "Druid and Assassin require Expansion or RotW mode.";
		}
		return "Class is unavailable.";
	}

	function ensureD2sExtension(path: string): string {
		if (path.toLowerCase().endsWith(".d2s")) {
			return path;
		}
		return `${path}.d2s`;
	}

	function applyStartingAttributesFromGameRules(
		saveData: EditorSave,
		className: KnownClassName,
	): void {
		const classPrimaryAttributes = getGameRulesClassPrimaryAttributes(className);
		if (classPrimaryAttributes == null) {
			throw new Error(`Missing class defaults for ${className} in charstats.txt.`);
		}

		saveData.attributes.strength.value = classPrimaryAttributes.strength;
		saveData.attributes.dexterity.value = classPrimaryAttributes.dexterity;
		saveData.attributes.energy.value = classPrimaryAttributes.energy;
		saveData.attributes.vitality.value = classPrimaryAttributes.vitality;
	}

	function setCharacterLevel(saveData: EditorSave, targetLevel: number): void {
		const clampedLevel = Math.max(1, Math.min(99, targetLevel));
		saveData.character.level = clampedLevel;
		saveData.attributes.level.value = clampedLevel;
		saveData.attributes.experience.value = experienceForLevel(clampedLevel, experienceTable);
	}

	function applyDerivedValuesFromGameRules(saveData: EditorSave): void {
		const projection = projectGameRulesDerivedValues(saveData);
		applyProjectedGameRulesValues(saveData, projection.values);
	}

	async function chooseSavePath(): Promise<void> {
		pathError = "";
		try {
			const chosenPath = await pickSavePath({
				defaultPath: effectiveSavePath.length > 0 ? effectiveSavePath : suggestedFileName,
				filters: [
					{
						name: "D2R Save File",
						extensions: ["d2s"],
					},
				],
			});
			if (chosenPath == null || Array.isArray(chosenPath)) {
				return;
			}
			selectedSavePath = ensureD2sExtension(chosenPath);
		} catch (error) {
			pathError = getErrorMessage(error, "Failed to choose save path.");
		}
	}

	async function createCharacter(): Promise<void> {
		if (!canCreate || selectedVersion == null || selectedClass == null) {
			return;
		}

		createPending = true;
		createError = "";
		try {
			const backendSave = await invoke<BackendEditorSave>("new_save", {
				version: selectedVersion,
				class: selectedClass,
			});
			const saveData = toEditorSave(backendSave);

			saveData.character.name = characterName;
			saveData.expansionType = selectedExpansionMode;
			saveData.character.status.hardcore = hardcoreEnabled;
			saveData.character.status.ladder = ladderEnabled;
			saveData.character.status.died = false;
			saveData.character.status.expansion = selectedExpansionMode !== "Classic";

			applyStartingAttributesFromGameRules(saveData, selectedClass);
			if (selectedTemplate === "level99AllProgress") {
				setCharacterLevel(saveData, 99);
				applyCampaignCompletedTemplate(saveData, selectedExpansionMode);
				applyAllWaypointsTemplate(saveData);
			} else {
				setCharacterLevel(saveData, 1);
			}
			applyDerivedValuesFromGameRules(saveData);

			const resolvedPath =
				effectiveSavePath.trim().length > 0 ? effectiveSavePath.trim() : null;

			const openPayload: OpenedSessionData = {
				save: saveData,
				sourceBackendSave: structuredClone(backendSave),
				parseIssueCount: 0,
				parseIssues: [],
				sourceFileSize: null,
				sourcePath: resolvedPath,
				headerChecksum: null,
				computedChecksum: null,
				editionHint: null,
				suggestedTargetVersion: null,
				parserLayoutVersion: null,
			};
			onmessage(buildMessage(Message.CharacterPicked, openPayload));
		} catch (error) {
			createError = getErrorMessage(error, "Failed to create character.");
		} finally {
			createPending = false;
		}
	}

	$effect(() => {
		const supportedModes = availableExpansionModes;
		if (supportedModes.length > 0 && !supportedModes.includes(selectedExpansionMode)) {
			selectedExpansionMode = supportedModes[0];
		}
	});

	$effect(() => {
		const validClass = availableClasses.find((className) => !classDisabled(className)) ?? null;
		if (selectedClass == null || classDisabled(selectedClass)) {
			selectedClass = validClass;
		}
	});
</script>

<div class="container m-0">
	<div class="grid content-start gap-2.5">
		<p class="form-text m-0">
			Choose a base character, optional template, and create directly into the standard editor
			flow.
		</p>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Character Basics</h3>

			<div class="grid grid-cols-form-32 items-center gap-x-2.5 gap-y-1">
				<label class="form-label mb-0" for="new-character-name">Name</label>
				<div class="grid gap-0.5">
					<input
						id="new-character-name"
						class="form-control"
						type="text"
						bind:value={characterName}
						placeholder={DEFAULT_CHARACTER_NAME}
					/>
				</div>

				<span class="form-label mb-0">Game Edition</span>
				<div class="flex flex-wrap gap-1.5">
					{#each GAME_EDITIONS as edition}
						<button
							type="button"
							class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
								selectedEdition === edition
									? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
									: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
							}`}
							onclick={() => {
								selectedEdition = edition;
							}}
						>
							{edition}
						</button>
					{/each}
				</div>

				<span class="form-label mb-0">Expansion Mode</span>
				<div class="flex flex-wrap gap-1.5">
					{#each availableExpansionModes as mode}
						<button
							type="button"
							class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
								selectedExpansionMode === mode
									? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
									: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
							}`}
							onclick={() => {
								selectedExpansionMode = mode;
							}}
						>
							{mode}
						</button>
					{/each}
				</div>

				<span class="form-label mb-0">Class</span>
				<div class="flex flex-wrap gap-1.5">
					{#each availableClasses as className}
						{@const classIsDisabled = classDisabled(className)}
						<button
							type="button"
							class={`rounded-xs border px-2 py-1.5 text-left text-sm font-medium leading-tight transition ${
								selectedClass === className
									? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
									: "border-halbu-border bg-halbu-panel text-halbu-text hover:bg-halbu-panel2"
							}`}
							disabled={classIsDisabled}
							onclick={() => {
								selectedClass = className;
							}}
						>
							<span class="block">{className}</span>
						</button>
					{/each}
				</div>

				<span class="form-label mb-0">Flags</span>
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
					<label class="inline-flex items-center gap-1.5">
						<input
							class="form-check-input mt-0"
							type="checkbox"
							bind:checked={hardcoreEnabled}
						/>
						<span>Hardcore</span>
					</label>
					<label class="inline-flex items-center gap-1.5">
						<input
							class="form-check-input mt-0"
							type="checkbox"
							bind:checked={ladderEnabled}
						/>
						<span>Ladder</span>
					</label>
				</div>
			</div>
		</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Template</h3>
			<div class="grid gap-1.5">
				{#each NEW_CHARACTER_TEMPLATE_OPTIONS as template}
					<label
						class={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs border px-2 py-1.5 text-sm ${
							selectedTemplate === template.id
								? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
								: "border-halbu-border bg-halbu-panel text-halbu-text"
						}`}
					>
						<input
							class="form-check-input mt-0"
							type="radio"
							name="new-character-template"
							value={template.id}
							checked={selectedTemplate === template.id}
							onchange={() => {
								selectedTemplate = template.id;
							}}
						/>
						<span class="min-w-0">
							<span class="block font-medium leading-tight">{template.label}</span>
							<span class="form-text m-0 leading-tight">{template.description}</span>
						</span>
					</label>
				{/each}
			</div>
		</section>

		<section class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Save Location / Create</h3>
			<div class="grid grid-cols-form-32 items-center gap-x-2.5 gap-y-1">
				<span class="form-label mb-0">Suggested path</span>
				<div
					class="rounded-xs border border-halbu-border bg-halbu-panel px-2 py-1.5 font-mono text-sm text-halbu-text"
				>
					{#if effectiveSavePath.length > 0}
						{effectiveSavePath}
					{:else}
						No configured save folder. Choose a path now or save later from the editor.
					{/if}
				</div>
			</div>
			<div class="form-text mt-1">
				Starting strength, dexterity, vitality, and energy come from charstats.txt for the
				selected class.
			</div>
			<div class="mt-1 flex flex-wrap items-center gap-1.5">
				<Button variant="secondary" onclick={chooseSavePath}>Choose Path...</Button>
				{#if hasSelectedSavePath}
					<Button
						variant="secondary"
						onclick={() => {
							selectedSavePath = "";
						}}
					>
						>Use Suggested Path
					</Button>
				{/if}
				<Button onclick={createCharacter} disabled={!canCreate}>
					{createPending ? "Creating..." : "Create Character"}
				</Button>
			</div>
			{#if createBlockedReason.length > 0}
				<div class="form-text mt-1 text-halbu-warning">{createBlockedReason}</div>
			{/if}
			{#if pathError.length > 0}
				<div class="form-text mt-1 text-halbu-warning">{pathError}</div>
			{/if}
			{#if createError.length > 0}
				<div class="form-text mt-1 text-halbu-warning">{createError}</div>
			{/if}
		</section>
	</div>
</div>
