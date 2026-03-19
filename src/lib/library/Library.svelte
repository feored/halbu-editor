<script lang="ts">
	import { onMount } from "svelte";
	import { open } from "@tauri-apps/plugin-dialog";
	import Button from "$lib/components/ui/button/button.svelte";
	import { Message, buildMessage } from "$lib/utils/appMessage";
	import { invoke } from "@tauri-apps/api/core";
	import * as settings from "$lib/utils/settings";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { AlertCircleIcon } from "lucide-svelte";
	import { toOpenedSessionData } from "$lib/types/converters";
	import { DISPLAY_EXPANSION_TYPE, DISPLAY_GAME_EDITION } from "$lib/types/editor";
	import type { BackendOpenSaveResult } from "$lib/types/backend";

	let { onmessage, parseMode = "lax" } = $props();

	function dispatchMessage(id, data) {
		onmessage(buildMessage(id, data));
	}

	onMount(() => {
		settings
			.initialize()
			.then(() => getExistingCharacters())
			.catch((err) => {
				libraryError = `Failed to initialize settings: ${getErrorMessage(err, "unknown error")}`;
			})
			.finally(() => {
				loading = false;
			});
	});

	let loading = $state(true);
	let saveFolderSet = $state(false);
	let saveFilesFound = $state([]);
	let currentSaveDirectory = $state("");
	let filterText = $state("");
	let libraryError = $state("");

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
			const response = await invoke<BackendOpenSaveResult>(
				"get_character_from_path_with_meta",
				{
					path: path,
					parseMode,
				},
			);
			dispatchMessage(Message.CharacterPicked, toOpenedSessionData(response, path));
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
			/** @type {import("$lib/types/editor").SaveSummary[]} */
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
	<div class="mb-4 flex flex-wrap items-end gap-2">
		<div class="flex gap-2">
			<Button class="font-semibold" onclick={readFileContents}>Open File</Button>
			<Button variant="secondary" onclick={getExistingCharacters}>Refresh Folder</Button>
		</div>
		<div class="w-full sm:w-56">
			<label class="form-label mb-1" for="library-filter">Search</label>
			<input
				id="library-filter"
				class="form-control"
				type="text"
				placeholder="Filter saves"
				bind:value={filterText}
			/>
		</div>
		<div class="min-w-0 flex-1">
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
		<div
			class="rounded border border-halbu-warning bg-halbu-warningSoft p-2 text-sm text-halbu-warning"
		>
			{libraryError}
		</div>
	{/if}

	{#if loading}
		<!-- waiting for settings + folder scan -->
	{:else if !saveFolderSet}
		<div class="m-3 rounded-sm bg-halbu-warningSoft p-3 text-center text-halbu-warning">
			<div class="flex items-center gap-1">
				<AlertCircleIcon />&nbsp;Set a designated save folder in the settings to easily pick
				from existing characters.
			</div>
		</div>
	{:else if saveFilesFound.length < 1}
		<div class="m-3 rounded-sm bg-halbu-warningSoft p-3 text-center text-halbu-warning">
			<div class="flex items-center gap-1">
				<AlertCircleIcon />&nbsp;Found no valid .d2s files in save folder.
			</div>
		</div>
	{:else}
		<table class="w-full border-collapse library-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Class</th>
					<th>Level</th>
					<th>Mode</th>
					<th>Expansion</th>
					<th>Edition</th>
					<th>Version</th>
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
						<td>
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
						<td class="text-halbu-textMuted">{saveFile.className ?? "-"}</td>
						<td class="font-medium">{saveFile.level ?? "-"}</td>
						<td>
							{#if saveFile.hardcore === true}
								<span class="font-medium text-halbu-danger">Hardcore</span>
							{:else if saveFile.hardcore === false}
								<span class="text-halbu-textMuted">Softcore</span>
							{:else}
								<span class="text-halbu-textMuted">Unknown</span>
							{/if}
						</td>
						<td class="text-halbu-textMuted"
							>{saveFile.expansionType != null
								? DISPLAY_EXPANSION_TYPE[saveFile.expansionType]
								: "-"}</td
						>
						<td class="text-halbu-textMuted"
							>{saveFile.gameEdition != null
								? DISPLAY_GAME_EDITION[saveFile.gameEdition]
								: "-"}</td
						>
						<td class="font-mono text-halbu-textDim">{saveFile.formatId ?? "-"}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if filteredSaveFiles.length === 0}
			<div class="rounded-sm bg-halbu-warningSoft p-3 text-center text-halbu-warning">
				No saves matched "{filterText}".
			</div>
		{/if}
	{/if}
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
		font-size: 0.825rem;
		line-height: 1.2;
		letter-spacing: 0.005em;
		font-weight: 500;
		color: color-mix(in srgb, var(--halbu-text) 78%, var(--halbu-text-muted));
		text-transform: none;
		padding: 0.5rem;
		border-bottom: 1px solid var(--halbu-border-strong);
	}

	.library-table tbody td {
		padding: 0.625rem 0.5rem;
		border-top: 1px solid var(--halbu-border);
	}

	.library-table tbody tr:nth-of-type(even) > * {
		background: color-mix(in srgb, var(--halbu-panel2) 50%, transparent);
	}

	.library-row {
		cursor: pointer;
		font-size: 0.875rem;
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
