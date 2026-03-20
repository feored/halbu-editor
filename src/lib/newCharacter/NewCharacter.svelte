<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { save as pickSavePath } from "@tauri-apps/plugin-dialog";
	import Button from "$lib/components/ui/button/button.svelte";
	import { Message, buildMessage } from "$lib/utils/appMessage";
	import * as settings from "$lib/utils/settings";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { toEditorSave } from "$lib/types/saveConverter";
	import experienceTable from "$lib/editor/character/experience.json";
	import {
		applyGameRules,
		getClassBaseAttributes,
	} from "$lib/editor/character/gameRules";
	import { setLevel } from "$lib/editor/character/character";
	import {
		NEW_CHARACTER_TEMPLATE_OPTIONS,
		applyAllWaypointsTemplate,
		applyCampaignCompletedTemplate,
		type NewCharacterTemplateId,
	} from "$lib/newCharacter/templates";
	import {
		getSupportedExpansionTypes,
		getSupportedClassesForExpansionType,
	} from "$lib/utils/gameData";
	import {
		GAME_EDITIONS,
		DISPLAY_EXPANSION_TYPE,
		DISPLAY_GAME_EDITION,
	} from "$lib/types/editor";
	import type { EditorSave, ExpansionType, GameEdition, KnownClassName } from "$lib/types/editor";
	import type { BackendEditorSave, OutputFormatOption } from "$lib/types/backend";
	import type { OpenedSessionData } from "$lib/editor/session";
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

	const saveFolder = $derived(settings.get(settings.Key.SaveFolder));
	const version = $derived.by(() => {
		return (
			outputFormatOptions.find((option) => option.gameEdition === selectedEdition)?.version ??
			null
		);
	});
	const availableExpansionModes = $derived.by((): readonly ExpansionType[] => {
		if (version == null) {
			return [];
		}
		return getSupportedExpansionTypes(version);
	});
	const availableClasses = $derived.by((): readonly KnownClassName[] => {
		if (version == null) {
			return [];
		}
		return getSupportedClassesForExpansionType(version, selectedExpansionMode).map(
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
		const folder = saveFolder.trim();
		if (folder.length < 1) {
			return "";
		}
		const pathSeparator = folder.includes("\\") ? "\\" : "/";
		const hasTrailingSeparator = folder.endsWith("\\") || folder.endsWith("/");
		return hasTrailingSeparator
			? `${folder}${suggestedFileName}`
			: `${folder}${pathSeparator}${suggestedFileName}`;
	});
	const savePath = $derived.by(() =>
		selectedSavePath.trim().length > 0 ? selectedSavePath.trim() : suggestedPath,
	);
	const hasSelectedSavePath = $derived(selectedSavePath.trim().length > 0);
	const blockedReason = $derived.by(() => {
		if (version == null) {
			return "No supported output format is available for this edition.";
		}
		if (selectedClass == null) {
			return "Select a valid class for the current edition/mode.";
		}
		if (isClassDisabled(selectedClass)) {
			if (getClassBaseAttributes(selectedClass) == null) {
				return "Missing class defaults in charstats.txt.";
			}
			return "Class is unavailable for the selected edition/mode.";
		}
		return "";
	});
	const canCreate = $derived(!createPending && blockedReason.length === 0);

	function isClassDisabled(className: KnownClassName): boolean {
		if (version == null) {
			return true;
		}
		if (!availableClasses.includes(className)) {
			return true;
		}
		if (getClassBaseAttributes(className) == null) {
			return true;
		}
		return false;
	}

	function ensureD2sExtension(path: string): string {
		if (path.toLowerCase().endsWith(".d2s")) {
			return path;
		}
		return `${path}.d2s`;
	}

	function setBaseAttributes(
		saveData: EditorSave,
		className: KnownClassName,
	): void {
		const baseAttributes = getClassBaseAttributes(className);
		if (baseAttributes == null) {
			throw new Error(`Missing class defaults for ${className} in charstats.txt.`);
		}

		saveData.attributes.strength.value = baseAttributes.strength;
		saveData.attributes.dexterity.value = baseAttributes.dexterity;
		saveData.attributes.energy.value = baseAttributes.energy;
		saveData.attributes.vitality.value = baseAttributes.vitality;
	}

	async function chooseSavePath(): Promise<void> {
		pathError = "";
		try {
			const chosenPath = await pickSavePath({
				defaultPath: savePath.length > 0 ? savePath : suggestedFileName,
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
		if (!canCreate || version == null || selectedClass == null) {
			return;
		}

		createPending = true;
		createError = "";
		try {
			const backendSave = await invoke<BackendEditorSave>("new_save", {
				version,
				class: selectedClass,
			});
			const saveData = toEditorSave(backendSave);

			saveData.character.name = characterName;
			saveData.expansionType = selectedExpansionMode;
			saveData.character.status.hardcore = hardcoreEnabled;
			saveData.character.status.ladder = ladderEnabled;
			saveData.character.status.died = false;
			saveData.character.status.expansion = selectedExpansionMode !== "Classic";

			setBaseAttributes(saveData, selectedClass);
			if (selectedTemplate === "level99AllProgress") {
				setLevel(saveData, 99, experienceTable);
				applyCampaignCompletedTemplate(saveData, selectedExpansionMode);
				applyAllWaypointsTemplate(saveData);
			} else {
				setLevel(saveData, 1, experienceTable);
			}
			applyGameRules(saveData);

			const sourcePath = savePath.trim().length > 0 ? savePath.trim() : null;

			const openPayload: OpenedSessionData = {
				save: saveData,
				sourceBackendSave: structuredClone(backendSave),
				parseIssueCount: 0,
				parseIssues: [],
				sourceFileSize: null,
				sourcePath,
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
		const validClass = availableClasses.find((className) => !isClassDisabled(className)) ?? null;
		if (selectedClass == null || isClassDisabled(selectedClass)) {
			selectedClass = validClass;
		}
	});
</script>

<div class="container m-0">
	<div class="grid gap-2.5">
		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
			<h3 class="editor-card-title mb-1.5">Character Basics</h3>
			<p class="form-text m-0">
				Choose a base character, optional template, and create directly into the standard editor
				flow.
			</p>

			<div class="grid grid-cols-form-32 items-center gap-x-2.5 gap-y-1">
				<label class="form-label mb-0" for="new-character-name">Name</label>
				<div class="grid gap-0.5">
					<input
						id="new-character-name"
						class="form-control"
						type="text"
						autocomplete="off"
						bind:value={characterName}
						placeholder={DEFAULT_CHARACTER_NAME}
					/>
				</div>

				<span class="form-label mb-0">Game Edition</span>
				<div class="selection-grid">
					{#each GAME_EDITIONS as edition}
						<button
							type="button"
							class={`selection-button ${
								selectedEdition === edition
									? "selection-button--selected"
									: "selection-button--idle"
							}`}
							onclick={() => {
								selectedEdition = edition;
							}}
						>
							{DISPLAY_GAME_EDITION[edition]}
						</button>
					{/each}
				</div>

				<span class="form-label mb-0">Expansion Mode</span>
				<div class="selection-grid">
					{#each availableExpansionModes as mode}
						<button
							type="button"
							class={`selection-button ${
								selectedExpansionMode === mode
									? "selection-button--selected"
									: "selection-button--idle"
							}`}
							onclick={() => {
								selectedExpansionMode = mode;
							}}
						>
							{DISPLAY_EXPANSION_TYPE[mode]}
						</button>
					{/each}
				</div>

				<span class="form-label mb-0">Class</span>
				<div class="selection-grid">
					{#each availableClasses as className}
						{@const classIsDisabled = isClassDisabled(className)}
						<button
							type="button"
							class={`selection-button ${
								selectedClass === className
									? "selection-button--selected"
									: "selection-button--idle"
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
							autocomplete="off"
							bind:checked={hardcoreEnabled}
						/>
						<span>Hardcore</span>
					</label>
					<label class="inline-flex items-center gap-1.5">
						<input
							class="form-check-input mt-0"
							type="checkbox"
							autocomplete="off"
							bind:checked={ladderEnabled}
						/>
						<span>Ladder</span>
					</label>
				</div>
			</div>
		</section>

		<div class="divide-y divide-halbu-border">
			<section class="grid gap-1.5 pb-3">
				<h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-halbu-textMuted">
					Template
				</h3>
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
								autocomplete="off"
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

			<section class="grid gap-1.5 pt-3">
				<h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-halbu-textMuted">
					Save Location / Create
				</h3>
				<div class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2.5 py-2">
					<div class="grid grid-cols-form-32 items-center gap-x-2.5 gap-y-1">
						<span class="form-label mb-0">Suggested path</span>
						<div
							class="rounded-xs border border-halbu-border bg-halbu-panel px-2 py-1.5 font-mono text-sm text-halbu-text"
						>
							{#if savePath.length > 0}
								{savePath}
							{:else}
								No configured save folder. Choose a path now or save later from the editor.
							{/if}
						</div>
					</div>
					<div class="form-text mt-1">
						Starting strength, dexterity, vitality, and energy come from charstats.txt for
						the selected class.
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
								Use Suggested Path
							</Button>
						{/if}
						<Button onclick={createCharacter} disabled={!canCreate}>
							{createPending ? "Creating..." : "Create Character"}
						</Button>
					</div>
					{#if blockedReason.length > 0}
						<div class="form-text mt-1 text-halbu-warning">{blockedReason}</div>
					{/if}
					{#if pathError.length > 0}
						<div class="form-text mt-1 text-halbu-danger">{pathError}</div>
					{/if}
					{#if createError.length > 0}
						<div class="form-text mt-1 text-halbu-danger">{createError}</div>
					{/if}
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.selection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 10rem));
		justify-content: start;
		gap: 0.375rem;
	}

	.selection-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 2.125rem;
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--halbu-border-strong);
		border-radius: var(--app-radius-xs);
		background: var(--halbu-panel2);
		color: var(--halbu-text);
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.15;
		text-align: center;
		transition:
			background-color 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease,
			color 0.12s ease;
	}

	.selection-button--idle {
		color: var(--halbu-text-muted);
	}

	.selection-button--idle:hover:not(:disabled) {
		background: var(--halbu-card);
		color: var(--halbu-text);
	}

	.selection-button--selected {
		background: var(--halbu-card);
		box-shadow: inset 0 -2px 0 0 var(--halbu-primary);
		color: var(--halbu-text);
	}

	.selection-button:disabled {
		opacity: 0.55;
		cursor: default;
	}
</style>
