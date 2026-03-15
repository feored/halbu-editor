<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { message, save } from "@tauri-apps/plugin-dialog";
	import { Message } from "./lib/utils/Message.svelte";
	import {
		initialize as initializeSettings,
		apply as applySettings,
		get as getSetting,
		Key as SettingKey,
	} from "./lib/utils/settings";
	import { getErrorMessage } from "./lib/utils/errorMessage.js";
	import { getSaveTargetVersion, isUnknownSaveFormat } from "./lib/utils/GameSupport";

	import AppLayout from "./lib/layout/AppLayout.svelte";
	import Sidebar from "./lib/layout/Sidebar.svelte";
	import TopBar from "./lib/layout/TopBar.svelte";
	import SessionBar from "./lib/layout/SessionBar.svelte";

	import Library from "./lib/library/Library.svelte";
	import Settings from "./lib/settings/Settings.svelte";

	import Status from "./lib/editor/status/Status.svelte";
	import Character from "./lib/editor/character/Character.svelte";
	import Skills from "./lib/editor/skills/Skills.svelte";
	import Waypoints from "./lib/editor/waypoints/Waypoints.svelte";
	import Quests from "./lib/editor/quests/Quests.svelte";
	import Mercenary from "./lib/editor/mercenary/Mercenary.svelte";
	import Save from "./lib/editor/save/Save.svelte";
	import {
		applyTargetVersionToSave,
		buildBlockingCompatibilityMessage,
		buildSaveCommandPayload,
		buildSavePathContext,
		getBlockingCompatibilityIssues,
		resolveBackupSourcePath,
		resolveTargetVersion,
	} from "./lib/editor/save/saveWorkflow";
	import type { AppMessage } from "./lib/utils/Message.svelte";
	import type {
		CompatibilityIssue,
		EditionHintId,
		EditValidation,
		EditorOpenPayload,
		ParseMode as EditorParseMode,
		SaveCommandResult,
		ParseIssue,
		EditorSave,
		OutputFormatOption,
	} from "./lib/types/editor";

	const AppMode = {
		Library: "library",
		Editor: "editor",
		Settings: "settings",
	} as const;
	type AppMode = (typeof AppMode)[keyof typeof AppMode];

	const ParseMode = {
		Lax: "lax",
		Strict: "strict",
	} as const;

	const EditorSection = {
		Status: "status",
		Save: "save",
		Character: "character",
		Skills: "skills",
		Waypoints: "waypoints",
		Quests: "quests",
		Mercenary: "mercenary",
		Inventory: "inventory",
	} as const;
	type EditorSection = (typeof EditorSection)[keyof typeof EditorSection];

	type SaveCharacterOptions = {
		targetVersion?: number | null;
		saveAs?: boolean;
	};

	const EDITOR_NAV = [
		{ id: EditorSection.Character, label: "Character" },
		{ id: EditorSection.Skills, label: "Skills" },
		{ id: EditorSection.Waypoints, label: "Waypoints" },
		{ id: EditorSection.Quests, label: "Quests" },
		{ id: EditorSection.Mercenary, label: "Mercenary" },
		{ id: EditorSection.Save, label: "Save", dividerBefore: true },
		{ id: EditorSection.Status, label: "Status" },
	] as const;

	let currentSave = $state<EditorSave | null>(null);
	let currentParseIssueCount = $state<number>(0);
	let currentParseIssues = $state<ParseIssue[]>([]);
	let currentHeaderChecksum = $state<number | null>(null);
	let currentComputedChecksum = $state<number | null>(null);
	let currentSourceFileSize = $state<number | null>(null);
	let currentSourcePath = $state<string | null>(null);
	let currentEditionHint = $state<EditionHintId | null>(null);
	let currentSuggestedTargetVersion = $state<99 | 105 | null>(null);
	let currentParserLayoutVersion = $state<99 | 105 | null>(null);
	let suggestedTargetAutoSelected = $state(false);
	let currentSaveBaseline = $state<EditorSave | null>(null);
	let currentCompatibilityIssues = $state<CompatibilityIssue[]>([]);
	let outputFormatOptions = $state<OutputFormatOption[]>([]);
	let advancedSaveOptionsEnabled = $state(false);
	let selectedCompatibilityTargetVersion = $state<number | null>(null);
	let compatibilityCheckPending = $state(false);
	let compatibilityCheckError = $state("");
	let compatibilityCheckToken = 0;
	let saveRevision = $state<number>(0);
	let editValidation = $state<EditValidation>({ errors: [], warnings: [] });
	let appMode = $state<AppMode>(AppMode.Library);
	let settingsOriginMode = $state<AppMode>(AppMode.Library);
	let currentEditorSection = $state<EditorSection>(EditorSection.Status);
	let parseMode = $state<EditorParseMode>(ParseMode.Lax);
	const hasEditValidationErrors = $derived(editValidation.errors.length > 0);
	const hasBlockingCompatibilityIssues = $derived.by(() =>
		currentCompatibilityIssues.some((issue) => issue.blocking)
	);
	const currentSaveTargetVersion = $derived.by(() =>
		currentSave == null
			? null
			: resolveTargetVersion(currentSave, selectedCompatibilityTargetVersion)
	);
	const isUnknownFormatSession = $derived.by(() =>
		currentSave == null ? false : isUnknownSaveFormat(currentSave)
	);
	const missingRequiredTargetForUnknown = $derived(
		isUnknownFormatSession && selectedCompatibilityTargetVersion == null
	);
	const saveBlocked = $derived(
		hasEditValidationErrors ||
			compatibilityCheckError.length > 0 ||
			hasBlockingCompatibilityIssues ||
			missingRequiredTargetForUnknown
	);

	const topbarMode = $derived.by(() =>
		appMode === AppMode.Settings ? settingsOriginMode : appMode
	);
	const sidebarItems = $derived.by(() => {
		if (currentSave != null) {
			return EDITOR_NAV.map((item) =>
				item.id === EditorSection.Save
					? { ...item, saveBlocked }
					: item
			);
		}
		return [];
	});
	const activeSidebarItem = $derived.by(() =>
		appMode === AppMode.Settings ? null : currentSave != null ? currentEditorSection : AppMode.Library
	);

	initializeSettings().then(() => {
		applySettings();
		handleParseModeChange(getSetting(SettingKey.ParseMode));
	});

	async function refreshOutputFormatOptions() {
		try {
			const outputFormats = await invoke<OutputFormatOption[]>("get_supported_output_formats");
			outputFormatOptions = outputFormats.sort(
				(left, right) => left.version - right.version
			);
		} catch (error) {
			console.warn("Unable to load supported output formats", error);
			outputFormatOptions = [];
		}
	}

	async function checkCompatibility(
		saveData: EditorSave,
		targetVersion: number,
		sourceLayoutVersion: number | null = null
	) {
		return invoke<CompatibilityIssue[]>("check_save_compatibility", {
			save: buildSaveCommandPayload(saveData, sourceLayoutVersion),
			targetVersion,
		});
	}

	async function saveCharacter(input: SaveCharacterOptions = {}) {
		if (currentSave == null) {
			return;
		}
		const targetVersion = input.targetVersion ?? null;
		const saveAs = input.saveAs === true;
		const unknownFormatSession = isUnknownSaveFormat(currentSave);
		const sourceLayoutVersion = unknownFormatSession ? currentParserLayoutVersion : null;
		if (unknownFormatSession && selectedCompatibilityTargetVersion == null) {
			const suggestionMessage =
				currentSuggestedTargetVersion == null
					? "Select an output format (v99 or v105) in Conversion before saving."
					: `Suggested target is v${currentSuggestedTargetVersion}. Confirm or change it in Conversion before saving.`;
			await message(`This save uses an unknown source format. ${suggestionMessage}`, {
				title: "Save blocked",
				kind: "warning",
			});
			return;
		}
		const hasExplicitTargetVersion = targetVersion != null;
		const resolvedTargetVersion = resolveTargetVersion(
			currentSave,
			selectedCompatibilityTargetVersion,
			targetVersion
		);
		if (resolvedTargetVersion == null) {
			await message(
				"No compatible output format was selected for this save. Choose an encodable target format (v99 or v105).",
				{
					title: "Save blocked",
					kind: "warning",
				}
			);
			return;
		}
		let compatibilityIssues: CompatibilityIssue[] = [];
		try {
			compatibilityIssues = await checkCompatibility(
				currentSave,
				resolvedTargetVersion,
				sourceLayoutVersion
			);
		} catch (error) {
			const detail = getErrorMessage(error, "Compatibility check failed.");
			await message(detail, {
				title: "Save blocked",
				kind: "error",
			});
			throw error;
		}
		if (!hasExplicitTargetVersion && resolvedTargetVersion === currentSaveTargetVersion) {
			currentCompatibilityIssues = compatibilityIssues;
			compatibilityCheckError = "";
		}
		const blockingIssues = getBlockingCompatibilityIssues(compatibilityIssues);
		if (blockingIssues.length > 0) {
			await message(
				buildBlockingCompatibilityMessage(resolvedTargetVersion, blockingIssues),
				{
					title: "Save blocked",
					kind: "warning",
				}
			);
			return;
		}
		const savePayload = buildSaveCommandPayload(currentSave, sourceLayoutVersion);
		const savePathContext = buildSavePathContext(
			currentSave,
			currentSourcePath,
			resolvedTargetVersion
		);
		const forcePicker = saveAs || savePathContext.forcePicker;
		const filePath =
			!forcePicker && currentSourcePath != null && currentSourcePath.length > 0
				? currentSourcePath
				: ((await save({
						defaultPath: savePathContext.defaultPath,
						filters: [
							{
								name: "D2R Save File",
								extensions: ["d2s"],
							},
						],
					})) ?? null);
		if (filePath == null) {
			return;
		}
		const backupsEnabled = getSetting(SettingKey.BackupsEnabled);
		const backupsPerCharacter = getSetting(SettingKey.BackupsPerCharacter);
		const backupSourcePath = resolveBackupSourcePath(filePath, currentSourcePath, saveAs);

		try {
			const result = await invoke<SaveCommandResult>("save_file_as_version", {
				path: filePath,
				save: savePayload,
				targetVersion: resolvedTargetVersion,
				backupSourcePath,
				backupConfig: {
					enabled: backupsEnabled,
					backupsPerCharacter,
				},
			});

			currentSourcePath = filePath;
			applyTargetVersionToSave(currentSave, resolvedTargetVersion);
			if (result.cleanupWarning != null && result.cleanupWarning.length > 0) {
				console.warn(`[backup cleanup warning] ${result.cleanupWarning}`);
			}
			currentSaveBaseline = structuredClone(currentSave);
			saveRevision += 1;
			return;
		} catch (error) {
			const detail = getErrorMessage(error, "Unknown error");
			await message(detail, {
				title: "Save failed",
				kind: "error",
			});
			throw error;
		}
	}

	$effect(() => {
		const saveData = currentSave;
		if (saveData == null) {
			currentCompatibilityIssues = [];
			compatibilityCheckError = "";
			compatibilityCheckPending = false;
			return;
		}
		const unknownFormatSession = isUnknownSaveFormat(saveData);
		if (unknownFormatSession && selectedCompatibilityTargetVersion == null) {
			currentCompatibilityIssues = [];
			compatibilityCheckError = "";
			compatibilityCheckPending = false;
			return;
		}

		const targetVersion = resolveTargetVersion(saveData, selectedCompatibilityTargetVersion);
		if (targetVersion == null) {
			currentCompatibilityIssues = [];
			compatibilityCheckError =
				"No encodable target format is available for this save. Use v99 or v105.";
			compatibilityCheckPending = false;
			return;
		}

		const token = ++compatibilityCheckToken;
		compatibilityCheckPending = true;
		compatibilityCheckError = "";
		const sourceLayoutVersion = unknownFormatSession ? currentParserLayoutVersion : null;
		checkCompatibility(saveData, targetVersion, sourceLayoutVersion)
			.then((issues) => {
				if (token !== compatibilityCheckToken) {
					return;
				}
				currentCompatibilityIssues = issues;
			})
			.catch((error) => {
				if (token !== compatibilityCheckToken) {
					return;
				}
				currentCompatibilityIssues = [];
				compatibilityCheckError = getErrorMessage(error, "Compatibility check failed.");
			})
			.finally(() => {
				if (token === compatibilityCheckToken) {
					compatibilityCheckPending = false;
				}
			});
	});

	$effect(() => {
		const options = outputFormatOptions;
		if (options.length < 1) {
			selectedCompatibilityTargetVersion = null;
			return;
		}
		const saveData = currentSave;
		if (saveData == null) {
			selectedCompatibilityTargetVersion = null;
			return;
		}
		const saveTargetVersion = getSaveTargetVersion(saveData);
		const unknownFormatSession = isUnknownSaveFormat(saveData);
		const selectionIsValid = options.some(
			(option) => option.version === selectedCompatibilityTargetVersion
		);
		if (selectionIsValid) {
			return;
		}
		if (unknownFormatSession) {
			const suggestionIsValid = options.some(
				(option) => option.version === currentSuggestedTargetVersion
			);
			if (suggestionIsValid && currentSuggestedTargetVersion != null) {
				selectedCompatibilityTargetVersion = currentSuggestedTargetVersion;
				suggestedTargetAutoSelected = true;
			} else {
				selectedCompatibilityTargetVersion = null;
				suggestedTargetAutoSelected = false;
			}
			return;
		}
		selectedCompatibilityTargetVersion = saveTargetVersion ?? options[0].version;
	});

	function openEditor(payload: EditorOpenPayload) {
		currentSave = payload.save;
		currentParseIssueCount = payload.parseIssueCount;
		currentParseIssues = payload.parseIssues;
		currentHeaderChecksum = payload.headerChecksum;
		currentComputedChecksum = payload.computedChecksum;
		currentSourceFileSize = payload.sourceFileSize;
		currentSourcePath = payload.sourcePath;
		currentEditionHint = payload.editionHint;
		currentSuggestedTargetVersion = payload.suggestedTargetVersion;
		currentParserLayoutVersion = payload.parserLayoutVersion;
		currentSaveBaseline = structuredClone(payload.save);
		const unknownFormatSession = isUnknownSaveFormat(payload.save);
		if (unknownFormatSession && payload.suggestedTargetVersion != null) {
			selectedCompatibilityTargetVersion = payload.suggestedTargetVersion;
			suggestedTargetAutoSelected = true;
		} else {
			selectedCompatibilityTargetVersion = getSaveTargetVersion(payload.save);
			suggestedTargetAutoSelected = false;
		}
		currentCompatibilityIssues = [];
		compatibilityCheckError = "";
		compatibilityCheckPending = false;
		editValidation = { errors: [], warnings: [] };
		currentEditorSection =
			currentParseIssueCount > 0 ? EditorSection.Status : EditorSection.Character;
		appMode = AppMode.Editor;
	}

	function closeEditor() {
		currentSave = null;
		currentParseIssueCount = 0;
		currentParseIssues = [];
		currentHeaderChecksum = null;
		currentComputedChecksum = null;
		currentSourceFileSize = null;
		currentSourcePath = null;
		currentEditionHint = null;
		currentSuggestedTargetVersion = null;
		currentParserLayoutVersion = null;
		suggestedTargetAutoSelected = false;
		currentSaveBaseline = null;
		currentCompatibilityIssues = [];
		compatibilityCheckError = "";
		compatibilityCheckPending = false;
		saveRevision = 0;
		editValidation = { errors: [], warnings: [] };
		currentEditorSection = EditorSection.Status;
		appMode = AppMode.Library;
	}

	function goToLibrary() {
		if (currentSave != null) {
			closeEditor();
			return;
		}
		appMode = AppMode.Library;
	}

	function toggleSettings() {
		if (appMode === AppMode.Settings) {
			appMode = currentSave == null ? AppMode.Library : AppMode.Editor;
			return;
		}
		settingsOriginMode =
			appMode === AppMode.Editor && currentSave != null ? AppMode.Editor : AppMode.Library;
		appMode = AppMode.Settings;
	}

	function handleSidebarSelection(itemId: AppMode | EditorSection) {
		if (currentSave != null) {
			currentEditorSection = itemId as EditorSection;
			appMode = AppMode.Editor;
			return;
		}
		appMode = itemId as AppMode;
	}

	function handleParseModeChange(nextMode: EditorParseMode) {
		parseMode = nextMode;
	}

	function handleMessages(nextMessage: AppMessage) {
		switch (nextMessage.id) {
			case Message.CharacterUnpicked:
				closeEditor();
				break;
			case Message.CharacterPicked:
				openEditor(nextMessage.data);
				break;
			case Message.SaveFile:
				saveCharacter();
				break;
		}
	}

	refreshOutputFormatOptions();
