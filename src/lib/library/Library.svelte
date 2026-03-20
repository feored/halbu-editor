<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { open } from "@tauri-apps/plugin-dialog";
	import { onMount } from "svelte";
	import { AlertCircleIcon } from "lucide-svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { Message, buildMessage } from "$lib/utils/appMessage";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import * as settings from "$lib/utils/settings";
	import { toOpenedSessionData } from "$lib/editor/session";
	import { DISPLAY_EXPANSION_TYPE, DISPLAY_GAME_EDITION } from "$lib/types/editor";

	import type { BackendOpenSaveResult, ParseMode } from "$lib/types/backend";
	import type { AppMessage } from "$lib/utils/appMessage";
	import type { SaveSummary } from "$lib/types/editor";

	let {
		onmessage,
		parseMode = "lax",
	}: {
		onmessage: (message: AppMessage) => void;
		parseMode?: ParseMode;
	} = $props();

	let loading = $state(true);
	let saveFolder = $state("");
	let saveFiles = $state<SaveSummary[]>([]);
	let filterText = $state("");
	let libraryError = $state("");

	onMount(() => {
		void (async () => {
			try {
				await settings.initialize();
				await refreshFolder();
			} catch (error) {
				libraryError = `Failed to initialize settings: ${getErrorMessage(error, "unknown error")}`;
			} finally {
				loading = false;
			}
		})();
	});

	async function openFile(): Promise<void> {
		libraryError = "";

		try {
			const selectedPath = await open({
				multiple: false,
				filters: [{ name: "D2R Save File", extensions: ["d2s"] }],
				title: "Open .d2s file",
			});

			if (selectedPath == null || Array.isArray(selectedPath)) {
				return;
			}

			await openSave(selectedPath);
		} catch (error) {
			libraryError = `Failed to open save picker: ${getErrorMessage(error, "unknown error")}`;
		}
	}

	async function openSave(path: string): Promise<void> {
		if (path.length === 0) {
			return;
		}

		libraryError = "";

		try {
			const result = await invoke<BackendOpenSaveResult>("get_character_from_path_with_meta", {
				path,
				parseMode,
			});

			onmessage(buildMessage(Message.CharacterPicked, toOpenedSessionData(result, path)));
		} catch (error) {
			libraryError = `Failed to load save file: ${getErrorMessage(error, "unknown error")}`;
		}
	}

	function handleRowKeydown(event: KeyboardEvent, path: string): void {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			void openSave(path);
		}
	}

	async function refreshFolder(): Promise<void> {
		libraryError = "";
		saveFolder = settings.get(settings.Key.SaveFolder);

		if (saveFolder.length < 1) {
			saveFiles = [];
			return;
		}

		try {
			saveFiles = await invoke<SaveSummary[]>("summary_folder", {
				path: saveFolder,
				parseMode,
			});
		} catch (error) {
			libraryError = `Failed to scan save folder: ${getErrorMessage(error, "unknown error")}`;
			saveFiles = [];
		}
	}

	const filteredSaves = $derived.by(() => {
		const query = filterText.trim().toLowerCase();
		if (query.length === 0) {
			return saveFiles;
		}

		return saveFiles.filter((saveFile) => {
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
			<Button class="font-semibold" onclick={openFile}>Open File</Button>
			<Button variant="secondary" onclick={refreshFolder}>Refresh Folder</Button>
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
			<div id="library-directory" class="save-directory-field" title={saveFolder} aria-readonly="true">
				<span class="save-directory-path">{saveFolder}</span>
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
	{:else if saveFolder.length < 1}
		<div class="m-3 rounded-sm bg-halbu-warningSoft p-3 text-center text-halbu-warning">
			<div class="flex items-center gap-1">
				<AlertCircleIcon />
				<span>Set a designated save folder in the settings to easily pick from existing characters.</span>
			</div>
		</div>
	{:else if libraryError.length === 0 && saveFiles.length < 1}
		<div class="m-3 rounded-sm bg-halbu-warningSoft p-3 text-center text-halbu-warning">
			<div class="flex items-center gap-1">
				<AlertCircleIcon />
				<span>Found no valid .d2s files in save folder.</span>
			</div>
		</div>
	{:else if libraryError.length === 0}
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
				{#each filteredSaves as saveFile}
					<tr
						class="library-row"
						role="button"
						tabindex="0"
						onclick={() => {
							void openSave(saveFile.path);
						}}
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
						<td class="text-halbu-textMuted">
							{saveFile.expansionType != null
								? DISPLAY_EXPANSION_TYPE[saveFile.expansionType]
								: "-"}
						</td>
						<td class="text-halbu-textMuted">
							{saveFile.gameEdition != null
								? DISPLAY_GAME_EDITION[saveFile.gameEdition]
								: "-"}
						</td>
						<td class="font-mono text-halbu-textDim">{saveFile.formatId ?? "-"}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if filteredSaves.length === 0}
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
