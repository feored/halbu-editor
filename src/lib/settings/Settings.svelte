<script>
	import { open } from "@tauri-apps/plugin-dialog";
	import Button from "../components/ui/button/button.svelte";
	import * as Settings from "../utils/Settings.svelte";
	import * as log from "../utils/Logs.svelte";
	import { onMount } from "svelte";
	import { getVersion } from "@tauri-apps/api/app";

	let {
		parseMode = "lax",
		onParseModeChange,
	} = $props();

	let appVersion = $state("");
	onMount(() => {
		getVersion().then((version) => {
			appVersion = version;
		});
	});
	// Initialize values
	let currentSettings = $state(Settings.cachedSettings);

	const setSaveFolder = async () => {
		try {
			const selectedPath = await open({
				multiple: false,
				directory: true,
				title: "Set D2R Save Folder",
			});
			currentSettings[Settings.Key.SaveFolder] = Array.isArray(selectedPath)
				? selectedPath[0]
				: selectedPath;
			await Settings.set(
				Settings.Key.SaveFolder,
				currentSettings[Settings.Key.SaveFolder] == null
					? ""
					: currentSettings[Settings.Key.SaveFolder]
			);
		} catch (err) {
			log.error(err);
		}
	};

	async function setTheme(event) {
		if (event.currentTarget.value == null) {
			return;
		}
		currentSettings[Settings.Key.Theme] = event.currentTarget.value;
		await Settings.set(Settings.Key.Theme, event.currentTarget.value);
		await Settings.apply();
	}

	async function setParseMode(event) {
		const nextParseMode = event.currentTarget.value === "strict" ? "strict" : "lax";
		currentSettings[Settings.Key.ParseMode] = nextParseMode;
		await Settings.set(Settings.Key.ParseMode, nextParseMode);
		onParseModeChange?.(nextParseMode);
	}

	async function setQuestsAdvancedFlags(event) {
		Settings.set(Settings.Key.QuestsAdvancedFlags, event.target.checked);
		currentSettings[Settings.Key.QuestsAdvancedFlags] = event.target.checked;
	}

	async function setQuestsAdvancedAllQuests(event) {
		if (!currentSettings[Settings.Key.QuestsAdvancedFlags]) {
			return;
		}
		Settings.set(Settings.Key.QuestsAdvancedAllQuests, event.target.checked);
		currentSettings[Settings.Key.QuestsAdvancedAllQuests] = event.target.checked;
	}

	async function setQuestsShowPrologue(event) {
		Settings.set(Settings.Key.QuestsShowPrologue, event.target.checked);
		currentSettings[Settings.Key.QuestsShowPrologue] = event.target.checked;
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
					value={currentSettings[Settings.Key.SaveFolder]}
					readonly
				/>
			</div>
		</div>
	</section>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
		<h3 class="editor-card-title mb-[0.34rem]">Editing</h3>
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
