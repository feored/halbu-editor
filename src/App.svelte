<!-- App.svelte -->
<script>
	import SavePicker from "./lib/SavePicker.svelte";
	import SettingsPage from "./lib/SettingsPage.svelte";
	import { invoke } from "@tauri-apps/api/tauri";
	import { save } from "@tauri-apps/api/dialog";
	import { Message } from "./lib/utils/Message.svelte";
	import {
		initialize as initializeSettings,
		apply as applySettings,
	} from "./lib/utils/Settings.svelte";
	import Character from "./lib/tabs/character/Character.svelte";
	import Mercenary from "./lib/tabs/mercenary/Mercenary.svelte";
	import Waypoints from "./lib/tabs/Waypoints.svelte";
	import Skills from "./lib/tabs/skills/Skills.svelte";
	import Settings from "./lib/SettingsPage.svelte";
	import Quests from "./lib/tabs/quests/Quests.svelte";

	let currentSave = null;
	let validSave = true;

	export const TabID = {
		Home: Symbol("Home"),
		Character: Symbol("Character"),
		Mercenary: Symbol("Mercenary"),
		Skills: Symbol("Skills"),
		Waypoints: Symbol("Waypoints"),
		Quests: Symbol("Quests"),
		Items: Symbol("Items"),
		Settings: Symbol("Settings"),
	};
	const tabs = {
		Character: TabID.Character,
		Mercenary: TabID.Mercenary,
		Skills: TabID.Skills,
		Waypoints: TabID.Waypoints,
		Quests: TabID.Quests,
	};
	let currentTab = TabID.Home;

	initializeSettings().then(() => {
		console.log("Settings initialized.");
		applySettings();
	});

	async function saveCharacter() {
		const filePath = await save({
			defaultPath: currentSave.character.name,
			filters: [
				{
					name: "D2R Save File",
					extensions: ["d2s"],
				},
			],
		});
		let res = await invoke("save_file", {
			path: filePath,
			save: currentSave,
		});
	}

	async function handlePickedCharacter(messageContents) {
		console.log("Character picked: ", messageContents.save);
		currentSave = messageContents.save;
		currentTab = TabID.Character;
	}

	function unpickCharacter() {
		currentSave = null;
	}

	function handleMessages(event) {
		switch (event.detail.id) {
			case Message.CharacterUnpicked:
				unpickCharacter();
				break;
			case Message.CharacterPicked:
				handlePickedCharacter(event.detail.data);
				break;
			case Message.SaveFile:
				saveCharacter();
				break;
		}
	}
</script>

<div class="container-fluid layout p-0">
	<div class="sidebar bg-custom-light border-end p-3">
		<h1 class="text-center display-6 text-primary">Halbu Editor</h1>
		<ul class="nav nav-pills flex-column">
			<li class="nav-item">
				<a
					class="nav-link"
					href="#top"
					class:active={currentTab == TabID.Home}
					on:click={() => {
						currentTab = TabID.Home;
					}}>Home</a
				>
			</li>
			{#each Object.entries(tabs) as [name, id]}
				<li class="nav-item">
					<a
						class:disabled={currentSave == null}
						class="nav-link"
						href="#top"
						class:active={currentTab == id}
						on:click={() => {
							currentTab = id;
						}}>{name}</a
					>
				</li>
			{/each}
			<li class="nav-item">
				<a class="nav-link disabled" href="/items">Items</a>
			</li>
		</ul>
		<ul class="sidebar-footer nav nav-pills flex-column">
			<li class="nav-item">
				<a
					class="nav-link"
					href="#top"
					class:active={currentTab == TabID.Settings}
					on:click={() => {
						currentTab = TabID.Settings;
					}}>Settings</a
				>
			</li>
		</ul>
	</div>
	<div class="p-5">
		{#if currentTab == TabID.Home}
			<SavePicker on:message={handleMessages} />
		{:else if currentTab == TabID.Character}
			<Character bind:validSave save={currentSave} on:message={handleMessages} />
		{:else if currentTab == TabID.Mercenary}
			<Mercenary save={currentSave} />
		{:else if currentTab == TabID.Skills}
			<Skills save={currentSave} />
		{:else if currentTab == TabID.Waypoints}
			<Waypoints save={currentSave} />
		{:else if currentTab == TabID.Settings}
			<Settings />
		{:else if currentTab == TabID.Quests}
			<Quests save={currentSave} />
		{/if}
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: fit-content(20ch) minmax(min(50vw, 30ch), 1fr);
	}

	.sidebar-footer {
		margin-top: auto;
		margin-bottom: 0;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
	}

	.sidebar > ul {
		padding: 0.5em;
	}

	.sidebar > ul > li {
		list-style: none;
	}
</style>
