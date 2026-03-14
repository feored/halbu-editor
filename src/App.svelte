<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { message, save } from "@tauri-apps/plugin-dialog";
	import { Message } from "./lib/utils/Message.svelte";
	import {
		initialize as initializeSettings,
		apply as applySettings,
		get as getSetting,
		Key as SettingKey,
	} from "./lib/utils/settings.js";
	import { getSaveTargetVersion } from "./lib/utils/GameSupport";

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
	import { editorSkillsToBackendSkills } from "./lib/editor/skills/skillAdapters";
	import { DEFAULT_SKILL_SLOT_COUNT } from "./lib/editor/skills/skillSlots";
	import type { AppMessage } from "./lib/utils/Message.svelte";
	import type {
		CompatibilityIssue,
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
		currentSave == null ? null : resolveTargetVersion(currentSave)
	);
	const saveBlocked = $derived(
		hasEditValidationErrors || compatibilityCheckError.length > 0 || hasBlockingCompatibilityIssues
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

	function buildSaveCommandPayload(saveData: EditorSave) {
		return {
			...saveData,
			skills: editorSkillsToBackendSkills(saveData.skills, DEFAULT_SKILL_SLOT_COUNT),
		};
	}

	function resolveTargetVersion(
		saveData: EditorSave,
		targetVersion: number | null | undefined = null
	) {
		if (targetVersion != null) {
			return targetVersion;
		}
		if (selectedCompatibilityTargetVersion != null) {
			return selectedCompatibilityTargetVersion;
		}
		return getSaveTargetVersion(saveData);
	}

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

	async function checkCompatibility(saveData: EditorSave, targetVersion: number) {
		return invoke<CompatibilityIssue[]>("check_save_compatibility", {
			save: buildSaveCommandPayload(saveData),
			targetVersion,
		});
	}

	async function saveCharacter(input: SaveCharacterOptions = {}) {
		if (currentSave == null) {
			return;
		}
		const targetVersion = input.targetVersion ?? null;
		const saveAs = input.saveAs === true;
		const hasExplicitTargetVersion = targetVersion != null;
		const resolvedTargetVersion = resolveTargetVersion(currentSave, targetVersion);
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
			compatibilityIssues = await checkCompatibility(currentSave, resolvedTargetVersion);
		} catch (error) {
			const detail = String(error ?? "Compatibility check failed.");
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
		const blockingIssues = compatibilityIssues.filter((issue) => issue.blocking);
		if (blockingIssues.length > 0) {
			const detail = blockingIssues
				.map((issue) => `- ${issue.message}`)
				.join("\n");
			await message(
				`Cannot save to v${resolvedTargetVersion} because of blocking compatibility issues:\n${detail}`,
				{
					title: "Save blocked",
					kind: "warning",
				}
			);
			return;
		}
		const savePayload = buildSaveCommandPayload(currentSave);
		const isCrossVersionSave = resolvedTargetVersion !== currentSave.version;
		const defaultNameSuffix =
			isCrossVersionSave ? `_v${resolvedTargetVersion}` : "";
		const defaultPath =
			currentSourcePath ?? `${currentSave.character.name}${defaultNameSuffix}`;
		const forcePicker = saveAs || currentSourcePath == null || isCrossVersionSave;
		const filePath =
			!forcePicker && currentSourcePath != null && currentSourcePath.length > 0
				? currentSourcePath
				: ((await save({
						defaultPath,
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
		const backupSourcePath = saveAs ? filePath : currentSourcePath ?? filePath;

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
			currentSave.version = resolvedTargetVersion;
			currentSave.meta.format = resolvedTargetVersion === 99 ? "V99" : "V105";
			if (result.cleanupWarning != null && result.cleanupWarning.length > 0) {
				console.warn(`[backup cleanup warning] ${result.cleanupWarning}`);
			}
			currentSaveBaseline = structuredClone(currentSave);
			saveRevision += 1;
			return;
		} catch (error) {
			const detail = String(error ?? "Unknown error");
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

		const targetVersion = resolveTargetVersion(saveData);
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
		checkCompatibility(saveData, targetVersion)
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
				compatibilityCheckError = String(error ?? "Compatibility check failed.");
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
		const selectionIsValid = options.some(
			(option) => option.version === selectedCompatibilityTargetVersion
		);
		if (!selectionIsValid || selectedCompatibilityTargetVersion == null) {
			selectedCompatibilityTargetVersion = saveTargetVersion ?? options[0].version;
		}
	});

	function openEditor(payload: EditorOpenPayload) {
		currentSave = payload.save;
		currentParseIssueCount = payload.parseIssueCount;
		currentParseIssues = payload.parseIssues;
		currentHeaderChecksum = payload.headerChecksum;
		currentComputedChecksum = payload.computedChecksum;
		currentSourceFileSize = payload.sourceFileSize;
		currentSourcePath = payload.sourcePath;
		currentSaveBaseline = structuredClone(payload.save);
		selectedCompatibilityTargetVersion = getSaveTargetVersion(payload.save);
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
				advancedSaveOptionsEnabled={advancedSaveOptionsEnabled}
				saveDisabled={saveBlocked}
				onToggleAdvancedSaveOptions={(enabled) =>
					(advancedSaveOptionsEnabled = enabled === true)}
				onSelectCompatibilityTargetVersion={(nextValue) => {
					selectedCompatibilityTargetVersion = nextValue;
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
