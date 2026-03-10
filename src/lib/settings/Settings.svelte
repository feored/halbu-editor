<script>
	import { message, open } from "@tauri-apps/plugin-dialog";
	import { invoke } from "@tauri-apps/api/core";
	import Button from "../components/ui/button/button.svelte";
	import * as Settings from "../utils/settings.js";
	import { onMount } from "svelte";
	import { getVersion } from "@tauri-apps/api/app";

	let {
		parseMode = "lax",
		onParseModeChange,
	} = $props();

	let appVersion = $state("");
	let currentSettings = $state({});
	let backupAllInProgress = $state(false);
	onMount(() => {
		const unsubscribe = Settings.settingsStore.subscribe((nextSettings) => {
			currentSettings = nextSettings ?? {};
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
			const resolvedSaveFolder = Array.isArray(selectedPath)
				? selectedPath[0]
				: selectedPath;
			await Settings.set(
				Settings.Key.SaveFolder,
				resolvedSaveFolder == null ? "" : resolvedSaveFolder
			);
		} catch (err) {
			console.error(err);
		}
	};

	async function setTheme(event) {
		if (event.currentTarget.value == null) {
			return;
		}
		await Settings.set(Settings.Key.Theme, event.currentTarget.value);
		await Settings.apply();
	}

	async function setParseMode(event) {
		const nextParseMode = event.currentTarget.value === "strict" ? "strict" : "lax";
		await Settings.set(Settings.Key.ParseMode, nextParseMode);
		onParseModeChange?.(nextParseMode);
	}

	async function setQuestsAdvancedFlags(event) {
		await Settings.set(Settings.Key.QuestsAdvancedFlags, event.target.checked);
	}

	async function setBackupsEnabled(event) {
		await Settings.set(Settings.Key.BackupsEnabled, event.target.checked);
	}

	async function setBackupsPerCharacter(event) {
		const parsed = Number(event.currentTarget.value);
		const normalized = Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 20;
		await Settings.set(Settings.Key.BackupsPerCharacter, normalized);
	}

	async function openBackupFolder() {
		try {
			await invoke("open_backup_folder");
		} catch (error) {
			await message(String(error ?? "Failed to open backup folder."), {
				title: "Backups",
				kind: "error",
			});
		}
	}

	async function backupAllDetectedSaves() {
		const saveFolder = String(currentSettings[Settings.Key.SaveFolder] ?? "").trim();
		if (saveFolder.length === 0) {
			await message("Set a save folder first, then run backup-all.", {
				title: "Backups",
				kind: "warning",
			});
			return;
		}

		const parsed = Number(currentSettings[Settings.Key.BackupsPerCharacter]);
		const backupsPerCharacter =
			Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 20;

		backupAllInProgress = true;
		try {
			const result = await invoke("backup_all_detected_saves", {
				folderPath: saveFolder,
				parseMode,
				backupsPerCharacter,
			});
			const summary = [
				`Detected saves: ${result?.detectedFiles ?? 0}`,
				`Backed up: ${result?.backedUp ?? 0}`,
				`Skipped (unchanged): ${result?.skippedUnchanged ?? 0}`,
				`Failed: ${result?.failed ?? 0}`,
			].join("\n");
			const hasWarnings =
				(result?.failed ?? 0) > 0 || (result?.cleanupWarnings?.length ?? 0) > 0;
			await message(summary, {
				title: "Backup All Detected Saves",
				kind: hasWarnings ? "warning" : "info",
			});
			if ((result?.cleanupWarnings?.length ?? 0) > 0) {
				console.warn("[backup cleanup warning]", result.cleanupWarnings.join(" | "));
			}
			if ((result?.errors?.length ?? 0) > 0) {
				console.warn("[backup failures]", result.errors.join(" | "));
			}
		} catch (error) {
			await message(String(error ?? "Backup-all failed."), {
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

<div class="grid content-start gap-[0.6rem]">
	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
		<h3 class="editor-card-title mb-[0.34rem]">General</h3>
		<div class="grid gap-[0.5rem]">
			<fieldset class="grid gap-[0.24rem]">
				<legend class="form-label mb-0">Theme</legend>
				<div class="flex flex-wrap gap-[0.38rem]">
					<label
						for="auto"
						class="inline-flex items-center gap-[0.36rem] rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.46rem] py-[0.26rem] text-[0.9rem] text-halbu-text"
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
						class="inline-flex items-center gap-[0.36rem] rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.46rem] py-[0.26rem] text-[0.9rem] text-halbu-text"
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
						class="inline-flex items-center gap-[0.36rem] rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.46rem] py-[0.26rem] text-[0.9rem] text-halbu-text"
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
			</fieldset>

			<div class="grid gap-[0.2rem] sm:grid-cols-[8.7rem_minmax(0,1fr)] sm:items-center sm:gap-x-[0.62rem]">
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
			<p class="form-text m-0 sm:pl-[9.32rem]">
				Controls how save parsing handles malformed data when loading files.
			</p>
		</div>
	</section>

		<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
			<h3 class="editor-card-title mb-[0.34rem]">Paths</h3>
			<div class="grid gap-[0.2rem] sm:grid-cols-[8.7rem_minmax(0,1fr)] sm:items-center sm:gap-x-[0.62rem]">
				<label class="form-label mb-0" for="settings-save-folder">Save folder</label>
				<div class="grid gap-[0.36rem] sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
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

			<div
				class="mt-[0.48rem] grid gap-[0.2rem] sm:grid-cols-[8.7rem_minmax(0,1fr)] sm:items-center sm:gap-x-[0.62rem]"
			>
				<label class="form-label mb-0" for="settings-backups-enabled">Backups</label>
				<label
					for="settings-backups-enabled"
					class="inline-flex w-fit items-center gap-[0.42rem] rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.52rem] py-[0.34rem] text-[0.92rem] text-halbu-text"
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

				<div
					class="mt-[0.2rem] grid gap-[0.2rem] sm:grid-cols-[8.7rem_minmax(0,1fr)] sm:items-center sm:gap-x-[0.62rem]"
				>
				<label class="form-label mb-0" for="settings-backups-per-character">
					Backups per character
				</label>
				<input
					id="settings-backups-per-character"
					class="form-control max-w-[9.5rem]"
					type="number"
					min="1"
					step="1"
					value={currentSettings[Settings.Key.BackupsPerCharacter] ?? 20}
					onchange={setBackupsPerCharacter}
				/>
			</div>

			<div
				class="mt-[0.36rem] grid gap-[0.36rem] sm:grid-cols-[8.7rem_minmax(0,1fr)] sm:items-center sm:gap-x-[0.62rem]"
			>
				<div></div>
				<div class="flex flex-wrap gap-[0.36rem]">
					<Button variant="secondary" onclick={openBackupFolder}>Open Back Up Folder</Button>
					<Button onclick={backupAllDetectedSaves} disabled={backupAllInProgress}>
						{backupAllInProgress
							? "Backing Up..."
							: "Back Up All Detected Saves"}
					</Button>
				</div>
			</div>
		</section>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
		<h3 class="editor-card-title mb-[0.34rem]">Quests</h3>
		<div class="grid gap-[0.32rem]">
			<label
				for="advanced-flags"
				class="grid gap-[0.12rem] rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.52rem] py-[0.38rem]"
			>
				<span class="inline-flex items-center gap-[0.42rem] text-[0.92rem] text-halbu-text">
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
				<span class="form-text m-0 pl-[1.62rem]">
					Allows editing quest flags manually. Not recommended unless you know what you are
					doing.
				</span>
			</label>

			<label
				for="advanced-all-quests"
				class={`grid gap-[0.12rem] rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.52rem] py-[0.38rem] ${
					!currentSettings[Settings.Key.QuestsAdvancedFlags] ? "opacity-70" : ""
				}`}
			>
				<span class="inline-flex items-center gap-[0.42rem] text-[0.92rem] text-halbu-text">
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
				<span class="form-text m-0 pl-[1.62rem]">
					Shows quest slots that are unused by the game. Requires advanced editing mode.
				</span>
			</label>

			<label
				for="show-prologue"
				class="grid gap-[0.12rem] rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.52rem] py-[0.38rem]"
			>
				<span class="inline-flex items-center gap-[0.42rem] text-[0.92rem] text-halbu-text">
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
				<span class="form-text m-0 pl-[1.62rem]">
					The prologue is the first quest of each act and controls act introduction flags for
					certain NPCs.
				</span>
			</label>
		</div>
	</section>

	<div class="text-right font-monospace text-[0.82rem] text-halbu-textMuted">Version {appVersion}</div>
</div>
