<script context="module">
	export const CharacterType = {
		Existing: Symbol("Existing"),
		New: Symbol("New"),
	};
</script>

<script>
	import { onMount } from "svelte";
	import { open, save } from "@tauri-apps/api/dialog";
	import { createEventDispatcher } from "svelte";
	import { Message, buildMessage } from "./utils/Message.svelte";
	import { invoke } from "@tauri-apps/api/tauri";
	import { Class } from "./utils/Constants.svelte";
	import charstats from "../res/charstats.json";
	import { calcTitle } from "./utils/Utils.svelte";
	import * as settings from "./utils/Settings.svelte";
	import { AlertCircleIcon } from "lucide-svelte";

	const dispatch = createEventDispatcher();

	function dispatchMessage(id, data) {
		dispatch("message", buildMessage(id, data));
	}

	onMount(() => {
		const until = (predFn) => {
			const poll = (done) => (predFn() ? done() : setTimeout(() => poll(done), 50));
			return new Promise(poll);
		};
		until(() => {
			return settings.initialized;
		}).then(() => {
			getExistingCharacters();
		});
	});

	let saveFolderSet = false;
	let saveFilesFound = [];

	async function readFileContents() {
		try {
			const selectedPath = await open({
				multiple: false,
				filters: [
					{
						name: "D2R Save File",
						extensions: ["d2s"],
					},
				],
				title: "Open .d2s file",
			});
			await loadSavePath(selectedPath);
		} catch (err) {
			console.error(err);
		}
	}

	async function loadSavePath(path) {
		try {
			let saveFile = await invoke("get_character_from_path", {
				path: path,
			});
			dispatchMessage(Message.CharacterPicked, { save: saveFile });
		} catch (err) {
			console.error(err);
		}
	}

	async function newSave(charClass) {
		let newSave = await invoke("new_save", { class: charClass });
		dispatchMessage(Message.CharacterPicked, { save: newSave });
	}

	async function getExistingCharacters() {
		let saveFolder = await settings.get(settings.Key.SaveFolder);

		if (saveFolder.length < 1) {
			// Empty string is the default
			saveFolderSet = false;
			return;
		}
		try {
			let characters = await invoke("summary_folder", { path: saveFolder });
			saveFilesFound = characters;
			saveFolderSet = true;
		} catch (err) {
			console.error(err);
			saveFolderSet = false;
		}
	}
</script>

<div class="container m-0">
	<div class="col">
		<h3>Select Save</h3>
		{#if !saveFolderSet}
			<div class="text-center text-bg-warning p-3 m-3 rounded">
				<div class="d-flex">
					<AlertCircleIcon />&nbsp;Set a designated save folder in the settings to easily
					pick from existing characters.
				</div>
			</div>
		{:else if saveFilesFound.length < 1}
			<div class="text-center text-bg-warning p-3 m-3 rounded">
				<div class="d-flex">
					<AlertCircleIcon />&nbsp;Found no valid .d2s files in save folder.
				</div>
			</div>
		{:else}
			<table class="table table-striped">
				<tbody>
					{#each saveFilesFound as saveFile}
						<tr>
							<td
								><a
									href="#top"
									role="button"
									aria-pressed="false"
									class="text-decoration-none"
									on:click={() => {
										loadSavePath(saveFile.path);
									}}
									><b class={saveFile.save.character.status.hardcore ? "red" : ""}
										>{calcTitle(saveFile.save.character)}
										{#if saveFile.save.character.name.length > 0}
											{saveFile.save.character.name}
										{:else}
											<i>Corrupted Name</i>
										{/if}
									</b></a
								></td
							>
							<td
								>Level {saveFile.save.character.level}
								{saveFile.save.character.class}</td
							>
							<td>
								{#if saveFile.save.character.status.expansion}
									<small><i>Expansion Character</i></small>
								{:else}
									<small><i>Classic Character</i></small>
								{/if}
							</td>
						</tr>
						<!-- 
							</a> -->
					{/each}
				</tbody>
			</table>
		{/if}
		<div class="row">
			<div class="col-3">
				<p>Manually choose .d2s file</p>
				<button class="btn btn-primary" on:click={readFileContents}
					>Load another save</button
				>
			</div>
			<div class="col-9 text-end">
				<p>New character</p>
				<div class="btn-group">
					{#each Object.keys(Class) as charClass}
						<button
							class="btn btn-primary"
							on:click={() => {
								newSave(charClass);
							}}>{charClass}</button
						>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
