<script lang="ts">
	import { getVersion } from "@tauri-apps/api/app";
	import { invoke } from "@tauri-apps/api/core";
	import { message, open } from "@tauri-apps/plugin-dialog";
	import { onMount } from "svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { toPositiveInteger } from "$lib/utils/numbers";
	import * as settings from "$lib/utils/settings";

	import type { BackupAllDetectedSavesResult } from "$lib/types/editor";
	import type { ParseMode, Settings as AppSettings, Theme } from "$lib/utils/settings";

	const Key = settings.Key;

	let {
		parseMode = "lax",
		onParseModeChange,
	}: {
		parseMode?: ParseMode;
		onParseModeChange: (mode: ParseMode) => void;
	} = $props();

	let appVersion = $state("");
	let values = $state<AppSettings>({
		[Key.Theme]: settings.get(Key.Theme),
		[Key.ParseMode]: settings.get(Key.ParseMode),
		[Key.SaveFolder]: settings.get(Key.SaveFolder),
		[Key.BackupsEnabled]: settings.get(Key.BackupsEnabled),
		[Key.BackupsPerCharacter]: settings.get(Key.BackupsPerCharacter),
		[Key.QuestsAdvancedFlags]: settings.get(Key.QuestsAdvancedFlags),
		[Key.QuestsAdvancedAllQuests]: settings.get(Key.QuestsAdvancedAllQuests),
		[Key.QuestsShowPrologue]: settings.get(Key.QuestsShowPrologue),
	});
	let backupAllPending = $state(false);

	onMount(() => {
		const unsubscribe = settings.settingsStore.subscribe((nextValues) => {
			values = nextValues;
		});

		void getVersion().then((version) => {
			appVersion = version;
		});

		return unsubscribe;
	});

	async function setTheme(theme: Theme): Promise<void> {
		await settings.set(Key.Theme, theme);
		await settings.apply();
	}

	async function chooseSaveFolder(): Promise<void> {
		try {
			const selectedPath = await open({
				multiple: false,
				directory: true,
				title: "Set D2R Save Folder",
			});
			await settings.set(Key.SaveFolder, selectedPath == null ? "" : selectedPath);
		} catch (error) {
			await message(getErrorMessage(error, "Failed to set save folder."), {
				title: "Settings",
				kind: "error",
			});
		}
	}

	async function openBackupFolder(): Promise<void> {
		try {
			await invoke("open_backup_folder");
		} catch (error) {
			await message(getErrorMessage(error, "Failed to open backup folder."), {
				title: "Backups",
				kind: "error",
			});
		}
	}

	async function backupAllSaves(): Promise<void> {
		const saveFolder = values[Key.SaveFolder].trim();
		if (saveFolder.length === 0) {
			await message("Set a save folder first, then run backup-all.", {
				title: "Backups",
				kind: "warning",
			});
			return;
		}

		backupAllPending = true;

		try {
			const result = await invoke<BackupAllDetectedSavesResult>("backup_all_detected_saves", {
				folderPath: saveFolder,
				parseMode,
				backupsPerCharacter: toPositiveInteger(values[Key.BackupsPerCharacter], 20),
			});
			const summary = [
				`Detected saves: ${result.detectedFiles}`,
				`Backed up: ${result.backedUp}`,
				`Skipped (unchanged): ${result.skippedUnchanged}`,
				`Failed: ${result.failed}`,
			].join("\n");

			await message(summary, {
				title: "Backup All Detected Saves",
				kind: result.failed > 0 || result.cleanupWarnings.length > 0 ? "warning" : "info",
			});

			if (result.cleanupWarnings.length > 0) {
				console.warn("[backup cleanup warning]", result.cleanupWarnings.join(" | "));
			}

			if (result.errors.length > 0) {
				console.warn("[backup failures]", result.errors.join(" | "));
			}
		} catch (error) {
			await message(getErrorMessage(error, "Backup-all failed."), {
				title: "Backups",
				kind: "error",
			});
		} finally {
			backupAllPending = false;
		}
	}
</script>

