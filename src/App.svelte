<script lang="ts">
	import { Message } from "$lib/utils/appMessage";
	import {
		initialize as initializeSettings,
		apply as applySettings,
		get as getSetting,
		Key as SettingKey,
	} from "$lib/utils/settings";
	import { getChangeReview } from "$lib/editor/status/changes";
	import { editorState } from "$lib/editor/editorState.svelte";

	import AppLayout from "$lib/layout/AppLayout.svelte";
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import Sidebar from "$lib/layout/Sidebar.svelte";
	import SessionBar from "$lib/layout/SessionBar.svelte";

	import Library from "$lib/library/Library.svelte";
	import NewCharacter from "$lib/newCharacter/NewCharacter.svelte";
	import Settings from "$lib/settings/Settings.svelte";
	import EditorWorkspace from "$lib/editor/EditorWorkspace.svelte";

	import type { OpenedSessionData } from "$lib/editor/session";
	import type { AppMessage } from "$lib/utils/appMessage";
	import type { ParseMode } from "$lib/types/backend";

	const Screen = {
		Library: "library",
		NewCharacter: "newCharacter",
		Editor: "editor",
		Settings: "settings",
	} as const;
	type Screen = (typeof Screen)[keyof typeof Screen];

	const Section = {
		Status: "status",
		Save: "save",
		Character: "character",
		Skills: "skills",
		Waypoints: "waypoints",
		Quests: "quests",
		Mercenary: "mercenary",
	} as const;
	type Section = (typeof Section)[keyof typeof Section];

	const editorSidebarItems = [
		{ id: Section.Character, label: "Character" },
		{ id: Section.Skills, label: "Skills" },
		{ id: Section.Waypoints, label: "Waypoints" },
		{ id: Section.Quests, label: "Quests" },
		{ id: Section.Mercenary, label: "Mercenary" },
		{ id: Section.Save, label: "Save", dividerBefore: true },
		{ id: Section.Status, label: "Status" },
	] as const;

	let currentScreen = $state<Screen>(Screen.Library);
	let settingsOriginScreen = $state<Screen>(Screen.Library);
	let currentSection = $state<Section>(Section.Status);

	let leaveConfirmOpen = $state(false);
	let leaveDestination = $state<Screen | null>(null);

	const hasOpenSession = $derived(editorState.hasOpenSession);

	const activeSidebarItem = $derived.by(() => {
		if (currentScreen === Screen.Settings) {
			return null;
		}

		return hasOpenSession ? currentSection : currentScreen;
	});

	const saveSidebarStatus = $derived.by(() => {
		const session = editorState.session;
		if (session == null) {
			return undefined;
		}

		if (editorState.isSaveBlocked) {
			return "blocked" as const;
		}

		const hasValidationWarnings = session.validationReport.issues.some(
			(issue) => !issue.blocking,
		);
		const hasCompatibilityWarnings = session.compatibilityIssues.some(
			(issue) => !issue.blocking,
		);

		if (
			hasValidationWarnings ||
			hasCompatibilityWarnings
		) {
			return "warning" as const;
		}

		return undefined;
	});

	const sidebarItems = $derived.by(() => {
		if (!hasOpenSession) {
			return [];
		}

		return editorSidebarItems.map((item) =>
			item.id === Section.Save ? { ...item, saveStatus: saveSidebarStatus } : item,
		);
	});

	initializeSettings().then(() => {
		applySettings();
		editorState.setParseMode(getSetting(SettingKey.ParseMode));
	});

	void editorState.loadOutputFormatOptions();

	function openSession(openedSessionData: OpenedSessionData): void {
		editorState.open(openedSessionData);
		currentSection = openedSessionData.parseIssueCount > 0 ? Section.Status : Section.Character;
		currentScreen = Screen.Editor;
	}

	function closeSession(nextScreen: Screen = Screen.Library): void {
		editorState.close();
		currentSection = Section.Status;
		currentScreen = nextScreen;
	}

	function requestLeaveEditor(nextScreen: Screen): void {
		const session = editorState.session;
		if (session == null) {
			currentScreen = nextScreen;
			return;
		}

		const changeReview = getChangeReview(session.baselineSave, session.save);
		if (changeReview.totalChanges < 1) {
			closeSession(nextScreen);
			return;
		}

		leaveDestination = nextScreen;
		leaveConfirmOpen = true;
	}

	function cancelLeave(): void {
		leaveConfirmOpen = false;
		leaveDestination = null;
	}

	function confirmLeave(): void {
		leaveConfirmOpen = false;

		if (leaveDestination != null) {
			closeSession(leaveDestination);
		}

		leaveDestination = null;
	}

	function toggleSettings(): void {
		if (currentScreen === Screen.Settings) {
			currentScreen = hasOpenSession ? Screen.Editor : settingsOriginScreen;
			return;
		}

		settingsOriginScreen =
			currentScreen === Screen.Editor && hasOpenSession ? Screen.Editor : currentScreen;
		currentScreen = Screen.Settings;
	}

	function selectSidebarItem(itemId: Screen | Section): void {
		if (hasOpenSession) {
			currentSection = itemId as Section;
			currentScreen = Screen.Editor;
			return;
		}

		currentScreen = itemId as Screen;
	}

	async function onMessage(nextMessage: AppMessage): Promise<void> {
		switch (nextMessage.id) {
			case Message.CharacterUnpicked:
				closeSession();
				break;
			case Message.CharacterPicked:
				openSession(nextMessage.data);
				break;
			case Message.SaveFile:
				if (hasOpenSession) {
					try {
						await editorState.save();
					} catch {
						// save workflow already reports errors
					}
				}
				break;
		}
	}
