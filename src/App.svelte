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

	const AppMode = Object.freeze({
		Library: "library",
		Editor: "editor",
		Settings: "settings",
	} as const);
	type AppMode = (typeof AppMode)[keyof typeof AppMode];

	const ParseMode = Object.freeze({
		Lax: "lax",
		Strict: "strict",
	} as const);
	type ParseMode = (typeof ParseMode)[keyof typeof ParseMode];

	const EditorSection = Object.freeze({
		Status: "status",
		Character: "character",
		Skills: "skills",
		Waypoints: "waypoints",
		Quests: "quests",
		Mercenary: "mercenary",
		Inventory: "inventory",
	} as const);
	type EditorSection = (typeof EditorSection)[keyof typeof EditorSection];

	type EditValidation = {
		errors: unknown[];
		warnings: unknown[];
	};

	type SaveCommandResult = {
		message?: string;
		backupPerformed?: boolean;
		backupPath?: string | null;
		cleanupWarning?: string | null;
	};

	const EDITOR_NAV = Object.freeze([
		{ id: EditorSection.Character, label: "Character" },
		{ id: EditorSection.Skills, label: "Skills" },
		{ id: EditorSection.Waypoints, label: "Waypoints" },
		{ id: EditorSection.Quests, label: "Quests" },
		{ id: EditorSection.Mercenary, label: "Mercenary" },
		{ id: EditorSection.Status, label: "Status", dividerBefore: true },
	]);

	let currentSave = $state<any>(null);
	let currentParseIssueCount = $state<number>(0);
	let currentParseIssues = $state<unknown[]>([]);
	let currentSourceFileSize = $state<number | null>(null);
	let currentSourcePath = $state<string | null>(null);
	let saveRevision = $state<number>(0);
	let editValidation = $state<EditValidation>({ errors: [], warnings: [] });
	let appMode = $state<AppMode>(AppMode.Library);
	let settingsOriginMode = $state<AppMode>(AppMode.Library);
	let currentEditorSection = $state<EditorSection>(EditorSection.Status);
	let parseMode = $state<ParseMode>(ParseMode.Lax);
	const hasEditValidationErrors = $derived(
		Array.isArray(editValidation?.errors) && editValidation.errors.length > 0
	);

	const topbarMode = $derived.by(() => {
		if (appMode === AppMode.Settings) {
			return settingsOriginMode;
		}
		return appMode;
	});
	const sidebarItems = $derived.by(() => {
		if (currentSave != null) {
			return EDITOR_NAV.map((item) =>
				item.id === EditorSection.Status
					? { ...item, saveBlocked: hasEditValidationErrors }
					: item
			);
		}
		return [];
	});
	const activeSidebarItem = $derived.by(() => {
		if (appMode === AppMode.Settings) {
			return null;
		}
		if (currentSave != null) {
			return currentEditorSection;
		}
		return AppMode.Library;
	});

	initializeSettings().then(() => {
		applySettings();
		handleParseModeChange(getSetting(SettingKey.ParseMode));
	});

	async function saveCharacter(targetVersion = null) {
		if (currentSave == null) {
			return;
		}
		const resolvedTargetVersion = Number(targetVersion);
		const hasExplicitTargetVersion =
			Number.isFinite(resolvedTargetVersion) && resolvedTargetVersion > 0;
		const defaultNameSuffix =
			hasExplicitTargetVersion && resolvedTargetVersion !== Number(currentSave.version)
				? `_v${resolvedTargetVersion}`
				: "";
		const filePath = await save({
			defaultPath: `${currentSave.character.name}${defaultNameSuffix}`,
			filters: [
				{
					name: "D2R Save File",
					extensions: ["d2s"],
				},
			],
		});
		if (filePath == null) {
			return;
		}
		const backupsEnabled = getSetting(SettingKey.BackupsEnabled) !== false;
		const configuredBackupsPerCharacter = Number(getSetting(SettingKey.BackupsPerCharacter));
		const backupsPerCharacter =
			Number.isFinite(configuredBackupsPerCharacter) && configuredBackupsPerCharacter >= 1
				? Math.trunc(configuredBackupsPerCharacter)
				: 20;
		const backupSourcePath = currentSourcePath ?? filePath;

		try {
			let result: SaveCommandResult;
			if (
				hasExplicitTargetVersion &&
				resolvedTargetVersion !== Number(currentSave.version)
			) {
				result = await invoke<SaveCommandResult>("save_file_as_version", {
					path: filePath,
					save: currentSave,
					targetVersion: resolvedTargetVersion,
					backupSourcePath,
					backupConfig: {
						enabled: backupsEnabled,
						backupsPerCharacter,
					},
				});
			} else {
				result = await invoke<SaveCommandResult>("save_file", {
					path: filePath,
					save: currentSave,
					backupSourcePath,
					backupConfig: {
						enabled: backupsEnabled,
						backupsPerCharacter,
					},
				});
			}

			if (currentSourcePath == null) {
				currentSourcePath = filePath;
			}
				if (typeof result?.cleanupWarning === "string" && result.cleanupWarning.length > 0) {
					console.warn(`[backup cleanup warning] ${result.cleanupWarning}`);
				}
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

	function resolveInitialEditorSection(parseIssueCount: number): EditorSection {
		if (parseIssueCount > 0) {
			return EditorSection.Status;
		}
		return EditorSection.Character;
	}

	function openEditor(
		saveData,
		parseIssueCount = 0,
		parseIssues = [],
		sourceFileSize = null,
		sourcePath = null
	) {
		currentSave = saveData;
		const normalizedIssues = Array.isArray(parseIssues) ? parseIssues : [];
		currentParseIssueCount = Math.max(Number(parseIssueCount) || 0, normalizedIssues.length);
		currentParseIssues = normalizedIssues;
		currentSourceFileSize = Number.isFinite(Number(sourceFileSize))
			? Number(sourceFileSize)
			: null;
		currentSourcePath = typeof sourcePath === "string" && sourcePath.length > 0 ? sourcePath : null;
		editValidation = { errors: [], warnings: [] };
		currentEditorSection = resolveInitialEditorSection(currentParseIssueCount);
		appMode = AppMode.Editor;
	}

	function closeEditor() {
		currentSave = null;
		currentParseIssueCount = 0;
		currentParseIssues = [];
		currentSourceFileSize = null;
		currentSourcePath = null;
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

	function handleSidebarSelection(itemId) {
		if (currentSave != null) {
			currentEditorSection = itemId;
			appMode = AppMode.Editor;
			return;
		}
		appMode = itemId;
	}

	function handleParseModeChange(nextMode) {
		parseMode = nextMode === ParseMode.Strict ? ParseMode.Strict : ParseMode.Lax;
	}

	function handleMessages(message) {
		switch (message.id) {
			case Message.CharacterUnpicked:
				closeEditor();
				break;
			case Message.CharacterPicked:
				openEditor(
					message.data.save,
					message.data.parseIssueCount ?? 0,
					message.data.parseIssues ?? [],
					message.data.sourceFileSize ?? null,
					message.data.sourcePath ?? null
				);
				break;
			case Message.SaveFile:
				saveCharacter();
				break;
		}
	}
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
				sourceFileSize={currentSourceFileSize}
				sourcePath={currentSourcePath}
				{saveRevision}
				{editValidation}
				saveDisabled={hasEditValidationErrors}
				onSave={saveCharacter}
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