<div class="grid content-start gap-2.5">
	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">General</h3>
		<div class="grid gap-2">
			<div
				class="grid gap-1 sm:grid-cols-form-36 sm:items-start sm:gap-x-2.5"
				role="group"
				aria-labelledby="theme-label"
			>
				<span id="theme-label" class="form-label mb-0 sm:pt-1">Theme</span>
				<div class="flex flex-wrap gap-1.5">
					<label
						for="auto"
						class="inline-flex items-center gap-1.5 rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1 text-sm text-halbu-text"
					>
						<input
							class="form-check-input mt-0"
							type="radio"
							id="auto"
							name="theme"
							value="auto"
							onchange={() => {
								void setTheme("auto");
							}}
							checked={values[Key.Theme] === "auto"}
						/>
						<span>Automatic</span>
					</label>
					<label
						for="light"
						class="inline-flex items-center gap-1.5 rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1 text-sm text-halbu-text"
					>
						<input
							class="form-check-input mt-0"
							type="radio"
							id="light"
							name="theme"
							value="light"
							onchange={() => {
								void setTheme("light");
							}}
							checked={values[Key.Theme] === "light"}
						/>
						<span>Light theme</span>
					</label>
					<label
						for="dark"
						class="inline-flex items-center gap-1.5 rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1 text-sm text-halbu-text"
					>
						<input
							class="form-check-input mt-0"
							type="radio"
							id="dark"
							name="theme"
							value="dark"
							onchange={() => {
								void setTheme("dark");
							}}
							checked={values[Key.Theme] === "dark"}
						/>
						<span>Dark theme</span>
					</label>
				</div>
			</div>

			<div class="grid gap-1 sm:grid-cols-form-36 sm:items-center sm:gap-x-2.5">
				<label class="form-label mb-0" for="parse-mode-setting">Parse mode</label>
				<select
					id="parse-mode-setting"
					class="form-select"
					value={values[Key.ParseMode] ?? parseMode}
					onchange={(event) => {
						const nextMode =
							(event.currentTarget as HTMLSelectElement).value === "strict"
								? "strict"
								: "lax";
						void settings.set(Key.ParseMode, nextMode);
						onParseModeChange(nextMode);
					}}
				>
					<option value="lax">Lax (default)</option>
					<option value="strict">Strict</option>
				</select>
			</div>
			<p class="form-text m-0 sm:pl-36">
				Controls how save parsing handles malformed data when loading files.
			</p>
		</div>
	</section>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Paths</h3>
		<div class="grid gap-2">
			<div class="grid gap-1 sm:grid-cols-form-36 sm:items-center sm:gap-x-2.5">
				<label class="form-label mb-0" for="settings-save-folder">Save folder</label>
				<div class="grid gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
					<Button onclick={chooseSaveFolder}>Set Save Folder</Button>
					<input
						id="settings-save-folder"
						type="text"
						class="form-control form-control-readonly"
						value={values[Key.SaveFolder]}
						readonly
					/>
				</div>
			</div>

			<div class="grid gap-1 sm:grid-cols-form-36 sm:items-center sm:gap-x-2.5">
				<label class="form-label mb-0" for="settings-backups-enabled">Backups</label>
				<label
					for="settings-backups-enabled"
					class="inline-flex w-fit items-center gap-1.5 rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1.5 text-sm text-halbu-text"
				>
					<input
						id="settings-backups-enabled"
						class="form-check-input mt-0"
						type="checkbox"
						role="switch"
						checked={values[Key.BackupsEnabled]}
						onchange={(event) => {
							void settings.set(
								Key.BackupsEnabled,
								(event.currentTarget as HTMLInputElement).checked,
							);
						}}
					/>
					<span>Enable automatic backups</span>
				</label>
			</div>

			<div class="grid gap-1 sm:grid-cols-form-36 sm:items-center sm:gap-x-2.5">
				<label class="form-label mb-0" for="settings-backups-per-character">
					Backups per character
				</label>
				<input
					id="settings-backups-per-character"
					class="form-control max-w-40"
					type="number"
					min="1"
					step="1"
					value={values[Key.BackupsPerCharacter]}
					onchange={(event) => {
						void settings.set(
							Key.BackupsPerCharacter,
							toPositiveInteger((event.currentTarget as HTMLInputElement).value, 20),
						);
					}}
				/>
			</div>

			<div class="grid gap-1 sm:grid-cols-form-36 sm:items-center sm:gap-x-2.5">
				<div></div>
				<div class="flex flex-wrap gap-1.5">
					<Button variant="secondary" onclick={openBackupFolder}>Open Backup Folder</Button>
					<Button onclick={backupAllSaves} disabled={backupAllPending}>
						{backupAllPending ? "Backing Up..." : "Back Up All Detected Saves"}
					</Button>
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Quests</h3>
		<div class="grid gap-1.5">
			<label
				for="advanced-flags"
				class="grid gap-0.5 rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1.5"
			>
				<span class="inline-flex items-center gap-1.5 text-sm text-halbu-text">
					<input
						class="form-check-input mt-0"
						type="checkbox"
						role="switch"
						id="advanced-flags"
						checked={values[Key.QuestsAdvancedFlags]}
						onchange={(event) => {
							void settings.set(
								Key.QuestsAdvancedFlags,
								(event.currentTarget as HTMLInputElement).checked,
							);
						}}
					/>
					<span>Advanced editing mode</span>
				</span>
				<span class="form-text m-0 pl-6">
					Allows editing quest flags manually. Not recommended unless you know what you
					are doing.
				</span>
			</label>

			<label
				for="advanced-all-quests"
				class={`grid gap-0.5 rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1.5 ${
					!values[Key.QuestsAdvancedFlags] ? "opacity-70" : ""
				}`}
			>
				<span class="inline-flex items-center gap-1.5 text-sm text-halbu-text">
					<input
						type="checkbox"
						class="form-check-input mt-0"
						role="switch"
						checked={values[Key.QuestsAdvancedAllQuests]}
						disabled={!values[Key.QuestsAdvancedFlags]}
						id="advanced-all-quests"
						onchange={(event) => {
							void settings.set(
								Key.QuestsAdvancedAllQuests,
								(event.currentTarget as HTMLInputElement).checked,
							);
						}}
					/>
					<span>Quest display: show unused quests</span>
				</span>
				<span class="form-text m-0 pl-6">
					Shows quest slots that are unused by the game. Requires advanced editing mode.
				</span>
			</label>

			<label
				for="show-prologue"
				class="grid gap-0.5 rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1.5"
			>
				<span class="inline-flex items-center gap-1.5 text-sm text-halbu-text">
					<input
						class="form-check-input mt-0"
						id="show-prologue"
						type="checkbox"
						role="switch"
						checked={values[Key.QuestsShowPrologue]}
						onchange={(event) => {
							void settings.set(
								Key.QuestsShowPrologue,
								(event.currentTarget as HTMLInputElement).checked,
							);
						}}
					/>
					<span>Quest display: show prologue</span>
				</span>
				<span class="form-text m-0 pl-6">
					The prologue is the first quest of each act and controls act introduction flags
					for certain NPCs.
				</span>
			</label>
		</div>
	</section>

	<div class="text-right font-mono text-sm text-halbu-textMuted">Version {appVersion}</div>
</div>