</script>

<AppLayout showSidebar={true} showTopbar={true}>
	{#snippet topbar()}
		{#if hasOpenSession && (currentScreen === Screen.Editor || (currentScreen === Screen.Settings && settingsOriginScreen === Screen.Editor))}
			<SessionBar />
		{:else}
			<h2 class="m-0 text-base font-bold tracking-label">
				{currentScreen === Screen.Library
					? "Library"
					: currentScreen === Screen.NewCharacter
						? "New Character"
						: "Halbu Editor"}
			</h2>
		{/if}
	{/snippet}

	{#snippet sidebar()}
		<Sidebar
			items={sidebarItems}
			activeId={activeSidebarItem}
			libraryActive={currentScreen === Screen.Library}
			newCharacterActive={currentScreen === Screen.NewCharacter}
			settingsActive={currentScreen === Screen.Settings}
			onSelect={selectSidebarItem}
			onLibrary={() => requestLeaveEditor(Screen.Library)}
			onNewCharacter={() => requestLeaveEditor(Screen.NewCharacter)}
			onSettings={toggleSettings}
		/>
	{/snippet}

	{#if currentScreen === Screen.Settings}
		<Settings
			parseMode={editorState.parseMode}
			onParseModeChange={(nextMode: ParseMode) => {
				editorState.setParseMode(nextMode);
			}}
		/>
	{:else if currentScreen === Screen.Library}
		<Library parseMode={editorState.parseMode} onmessage={onMessage} />
	{:else if currentScreen === Screen.NewCharacter}
		<NewCharacter
			outputFormatOptions={editorState.outputFormatOptions}
			onmessage={onMessage}
		/>
	{:else if hasOpenSession}
		<EditorWorkspace {currentSection} />
	{/if}

	<ConfirmDialog
		open={leaveConfirmOpen}
		title="Discard unsaved changes?"
		message="Leaving the editor now will discard current unsaved changes."
		confirmLabel="Leave without saving"
		cancelLabel="Cancel"
		confirmVariant="destructive"
		onConfirm={confirmLeave}
		onCancel={cancelLeave}
	/>
</AppLayout>
