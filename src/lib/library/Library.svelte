<script>
	import { onMount } from "svelte";
	import { open } from "@tauri-apps/plugin-dialog";
	import Button from "../components/ui/button/button.svelte";
	import { Message, buildMessage } from "../utils/Message.svelte";
	import { invoke } from "@tauri-apps/api/core";
	import * as settings from "../utils/settings";
	import { getErrorMessage } from "../utils/errorMessage.js";
	import { AlertCircleIcon } from "lucide-svelte";
	import {
		toEditorOpenPayload,
		toEditorSave,
	} from "../types/editorPayload";
	import {
		KNOWN_SAVE_VERSIONS,
		DEFAULT_NEW_SAVE_VERSION,
		getSupportedClass,
		getSupportedClasses,
	} from "../utils/GameSupport";

	let { onmessage, parseMode = "lax" } = $props();

	function dispatchMessage(id, data) {
		onmessage(buildMessage(id, data));
	}

	onMount(() => {
		settings
			.initialize()
			.then(() => {
				getExistingCharacters();
			})
			.catch((err) => {
				libraryError = `Failed to initialize settings: ${getErrorMessage(err, "unknown error")}`;
			});
	});

	let saveFolderSet = $state(false);
	let saveFilesFound = $state([]);
	let currentSaveDirectory = $state("");
	let filterText = $state("");
	let libraryError = $state("");

	let selectedVersion = $state(DEFAULT_NEW_SAVE_VERSION);
	let selectedClass = $state(getSupportedClass(DEFAULT_NEW_SAVE_VERSION, null));
	const availableClasses = $derived(getSupportedClasses(selectedVersion));
	$effect(() => {
		selectedClass = getSupportedClass(selectedVersion, selectedClass);
	});

	async function readFileContents() {
		libraryError = "";
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
			if (selectedPath == null || Array.isArray(selectedPath)) {
				return;
			}
			await loadSavePath(selectedPath);
		} catch (err) {
			libraryError = `Failed to open save picker: ${getErrorMessage(err, "unknown error")}`;
		}
	}

	async function loadSavePath(path) {
		if (path.length === 0) {
			return;
		}

		libraryError = "";
		try {
			/** @type {import("../types/editorPayload").BackendOpenPayloadDto} */
			const response = await invoke("get_character_from_path_with_meta", {
				path: path,
				parseMode,
			});
			dispatchMessage(Message.CharacterPicked, toEditorOpenPayload(response, path));
		} catch (err) {
			libraryError = `Failed to load save file: ${getErrorMessage(err, "unknown error")}`;
		}
	}

	function handleRowKeydown(event, path) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			loadSavePath(path);
		}
	}

	async function newSave() {
		if (selectedClass == null) {
			return;
		}
		libraryError = "";
		try {
			/** @type {import("../types/editorPayload").BackendEditorSaveDto} */
			const response = await invoke("new_save", {
				version: selectedVersion,
				class: selectedClass,
			});
			const newSave = toEditorSave(response);
			dispatchMessage(Message.CharacterPicked, {
				save: newSave,
				parseIssueCount: 0,
				parseIssues: [],
				sourceFileSize: null,
				sourcePath: null,
				headerChecksum: null,
				computedChecksum: null,
				editionHint: null,
				suggestedTargetVersion: null,
				parserLayoutVersion: null,
			});
		} catch (err) {
			libraryError = `Failed to create new save: ${getErrorMessage(err, "unknown error")}`;
		}
	}

	async function getExistingCharacters() {
		libraryError = "";
		const saveFolder = settings.get(settings.Key.SaveFolder);
		currentSaveDirectory = saveFolder;

		if (saveFolder.length < 1) {
			// Empty string is the default
			saveFolderSet = false;
			saveFilesFound = [];
			return;
		}
		try {
			/** @type {import("../types/editor").SaveSummaryEntry[]} */
			const response = await invoke("summary_folder", {
				path: saveFolder,
				parseMode,
			});
			saveFilesFound = response;
			saveFolderSet = true;
		} catch (err) {
			libraryError = `Failed to scan save folder: ${getErrorMessage(err, "unknown error")}`;
			saveFolderSet = false;
		}
	}

	const filteredSaveFiles = $derived.by(() => {
		const query = filterText.trim().toLowerCase();
		if (query.length === 0) {
			return saveFilesFound;
		}
		return saveFilesFound.filter((saveFile) => {
			const name = (saveFile.name ?? "").toLowerCase();
			const className = (saveFile.className ?? "").toLowerCase();
			const edition = (saveFile.gameEdition ?? "").toLowerCase();
			return name.includes(query) || className.includes(query) || edition.includes(query);
		});
	});

</script>

