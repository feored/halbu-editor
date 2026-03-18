<script lang="ts">
	import { Message } from "$lib/utils/Message.svelte";
	import {
		initialize as initializeSettings,
		apply as applySettings,
		get as getSetting,
		Key as SettingKey,
	} from "$lib/utils/settings";
	import { buildChangeReview } from "$lib/editor/status/reviewChanges";
	import { editorState } from "$lib/editor/editorState.svelte";

	import AppLayout from "$lib/layout/AppLayout.svelte";
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import Sidebar from "$lib/layout/Sidebar.svelte";
	import TopBar from "$lib/layout/TopBar.svelte";
	import SessionBar from "$lib/layout/SessionBar.svelte";

	import Library from "$lib/library/Library.svelte";
	import NewCharacter from "$lib/newCharacter/NewCharacter.svelte";
	import Settings from "$lib/settings/Settings.svelte";
	import EditorWorkspace from "$lib/editor/EditorWorkspace.svelte";

	import type { OpenedSessionData } from "$lib/editor/editorSession";
	import type { AppMessage } from "$lib/utils/Message.svelte";
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

	let leaveEditorConfirmOpen = $state(false);
	let leaveEditorDestination = $state<Screen | null>(null);

	const hasOpenSession = $derived(editorState.hasOpenSession);

	const activeSidebarItem = $derived.by(() => {
		if (currentScreen === Screen.Settings) {
			return null;
		}

		return hasOpenSession ? currentSection : currentScreen;
	});

	const sidebarItems = $derived.by(() => {
		if (!hasOpenSession) {
			return [];
		}

		return editorSidebarItems;
	});

	initializeSettings().then(() => {
		applySettings();
		editorState.setParseMode(getSetting(SettingKey.ParseMode));
	});

	void editorState.loadOutputFormatOptions();

	function openEditorSession(openedSessionData: OpenedSessionData): void {
		editorState.open(openedSessionData);
		currentSection = openedSessionData.parseIssueCount > 0 ? Section.Status : Section.Character;
		currentScreen = Screen.Editor;
	}

	function closeEditorSession(nextScreen: Screen = Screen.Library): void {
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

		const changeReview = buildChangeReview(session.baselineSave, session.save);
		if (changeReview.totalChanges < 1) {
			closeEditorSession(nextScreen);
			return;
		}

		leaveEditorDestination = nextScreen;
		leaveEditorConfirmOpen = true;
	}

	function cancelLeaveEditor(): void {
		leaveEditorConfirmOpen = false;
		leaveEditorDestination = null;
	}

	function confirmLeaveEditor(): void {
		leaveEditorConfirmOpen = false;

		if (leaveEditorDestination != null) {
			closeEditorSession(leaveEditorDestination);
		}

		leaveEditorDestination = null;
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

	function handleSidebarSelection(itemId: Screen | Section): void {
		if (hasOpenSession) {
			currentSection = itemId as Section;
			currentScreen = Screen.Editor;
			return;
		}

		currentScreen = itemId as Screen;
	}

	async function handleAppMessage(nextMessage: AppMessage): Promise<void> {
		switch (nextMessage.id) {
			case Message.CharacterUnpicked:
				closeEditorSession();
				break;
			case Message.CharacterPicked:
				openEditorSession(nextMessage.data);
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
		{:else if currentScreen === Screen.Library}
			<TopBar title="Library" />
		{:else if currentScreen === Screen.NewCharacter}
			<TopBar title="New Character" />
		{:else}
			<TopBar title="Halbu Editor" />
		{/if}
	{/snippet}

	{#snippet sidebar()}
		<Sidebar
			items={sidebarItems}
			activeId={activeSidebarItem}
			libraryActive={currentScreen === Screen.Library}
			newCharacterActive={currentScreen === Screen.NewCharacter}
			settingsActive={currentScreen === Screen.Settings}
			onSelect={handleSidebarSelection}
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
		<Library parseMode={editorState.parseMode} onmessage={handleAppMessage} />
	{:else if currentScreen === Screen.NewCharacter}
		<NewCharacter outputFormatOptions={editorState.outputFormatOptions} onmessage={handleAppMessage} />
	{:else if hasOpenSession}
		<EditorWorkspace {currentSection} />
	{/if}

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
