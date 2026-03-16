<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { Message } from "./lib/utils/Message.svelte";
	import {
		initialize as initializeSettings,
		apply as applySettings,
		get as getSetting,
		Key as SettingKey,
	} from "./lib/utils/settings";
	import { getErrorMessage } from "./lib/utils/errorMessage";
	import { isUnknownSaveFormat } from "./lib/utils/GameSupport";

	import AppLayout from "./lib/layout/AppLayout.svelte";
	import ConfirmDialog from "./lib/components/ConfirmDialog.svelte";
	import Sidebar from "./lib/layout/Sidebar.svelte";
	import TopBar from "./lib/layout/TopBar.svelte";
	import SessionBar from "./lib/layout/SessionBar.svelte";

	import Library from "./lib/library/Library.svelte";
	import NewCharacter from "./lib/newCharacter/NewCharacter.svelte";
	import Settings from "./lib/settings/Settings.svelte";

	import Status from "./lib/editor/status/Status.svelte";
	import Character from "./lib/editor/character/Character.svelte";
	import Skills from "./lib/editor/skills/Skills.svelte";
	import Waypoints from "./lib/editor/waypoints/Waypoints.svelte";
	import Quests from "./lib/editor/quests/Quests.svelte";
	import Mercenary from "./lib/editor/mercenary/Mercenary.svelte";
	import Save from "./lib/editor/save/Save.svelte";
	import { resolveTargetVersion } from "./lib/editor/save/saveWorkflow";
	import { projectGameRulesDerivedValues } from "./lib/editor/character/gameRulesProjection";
	import {
		DEFAULT_EDITOR_DOCUMENT_MODE,
		buildClosedEditorSessionDocument,
		buildCompatibilityRefreshPlan,
		buildOpenedEditorSessionDocument,
		checkCompatibility,
		hasUnsavedEditorSessionChanges,
		resolveCompatibilityTargetSelection,
		saveEditorSession,
		transitionEditorDocumentMode,
		type SaveCharacterOptions,
	} from "./lib/editor/session/editorSession";
	import type { AppMessage } from "./lib/utils/Message.svelte";
	import type {
		CompatibilityIssue,
		EditValidation,
		EditorDocumentMode,
		EditorOpenPayload,
		EditorSave,
		GameEdition,
		OutputFormatOption,
		ParseMode as EditorParseMode,
		ParseIssue,
	} from "./lib/types/editor";
	const AppMode = {
		Library: "library",
		NewCharacter: "newCharacter",
		Editor: "editor",
		Settings: "settings",
	} as const;
	type AppMode = (typeof AppMode)[keyof typeof AppMode];

	const EditorSection = {
		Status: "status",
		Save: "save",
		Character: "character",
		Skills: "skills",
		Waypoints: "waypoints",
		Quests: "quests",
		Mercenary: "mercenary",
	} as const;
	type EditorSection = (typeof EditorSection)[keyof typeof EditorSection];

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
	let currentEditionHint = $state<GameEdition | null>(null);
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
	let compatibilityCheckRunCounter = 0;
	let activeCompatibilityCheckGeneration = $state(0);
	let latestCompatibilityResultGeneration = $state(0);
	let lastSaveUsedForceConversion = $state(false);
	let saveRevision = $state<number>(0);
	let editValidation = $state<EditValidation>({ errors: [], warnings: [] });
	let editorDocumentMode = $state<EditorDocumentMode>(DEFAULT_EDITOR_DOCUMENT_MODE);
	let gameRulesConfirmOpen = $state(false);
	let gameRulesConfirmDetailItems = $state<string[]>([]);
	let gameRulesConfirmResolve = $state<((confirmed: boolean) => void) | null>(null);
	let leaveEditorConfirmOpen = $state(false);
	let leaveEditorDestination = $state<AppMode | null>(null);
	let appMode = $state<AppMode>(AppMode.Library);
	let settingsOriginMode = $state<AppMode>(AppMode.Library);
	let currentEditorSection = $state<EditorSection>(EditorSection.Status);
	let parseMode = $state<EditorParseMode>("lax");
	const hasEditValidationErrors = $derived(editValidation.errors.length > 0);
	const hasBlockingCompatibilityIssues = $derived.by(() =>
		currentCompatibilityIssues.some((issue) => issue.blocking),
	);
	const currentSaveTargetVersion = $derived.by(() =>
		currentSave == null
			? null
			: resolveTargetVersion(currentSave, selectedCompatibilityTargetVersion),
	);
	const isUnknownFormatSession = $derived.by(() =>
		currentSave == null ? false : isUnknownSaveFormat(currentSave),
	);
	const currentEditVersion = $derived.by(() => {
		if (currentSave == null) {
			return null;
		}
		if (isUnknownFormatSession) {
			return currentParserLayoutVersion ?? currentSave.version;
		}
		return currentSave.version;
	});
	const missingRequiredTargetForUnknown = $derived(
		isUnknownFormatSession && selectedCompatibilityTargetVersion == null,
	);
	const saveBlocked = $derived(
		hasEditValidationErrors ||
			compatibilityCheckError.length > 0 ||
			hasBlockingCompatibilityIssues ||
			missingRequiredTargetForUnknown,
	);
	const compatibilityResultIsCurrent = $derived(
		activeCompatibilityCheckGeneration > 0 &&
			latestCompatibilityResultGeneration === activeCompatibilityCheckGeneration &&
			!compatibilityCheckPending &&
			compatibilityCheckError.length === 0,
	);
	const canForceConvert = $derived(
		!missingRequiredTargetForUnknown &&
			compatibilityResultIsCurrent &&
			hasBlockingCompatibilityIssues,
	);
	const gameRulesDerivedState = $derived.by(() => {
		if (currentSave == null || editorDocumentMode !== "game-rules") {
			return { values: null, error: "" };
		}
		try {
			return {
				values: projectGameRulesDerivedValues(currentSave).values,
				error: "",
			};
		} catch (error) {
			return {
				values: null,
				error: getErrorMessage(error, "Game rules recalculation failed."),
			};
		}
	});

	const sidebarItems = $derived.by(() => {
		if (currentSave != null) {
			return EDITOR_NAV.map((item) =>
				item.id === EditorSection.Save ? { ...item, saveBlocked } : item,
			);
		}
		return [];
	});
	const activeSidebarItem = $derived.by(() =>
		appMode === AppMode.Settings ? null : currentSave != null ? currentEditorSection : appMode,
	);

	initializeSettings().then(() => {
		applySettings();
		parseMode = getSetting(SettingKey.ParseMode);
	});

	async function refreshOutputFormatOptions() {
		try {
			const outputFormats = await invoke<OutputFormatOption[]>(
				"get_supported_output_formats",
			);
			outputFormatOptions = outputFormats.sort((left, right) => left.version - right.version);
		} catch (error) {
			console.warn("Unable to load supported output formats", error);
			outputFormatOptions = [];
		}
	}

	async function saveCharacter(input: SaveCharacterOptions = {}) {
		const saveResult = await saveEditorSession({
			input,
			currentSave,
			currentParserLayoutVersion,
			selectedCompatibilityTargetVersion,
			currentSuggestedTargetVersion,
			currentSaveTargetVersion,
			canForceConvert,
			compatibilityCheckPending,
			compatibilityCheckError,
			currentSourcePath,
		});
		if (saveResult == null) {
			return;
		}
		if (saveResult.refreshedCompatibilityIssues != null) {
			currentCompatibilityIssues = saveResult.refreshedCompatibilityIssues;
			compatibilityCheckError = "";
		}
		currentSourcePath = saveResult.filePath;
		currentSaveBaseline = saveResult.baselineSave;
		lastSaveUsedForceConversion = saveResult.forceConvertUsed;
		saveRevision += 1;
	}

	$effect(() => {
		const compatibilityRefreshPlan = buildCompatibilityRefreshPlan({
			currentSave,
			selectedCompatibilityTargetVersion,
			currentParserLayoutVersion,
			compatibilityCheckRunCounter,
		});
		if (compatibilityRefreshPlan.kind === "reset-session") {
			currentCompatibilityIssues = [];
			compatibilityCheckError = "";
			compatibilityCheckPending = false;
			compatibilityCheckRunCounter = 0;
			activeCompatibilityCheckGeneration = 0;
			latestCompatibilityResultGeneration = 0;
			return;
		}
		compatibilityCheckRunCounter = compatibilityRefreshPlan.checkGeneration;
		activeCompatibilityCheckGeneration = compatibilityRefreshPlan.checkGeneration;
		if (compatibilityRefreshPlan.kind === "skip") {
			currentCompatibilityIssues = [];
			compatibilityCheckError = compatibilityRefreshPlan.compatibilityCheckError;
			compatibilityCheckPending = false;
			latestCompatibilityResultGeneration = 0;
			return;
		}

		const token = ++compatibilityCheckToken;
		compatibilityCheckPending = true;
		compatibilityCheckError = "";
		checkCompatibility(
			compatibilityRefreshPlan.saveData,
			compatibilityRefreshPlan.targetVersion,
			compatibilityRefreshPlan.sourceLayoutVersion,
		)
			.then((issues) => {
				if (token !== compatibilityCheckToken) {
					return;
				}
				currentCompatibilityIssues = issues;
				latestCompatibilityResultGeneration = compatibilityRefreshPlan.checkGeneration;
			})
			.catch((error) => {
				if (token !== compatibilityCheckToken) {
					return;
				}
				currentCompatibilityIssues = [];
				compatibilityCheckError = getErrorMessage(error, "Compatibility check failed.");
				latestCompatibilityResultGeneration = 0;
			})
			.finally(() => {
				if (token === compatibilityCheckToken) {
					compatibilityCheckPending = false;
				}
			});
	});

	$effect(() => {
		const selectionUpdate = resolveCompatibilityTargetSelection({
			outputFormatOptions,
			currentSave,
			selectedCompatibilityTargetVersion,
			currentSuggestedTargetVersion,
		});
		if (selectionUpdate == null) {
			return;
		}
		selectedCompatibilityTargetVersion = selectionUpdate.selectedCompatibilityTargetVersion;
		if (selectionUpdate.suggestedTargetAutoSelected !== undefined) {
			suggestedTargetAutoSelected = selectionUpdate.suggestedTargetAutoSelected;
		}
	});

	function openEditor(payload: EditorOpenPayload) {
		const openedDocument = buildOpenedEditorSessionDocument(payload);
		({
			currentSave,
			currentParseIssueCount,
			currentParseIssues,
			currentHeaderChecksum,
			currentComputedChecksum,
			currentSourceFileSize,
			currentSourcePath,
			currentEditionHint,
			currentSuggestedTargetVersion,
			currentParserLayoutVersion,
			selectedCompatibilityTargetVersion,
			suggestedTargetAutoSelected,
			currentSaveBaseline,
			currentCompatibilityIssues,
			compatibilityCheckError,
			compatibilityCheckPending,
			compatibilityCheckRunCounter,
			activeCompatibilityCheckGeneration,
			latestCompatibilityResultGeneration,
			lastSaveUsedForceConversion,
			editValidation,
			editorDocumentMode,
		} = openedDocument);
		currentEditorSection =
			currentParseIssueCount > 0 ? EditorSection.Status : EditorSection.Character;
		appMode = AppMode.Editor;
	}

	function closeEditor(nextMode: AppMode = AppMode.Library) {
		const closedDocument = buildClosedEditorSessionDocument();
		({
			currentSave,
			currentParseIssueCount,
			currentParseIssues,
			currentHeaderChecksum,
			currentComputedChecksum,
			currentSourceFileSize,
			currentSourcePath,
			currentEditionHint,
			currentSuggestedTargetVersion,
			currentParserLayoutVersion,
			selectedCompatibilityTargetVersion,
			suggestedTargetAutoSelected,
			currentSaveBaseline,
			currentCompatibilityIssues,
			compatibilityCheckError,
			compatibilityCheckPending,
			compatibilityCheckRunCounter,
			activeCompatibilityCheckGeneration,
			latestCompatibilityResultGeneration,
			lastSaveUsedForceConversion,
			saveRevision,
			editValidation,
			editorDocumentMode,
		} = closedDocument);
		currentEditorSection = EditorSection.Status;
		appMode = nextMode;
	}

	function requestLeaveEditor(nextMode: AppMode): void {
		if (currentSave == null) {
			appMode = nextMode;
			return;
		}
		if (!hasUnsavedEditorSessionChanges(currentSaveBaseline, currentSave)) {
			closeEditor(nextMode);
			return;
		}
		leaveEditorDestination = nextMode;
		leaveEditorConfirmOpen = true;
	}

	function cancelLeaveEditor(): void {
		leaveEditorConfirmOpen = false;
		leaveEditorDestination = null;
	}

	function confirmLeaveEditor(): void {
		leaveEditorConfirmOpen = false;
		if (leaveEditorDestination != null) {
			closeEditor(leaveEditorDestination);
		}
		leaveEditorDestination = null;
	}

	function toggleSettings() {
		if (appMode === AppMode.Settings) {
			appMode = currentSave == null ? settingsOriginMode : AppMode.Editor;
			return;
		}
		settingsOriginMode =
			appMode === AppMode.Editor && currentSave != null ? AppMode.Editor : appMode;
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

	function openGameRulesConfirm(detailItems: string[]): Promise<boolean> {
		gameRulesConfirmDetailItems = detailItems;
		gameRulesConfirmOpen = true;
		return new Promise((resolve) => {
			gameRulesConfirmResolve = resolve;
		});
	}

	function closeGameRulesConfirm(confirmed: boolean): void {
		gameRulesConfirmOpen = false;
		if (gameRulesConfirmResolve != null) {
			gameRulesConfirmResolve(confirmed);
			gameRulesConfirmResolve = null;
		}
	}

	async function handleEditorDocumentModeChange(nextMode: EditorDocumentMode) {
		editorDocumentMode = await transitionEditorDocumentMode({
			currentSave,
			currentMode: editorDocumentMode,
			nextMode,
			confirmGameRulesSwitch: openGameRulesConfirm,
		});
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

<AppLayout showSidebar={true} showTopbar={true}>
	{#snippet topbar()}
		{#if appMode === AppMode.Editor && currentSave != null}
			<SessionBar
				save={currentSave}
				{editorDocumentMode}
				onEditorDocumentModeChange={handleEditorDocumentModeChange}
			/>
		{:else if appMode === AppMode.Library}
			<TopBar title="Library" />
		{:else if appMode === AppMode.NewCharacter}
			<TopBar title="New Character" />
		{:else if appMode === AppMode.Settings && settingsOriginMode === AppMode.Editor && currentSave != null}
			<SessionBar
				save={currentSave}
				{editorDocumentMode}
				onEditorDocumentModeChange={handleEditorDocumentModeChange}
			/>
		{:else if appMode === AppMode.Settings}
			<TopBar title="Halbu Editor" />
		{/if}
	{/snippet}

	{#snippet sidebar()}
		<Sidebar
			items={sidebarItems}
			activeId={activeSidebarItem}
			libraryActive={appMode === AppMode.Library}
			newCharacterActive={appMode === AppMode.NewCharacter}
			onSelect={handleSidebarSelection}
			onLibrary={() => requestLeaveEditor(AppMode.Library)}
			onNewCharacter={() => requestLeaveEditor(AppMode.NewCharacter)}
			settingsActive={appMode === AppMode.Settings}
			onSettings={toggleSettings}
		/>
	{/snippet}

	{#if appMode === AppMode.Settings}
		<Settings
			{parseMode}
			onParseModeChange={(nextMode: EditorParseMode) => (parseMode = nextMode)}
		/>
	{:else if appMode === AppMode.Library}
		<Library onmessage={handleMessages} {parseMode} />
	{:else if appMode === AppMode.NewCharacter}
		<NewCharacter onmessage={handleMessages} {outputFormatOptions} />
	{:else if currentSave != null}
		{#if currentEditorSection === EditorSection.Status}
			<Status
				save={currentSave}
				{editorDocumentMode}
				{parseMode}
				parseIssueCount={currentParseIssueCount}
				parseIssues={currentParseIssues}
				headerChecksum={currentHeaderChecksum}
				computedChecksum={currentComputedChecksum}
				sourceFileSize={currentSourceFileSize}
				sourcePath={currentSourcePath}
				editionHint={currentEditionHint}
				suggestedTargetVersion={currentSuggestedTargetVersion}
				parserLayoutVersion={currentParserLayoutVersion}
				{saveRevision}
			/>
		{:else if currentEditorSection === EditorSection.Save}
			<Save
				save={currentSave}
				{editorDocumentMode}
				baselineSave={currentSaveBaseline}
				{editValidation}
				compatibilityIssues={currentCompatibilityIssues}
				compatibilityTargetVersion={currentSaveTargetVersion}
				compatibilityPending={compatibilityCheckPending}
				compatibilityError={compatibilityCheckError}
				{outputFormatOptions}
				unknownFormatSession={isUnknownFormatSession}
				editionHint={currentEditionHint}
				suggestedTargetVersion={currentSuggestedTargetVersion}
				parserLayoutVersion={currentParserLayoutVersion}
				{suggestedTargetAutoSelected}
				requiresTargetSelection={missingRequiredTargetForUnknown}
				{canForceConvert}
				{lastSaveUsedForceConversion}
				{advancedSaveOptionsEnabled}
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
			<Character
				bind:editValidation
				bind:save={currentSave}
				{editorDocumentMode}
				effectiveDerivedValues={gameRulesDerivedState.values}
				effectiveDerivedValuesError={gameRulesDerivedState.error}
				parserLayoutVersion={currentEditVersion}
			/>
		{:else if currentEditorSection === EditorSection.Skills}
			<Skills
				bind:save={currentSave}
				{editorDocumentMode}
				effectiveDerivedValues={gameRulesDerivedState.values}
				effectiveDerivedValuesError={gameRulesDerivedState.error}
				parserLayoutVersion={currentEditVersion}
			/>
		{:else if currentEditorSection === EditorSection.Waypoints}
			<Waypoints bind:save={currentSave} {editorDocumentMode} />
		{:else if currentEditorSection === EditorSection.Quests}
			<Quests bind:save={currentSave} {editorDocumentMode} />
		{:else if currentEditorSection === EditorSection.Mercenary}
			<Mercenary bind:save={currentSave} />
		{/if}
	{/if}

	<ConfirmDialog
		open={gameRulesConfirmOpen}
		title="Switch to Game rules mode?"
		message="Game rules mode recalculates life, mana, stamina, and remaining stat/skill points."
		detailItems={gameRulesConfirmDetailItems}
		confirmLabel="Switch mode"
		cancelLabel="Cancel"
		onConfirm={() => closeGameRulesConfirm(true)}
		onCancel={() => closeGameRulesConfirm(false)}
	/>
	<ConfirmDialog
		open={leaveEditorConfirmOpen}
		title="Discard unsaved changes?"
		message="Leaving the editor now will discard current unsaved changes."
		confirmLabel="Leave without saving"
		cancelLabel="Cancel"
		confirmVariant="destructive"
		onConfirm={confirmLeaveEditor}
		onCancel={cancelLeaveEditor}
	/>
</AppLayout>
