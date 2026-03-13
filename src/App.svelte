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
		Save: "save",
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
	type CompatibilityIssue = {
		code?: unknown;
		blocking?: boolean;
		message?: string;
	};
	type OutputFormatOption = {
		formatId?: unknown;
		version?: unknown;
		gameEdition?: unknown;
	};
	type NormalizedOutputFormatOption = {
		formatId: string;
		version: number;
		gameEdition: string;
	};
	const SKILL_SLOT_COUNT = 30;

	type SaveCharacterOptions = {
		targetVersion?: number | null;
		saveAs?: boolean;
	};

	const EDITOR_NAV = Object.freeze([
		{ id: EditorSection.Character, label: "Character" },
		{ id: EditorSection.Skills, label: "Skills" },
		{ id: EditorSection.Waypoints, label: "Waypoints" },
		{ id: EditorSection.Quests, label: "Quests" },
		{ id: EditorSection.Mercenary, label: "Mercenary" },
		{ id: EditorSection.Save, label: "Save", dividerBefore: true },
		{ id: EditorSection.Status, label: "Status" },
	]);

	let currentSave = $state<any>(null);
	let currentParseIssueCount = $state<number>(0);
	let currentParseIssues = $state<unknown[]>([]);
	let currentHeaderChecksum = $state<number | null>(null);
	let currentComputedChecksum = $state<number | null>(null);
	let currentSourceFileSize = $state<number | null>(null);
	let currentSourcePath = $state<string | null>(null);
	let currentSaveBaseline = $state<any>(null);
	let currentCompatibilityIssues = $state<CompatibilityIssue[]>([]);
	let outputFormatOptions = $state<NormalizedOutputFormatOption[]>([]);
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
	let parseMode = $state<ParseMode>(ParseMode.Lax);
	const hasEditValidationErrors = $derived(
		Array.isArray(editValidation?.errors) && editValidation.errors.length > 0
	);
	const hasBlockingCompatibilityIssues = $derived.by(() =>
		currentCompatibilityIssues.some((issue) => issue?.blocking === true)
	);
	const currentSaveTargetVersion = $derived.by(() =>
		currentSave == null ? null : resolveTargetVersion(currentSave, null)
	);
	const saveBlocked = $derived(
		hasEditValidationErrors || compatibilityCheckError.length > 0 || hasBlockingCompatibilityIssues
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
				item.id === EditorSection.Save
					? { ...item, saveBlocked }
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

	function cloneSaveSnapshot(saveData: any) {
		if (saveData == null) {
			return null;
		}
		try {
			return structuredClone(saveData);
		} catch {
			return JSON.parse(JSON.stringify(saveData));
		}
	}

	function clampSkillPoint(value: unknown) {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) {
			return 0;
		}
		return Math.max(0, Math.min(255, Math.trunc(parsed)));
	}

	function normalizeSkillPointsForSave(skills: any) {
		const points = Array.from({ length: SKILL_SLOT_COUNT }, () => 0);
		if (Array.isArray(skills)) {
			for (let index = 0; index < SKILL_SLOT_COUNT; index += 1) {
				const slot = skills[index];
				if (typeof slot === "number") {
					points[index] = clampSkillPoint(slot);
					continue;
				}
				if (slot != null && typeof slot === "object") {
					points[index] = clampSkillPoint((slot as { points?: unknown }).points);
				}
			}
			return points;
		}

		if (skills != null && typeof skills === "object" && Array.isArray(skills.points)) {
			for (let index = 0; index < SKILL_SLOT_COUNT; index += 1) {
				points[index] = clampSkillPoint(skills.points[index]);
			}
		}
		return points;
	}

	function buildSaveCommandPayload(saveData: any) {
		const payload = cloneSaveSnapshot(saveData);
		if (payload == null || typeof payload !== "object") {
			return saveData;
		}
		payload.skills = {
			points: normalizeSkillPointsForSave(saveData?.skills),
		};
		return payload;
	}

	function resolveTargetVersion(saveData: any, targetVersion: unknown) {
		const explicitTargetVersion = Number(targetVersion);
		if (Number.isFinite(explicitTargetVersion) && explicitTargetVersion > 0) {
			return Math.trunc(explicitTargetVersion);
		}
		if (selectedCompatibilityTargetVersion != null) {
			return selectedCompatibilityTargetVersion;
		}
		return getSaveTargetVersion(saveData);
	}

	function normalizeOutputFormatOption(format: OutputFormatOption): NormalizedOutputFormatOption | null {
		const version = Number(format?.version);
		if (!Number.isFinite(version) || version <= 0) {
			return null;
		}
		return {
			formatId: String(format?.formatId ?? `V${Math.trunc(version)}`),
			version: Math.trunc(version),
			gameEdition: String(format?.gameEdition ?? "Unknown"),
		};
	}

	async function refreshOutputFormatOptions() {
		try {
			const rawFormats = await invoke<OutputFormatOption[]>("get_supported_output_formats");
			const normalizedFormats = (Array.isArray(rawFormats) ? rawFormats : [])
				.map(normalizeOutputFormatOption)
				.filter((format): format is NormalizedOutputFormatOption => format != null)
				.sort((left, right) => left.version - right.version);
			outputFormatOptions = normalizedFormats;
		} catch (error) {
			console.warn("Unable to load supported output formats", error);
			outputFormatOptions = [];
		}
	}

	function setAdvancedSaveOptionsEnabled(enabled: boolean) {
		advancedSaveOptionsEnabled = enabled === true;
	}

	function setSelectedCompatibilityTargetVersion(nextValue: number) {
		const parsed = Number(nextValue);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			return;
		}
		selectedCompatibilityTargetVersion = Math.trunc(parsed);
	}

	async function checkCompatibility(saveData: any, targetVersion: number) {
		const savePayload = buildSaveCommandPayload(saveData);
		const rawIssues = await invoke<CompatibilityIssue[]>("check_save_compatibility", {
			save: savePayload,
			targetVersion,
		});
		return Array.isArray(rawIssues) ? rawIssues : [];
	}

	function restoreToBaseline() {
		if (currentSaveBaseline == null) {
			return;
		}
		currentSave = cloneSaveSnapshot(currentSaveBaseline);
		editValidation = { errors: [], warnings: [] };
	}

	function resolveSaveCharacterOptions(input?: SaveCharacterOptions | number | null) {
		if (typeof input === "number" || input == null) {
			return {
				targetVersion: input,
				saveAs: false,
			};
		}
		return {
			targetVersion: input.targetVersion ?? null,
			saveAs: input.saveAs === true,
		};
	}

	async function pickSavePath({
		defaultPath,
		forcePicker,
	}: {
		defaultPath: string;
		forcePicker: boolean;
	}) {
		if (!forcePicker && typeof currentSourcePath === "string" && currentSourcePath.length > 0) {
			return currentSourcePath;
		}

		const filePath = await save({
			defaultPath,
			filters: [
				{
					name: "D2R Save File",
					extensions: ["d2s"],
				},
			],
		});

		return filePath ?? null;
	}

	async function saveCharacter(input?: SaveCharacterOptions | number | null) {
		if (currentSave == null) {
			return;
		}
		const { targetVersion, saveAs } = resolveSaveCharacterOptions(input);
		const explicitTargetVersion = Number(targetVersion);
		const hasExplicitTargetVersion =
			Number.isFinite(explicitTargetVersion) && explicitTargetVersion > 0;
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
		const blockingIssues = compatibilityIssues.filter((issue) => issue?.blocking === true);
		if (blockingIssues.length > 0) {
			const detail = blockingIssues
				.map((issue) => `- ${String(issue?.message ?? "Unsupported save configuration.")}`)
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
		const isCrossVersionSave = resolvedTargetVersion !== Number(currentSave.version);
		const defaultNameSuffix =
			isCrossVersionSave ? `_v${resolvedTargetVersion}` : "";
		const defaultPath =
			currentSourcePath ?? `${currentSave.character.name}${defaultNameSuffix}`;
		const filePath = await pickSavePath({
			defaultPath,
			forcePicker: saveAs || currentSourcePath == null || isCrossVersionSave,
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
			if (currentSave?.meta != null && typeof currentSave.meta === "object") {
				currentSave.meta.format = resolvedTargetVersion === 99 ? "V99" : "V105";
			}
			if (typeof result?.cleanupWarning === "string" && result.cleanupWarning.length > 0) {
				console.warn(`[backup cleanup warning] ${result.cleanupWarning}`);
			}
			currentSaveBaseline = cloneSaveSnapshot(currentSave);
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

		const targetVersion = resolveTargetVersion(saveData, null);
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
		const hasSave = currentSave != null;
		const options = outputFormatOptions;
		if (options.length < 1) {
			selectedCompatibilityTargetVersion = null;
			return;
		}
		if (!hasSave) {
			selectedCompatibilityTargetVersion = null;
			return;
		}
		const saveTargetVersion = getSaveTargetVersion(currentSave);
		const selectionIsValid = options.some(
			(option) => option.version === selectedCompatibilityTargetVersion
		);
		if (!selectionIsValid || selectedCompatibilityTargetVersion == null) {
			selectedCompatibilityTargetVersion = saveTargetVersion ?? options[0].version;
		}
	});

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
		headerChecksum = null,
		computedChecksum = null,
		sourceFileSize = null,
		sourcePath = null
	) {
		currentSave = saveData;
		const normalizedIssues = Array.isArray(parseIssues) ? parseIssues : [];
		currentParseIssueCount = Math.max(Number(parseIssueCount) || 0, normalizedIssues.length);
		currentParseIssues = normalizedIssues;
		currentHeaderChecksum = Number.isFinite(Number(headerChecksum))
			? Number(headerChecksum)
			: null;
		currentComputedChecksum = Number.isFinite(Number(computedChecksum))
			? Number(computedChecksum)
			: null;
		currentSourceFileSize = Number.isFinite(Number(sourceFileSize))
			? Number(sourceFileSize)
			: null;
		currentSourcePath = typeof sourcePath === "string" && sourcePath.length > 0 ? sourcePath : null;
		currentSaveBaseline = cloneSaveSnapshot(saveData);
		selectedCompatibilityTargetVersion = getSaveTargetVersion(saveData);
		currentCompatibilityIssues = [];
		compatibilityCheckError = "";
		compatibilityCheckPending = false;
		editValidation = { errors: [], warnings: [] };
		currentEditorSection = resolveInitialEditorSection(currentParseIssueCount);
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
					message.data.headerChecksum ?? null,
					message.data.computedChecksum ?? null,
					message.data.sourceFileSize ?? null,
					message.data.sourcePath ?? null
				);
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
				onToggleAdvancedSaveOptions={setAdvancedSaveOptionsEnabled}
				onSelectCompatibilityTargetVersion={setSelectedCompatibilityTargetVersion}
				onSave={saveCharacter}
				onRestore={restoreToBaseline}
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