<div class="container m-0">
	<div class="col">
		<div class="row g-2 align-items-end mb-3">
			<div class="col-auto d-flex gap-2">
				<Button class="font-semibold" onclick={readFileContents}>Open File</Button>
				<Button variant="secondary" onclick={getExistingCharacters}>Refresh Folder</Button>
			</div>
			<div class="col-md-3">
				<label class="form-label mb-1" for="library-filter">Search</label>
				<input
					id="library-filter"
					class="form-control"
					type="text"
					placeholder="Filter saves"
					bind:value={filterText}
				/>
			</div>
			<div class="col">
				<label class="form-label mb-1" for="library-directory">Save Directory</label>
				<div
					id="library-directory"
					class="save-directory-field"
					title={currentSaveDirectory}
					aria-readonly="true"
				>
					<span class="save-directory-path">{currentSaveDirectory}</span>
				</div>
			</div>
		</div>

		{#if libraryError.length > 0}
			<div class="rounded border border-halbu-warning bg-halbu-warningSoft p-2 text-sm text-halbu-warning">
				{libraryError}
			</div>
		{/if}

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
			<table class="table library-table">
				<thead>
					<tr>
						<th scope="col" class="form-label mb-0">Name</th>
						<th scope="col" class="form-label mb-0">Class</th>
						<th scope="col" class="form-label mb-0">Level</th>
						<th scope="col" class="form-label mb-0">Mode</th>
						<th scope="col" class="form-label mb-0">Expansion</th>
						<th scope="col" class="form-label mb-0">Edition</th>
						<th scope="col" class="form-label mb-0">Version</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredSaveFiles as saveFile}
						<tr
							class="library-row"
							role="button"
							tabindex="0"
							onclick={() => loadSavePath(saveFile.path)}
							onkeydown={(event) => handleRowKeydown(event, saveFile.path)}
						>
							<td class="py-3">
								<span class="font-semibold text-halbu-text">
									{#if saveFile.title != null && saveFile.title.length > 0}
										{saveFile.title}{" "}
									{/if}
									{#if saveFile.name != null && saveFile.name.length > 0}
										{saveFile.name}
									{:else}
										Corrupted Name
									{/if}
								</span>
							</td>
							<td class="py-3">{saveFile.className ?? "-"}</td>
							<td class="py-3">{saveFile.level ?? "-"}</td>
							<td class="py-3">
								{#if saveFile.hardcore === true}
									<span
										class="inline-flex items-center rounded-full bg-halbu-dangerSoft px-2 py-0.5 text-xs font-semibold text-halbu-danger"
									>
										Hardcore
									</span>
								{:else if saveFile.hardcore === false}
									<span
										class="inline-flex items-center rounded-full bg-halbu-panel2 px-2 py-0.5 text-xs font-semibold text-halbu-textMuted"
									>
										Softcore
									</span>
								{:else}
									<span class="text-halbu-textMuted">Unknown</span>
								{/if}
							</td>
							<td class="py-3">
								<small class="text-halbu-text">{saveFile.expansionType ?? "-"}</small>
							</td>
							<td class="py-3">
								<small class="text-halbu-text">{saveFile.gameEdition ?? "-"}</small>
							</td>
							<td class="py-3">
								<small class="font-monospace text-halbu-text">{saveFile.version ?? "-"}</small>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if filteredSaveFiles.length === 0}
				<div class="text-center text-bg-warning p-3 rounded">
					No saves matched "{filterText}".
				</div>
			{/if}
		{/if}

		<div class="row">
			<div class="col-4">
				<p class="form-text">Create new character</p>
			</div>
			<div class="col-4"></div>
			<div class="col-4 text-end">
				<p class="form-text">New character</p>
				<div class="input-group">
					<select
						class="form-select"
						name="newCharacterVersion"
						id="newCharacterVersion"
						bind:value={selectedVersion}
					>
						{#each KNOWN_SAVE_VERSIONS as version}
							<option value={version}>{version}</option>
						{/each}
					</select>
					<select
						class="form-select"
						name="newCharacter"
						id="newCharacter"
						bind:value={selectedClass}
					>
						{#each availableClasses as className}
							<option value={className}>{className}</option>
						{/each}
					</select>
					<Button onclick={newSave} disabled={selectedClass == null}>New</Button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.save-directory-field {
		min-height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.5rem;
		padding: 0.25rem 0.625rem;
		border: 1px solid var(--halbu-border);
		border-radius: var(--app-radius-sm);
		background: var(--halbu-panel);
		color: var(--halbu-text-muted);
		font-size: 1rem;
		cursor: default;
	}

	.save-directory-path {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.library-table thead th {
		font-size: 0.875rem;
		line-height: 1.2;
		letter-spacing: 0.005em;
		font-weight: 500;
		color: color-mix(in srgb, var(--halbu-text) 78%, var(--halbu-text-muted));
		text-transform: none;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.library-table tbody td {
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
	}

	.library-table tbody tr:nth-of-type(even) > * {
		background: color-mix(in srgb, var(--halbu-panel2) 34%, transparent);
	}

	.library-row {
		cursor: pointer;
	}

	.library-table tbody tr.library-row:hover > * {
		background: color-mix(in srgb, var(--halbu-panel2) 86%, transparent);
	}

	.library-row:focus-visible {
		outline: none;
	}

	.library-row:focus-visible > * {
		box-shadow: inset 0 0 0 1px var(--halbu-primary);
	}
</style>