</script>

<AppLayout showSidebar={true} showTopbar={topbarMode !== AppMode.Library}>
	{#snippet topbar()}
		{#if topbarMode === AppMode.Editor && currentSave != null}
			<SessionBar save={currentSave} />
		{:else if topbarMode === AppMode.Settings}
			<TopBar title="Halbu Editor" />
		{/if}
	{/snippet}

	{#snippet sidebar()}
		<Sidebar
			title=""
			items={sidebarItems}
			activeId={activeSidebarItem}
			editorActive={appMode === AppMode.Editor}
			libraryActive={appMode === AppMode.Library}
			onSelect={handleSidebarSelection}
			onLibrary={goToLibrary}
			settingsActive={appMode === AppMode.Settings}
			onSettings={toggleSettings}
		/>
	{/snippet}

	{#if appMode === AppMode.Settings}
		<Settings {parseMode} onParseModeChange={handleParseModeChange} />
	{:else if appMode === AppMode.Library}
		<Library onmessage={handleMessages} {parseMode} />
	{:else if currentSave != null}
		{#if currentEditorSection === EditorSection.Status}
			<Status
				save={currentSave}
				{parseMode}
				parseIssueCount={currentParseIssueCount}
				parseIssues={currentParseIssues}
				headerChecksum={currentHeaderChecksum}
				computedChecksum={currentComputedChecksum}
				sourceFileSize={currentSourceFileSize}
				sourcePath={currentSourcePath}
				editionHint={currentEditionHint}
				parserLayoutVersion={currentParserLayoutVersion}
				{saveRevision}
			/>
			{:else if currentEditorSection === EditorSection.Save}
				<Save
					save={currentSave}
					baselineSave={currentSaveBaseline}
					{editValidation}
					compatibilityIssues={currentCompatibilityIssues}
					compatibilityTargetVersion={currentSaveTargetVersion}
					compatibilityPending={compatibilityCheckPending}
					compatibilityError={compatibilityCheckError}
					outputFormatOptions={outputFormatOptions}
					unknownFormatSession={isUnknownFormatSession}
					editionHint={currentEditionHint}
					suggestedTargetVersion={currentSuggestedTargetVersion}
					parserLayoutVersion={currentParserLayoutVersion}
					suggestedTargetAutoSelected={suggestedTargetAutoSelected}
					requiresTargetSelection={missingRequiredTargetForUnknown}
					advancedSaveOptionsEnabled={advancedSaveOptionsEnabled}
					saveDisabled={saveBlocked}
					onToggleAdvancedSaveOptions={(enabled) =>
						(advancedSaveOptionsEnabled = enabled === true)}
					onSelectCompatibilityTargetVersion={(nextValue) => {
						selectedCompatibilityTargetVersion = nextValue;
						suggestedTargetAutoSelected = false;
					}}
					onSave={saveCharacter}
					onRestore={() => {
						if (currentSaveBaseline == null) {
							return;
						}
						currentSave = structuredClone(currentSaveBaseline);
						editValidation = { errors: [], warnings: [] };
					}}
				/>
		{:else if currentEditorSection === EditorSection.Character}
			<Character bind:editValidation bind:save={currentSave} />
		{:else if currentEditorSection === EditorSection.Skills}
			<Skills bind:save={currentSave} />
		{:else if currentEditorSection === EditorSection.Waypoints}
			<Waypoints bind:save={currentSave} />
		{:else if currentEditorSection === EditorSection.Quests}
			<Quests bind:save={currentSave} />
		{:else if currentEditorSection === EditorSection.Mercenary}
			<Mercenary bind:save={currentSave} />
		{:else if currentEditorSection === EditorSection.Inventory}
			<div class="container m-0">
				<h3>Inventory</h3>
				<div class="alert alert-secondary mb-0">Inventory editor placeholder.</div>
			</div>
		{/if}
	{/if}
</AppLayout>
