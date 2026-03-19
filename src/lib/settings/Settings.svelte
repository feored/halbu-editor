<script>
	import { message, open } from "@tauri-apps/plugin-dialog";
	import { invoke } from "@tauri-apps/api/core";
	import Button from "$lib/components/ui/button/button.svelte";
	import * as Settings from "$lib/utils/settings";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { toPositiveInteger } from "$lib/utils/numbers";
	import { onMount } from "svelte";
	import { getVersion } from "@tauri-apps/api/app";

	let { parseMode = "lax", onParseModeChange } = $props();

	let appVersion = $state("");
	let currentSettings = $state({});
	let backupAllInProgress = $state(false);
	onMount(() => {
		const unsubscribe = Settings.settingsStore.subscribe((nextSettings) => {
			currentSettings = nextSettings;
		});
		getVersion().then((version) => {
			appVersion = version;
		});
		return unsubscribe;
	});

	const setSaveFolder = async () => {
		try {
			const selectedPath = await open({
				multiple: false,
				directory: true,
				title: "Set D2R Save Folder",
			});
			await Settings.set(Settings.Key.SaveFolder, selectedPath == null ? "" : selectedPath);
		} catch (err) {
			await message(getErrorMessage(err, "Failed to set save folder."), {
				title: "Settings",
				kind: "error",
			});
		}
	};

	async function setTheme(event) {
		await Settings.set(Settings.Key.Theme, event.currentTarget.value);
		await Settings.apply();
	}

	async function setParseMode(event) {
		const nextParseMode = event.currentTarget.value === "strict" ? "strict" : "lax";
		await Settings.set(Settings.Key.ParseMode, nextParseMode);
		onParseModeChange(nextParseMode);
	}

	async function setQuestsAdvancedFlags(event) {
		await Settings.set(Settings.Key.QuestsAdvancedFlags, event.target.checked);
	}

	async function setBackupsEnabled(event) {
		await Settings.set(Settings.Key.BackupsEnabled, event.target.checked);
	}

	async function setBackupsPerCharacter(event) {
		const normalized = toPositiveInteger(event.currentTarget.value, 20);
		await Settings.set(Settings.Key.BackupsPerCharacter, normalized);
	}

	async function openBackupFolder() {
		try {
			await invoke("open_backup_folder");
		} catch (error) {
			await message(getErrorMessage(error, "Failed to open backup folder."), {
				title: "Backups",
				kind: "error",
			});
		}
	}

	async function backupAllDetectedSaves() {
		const saveFolder = (currentSettings[Settings.Key.SaveFolder] ?? "").trim();
		if (saveFolder.length === 0) {
			await message("Set a save folder first, then run backup-all.", {
				title: "Backups",
				kind: "warning",
			});
			return;
		}

		const backupsPerCharacter = toPositiveInteger(
			currentSettings[Settings.Key.BackupsPerCharacter],
			20,
		);

		backupAllInProgress = true;
		try {
			/** @type {import("$lib/types/editor").BackupAllDetectedSavesResult} */
			const result = await invoke("backup_all_detected_saves", {
				folderPath: saveFolder,
				parseMode,
				backupsPerCharacter,
			});
			const summary = [
				`Detected saves: ${result.detectedFiles}`,
				`Backed up: ${result.backedUp}`,
				`Skipped (unchanged): ${result.skippedUnchanged}`,
				`Failed: ${result.failed}`,
			].join("\n");
			const hasWarnings = result.failed > 0 || result.cleanupWarnings.length > 0;
			await message(summary, {
				title: "Backup All Detected Saves",
				kind: hasWarnings ? "warning" : "info",
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
			backupAllInProgress = false;
		}
	}

	async function setQuestsAdvancedAllQuests(event) {
		if (!currentSettings[Settings.Key.QuestsAdvancedFlags]) {
			return;
		}
		await Settings.set(Settings.Key.QuestsAdvancedAllQuests, event.target.checked);
	}

	async function setQuestsShowPrologue(event) {
		await Settings.set(Settings.Key.QuestsShowPrologue, event.target.checked);
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
							onchange={setTheme}
							checked={currentSettings[Settings.Key.Theme] === "auto"}
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
							onchange={setTheme}
							checked={currentSettings[Settings.Key.Theme] === "light"}
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
							onchange={setTheme}
							checked={currentSettings[Settings.Key.Theme] === "dark"}
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
					value={currentSettings[Settings.Key.ParseMode] ?? parseMode}
					onchange={setParseMode}
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
					<Button onclick={setSaveFolder}>Set Save Folder</Button>
					<input
						id="settings-save-folder"
						type="text"
						class="form-control form-control-readonly"
						value={currentSettings[Settings.Key.SaveFolder] ?? ""}
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
						checked={currentSettings[Settings.Key.BackupsEnabled] !== false}
						onchange={setBackupsEnabled}
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
					value={currentSettings[Settings.Key.BackupsPerCharacter] ?? 20}
					onchange={setBackupsPerCharacter}
				/>
			</div>

			<div class="grid gap-1 sm:grid-cols-form-36 sm:items-center sm:gap-x-2.5">
				<div></div>
				<div class="flex flex-wrap gap-1.5">
					<Button variant="secondary" onclick={openBackupFolder}
						>Open Back Up Folder</Button
					>
					<Button onclick={backupAllDetectedSaves} disabled={backupAllInProgress}>
						{backupAllInProgress ? "Backing Up..." : "Back Up All Detected Saves"}
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
						checked={currentSettings[Settings.Key.QuestsAdvancedFlags] == true}
						onchange={setQuestsAdvancedFlags}
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
					!currentSettings[Settings.Key.QuestsAdvancedFlags] ? "opacity-70" : ""
				}`}
			>
				<span class="inline-flex items-center gap-1.5 text-sm text-halbu-text">
					<input
						type="checkbox"
						class="form-check-input mt-0"
						role="switch"
						checked={currentSettings[Settings.Key.QuestsAdvancedAllQuests] == true}
						disabled={!currentSettings[Settings.Key.QuestsAdvancedFlags]}
						id="advanced-all-quests"
						onchange={setQuestsAdvancedAllQuests}
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
						checked={currentSettings[Settings.Key.QuestsShowPrologue] == true}
						onchange={setQuestsShowPrologue}
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
