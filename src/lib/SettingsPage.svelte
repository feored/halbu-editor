<script>
	import { InfoIcon } from "lucide-svelte";
	import { open } from "@tauri-apps/api/dialog";
	import { tooltip } from "./utils/actions.js";
	import * as Settings from "./utils/Settings.svelte";
	import * as log from "./utils/Logs.svelte";

	// Initialize values
	let currentSettings = Settings.cachedSettings;

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

	async function setQuestsAdvancedFlags(event) {
		Settings.set(Settings.Key.QuestsAdvancedFlags, event.target.checked);
		currentSettings[Settings.Key.QuestsAdvancedFlags] = event.target.checked;
	}

	async function setQuestsAdvancedAllQuests(event) {
		if (!currentSettings[Settings.Key.QuestsAdvancedFlags]) {
			return;
		}
		Settings.set(Settings.Key.QuestsAdvancedAllQuests, event.target.checked);
		currentSettings[Settings.Key.QuestsAdvancedAllQuest] = event.target.checked;
	}

	async function setQuestsShowPrologue(event) {
		Settings.set(Settings.Key.QuestsShowPrologue, event.target.checked);
		currentSettings[Settings.Key.QuestsShowPrologue] = event.target.checked;
	}
</script>

<div class="container m-0">
	<h3>Settings</h3>
	<br />
	<h6><b>General</b></h6>
	<div class="row form-check p-0">
		<legend class="col-form-label">Set theme</legend>
		<form class="form-check">
			<input
				type="radio"
				id="auto"
				name="theme"
				value="auto"
				on:change={setTheme}
				checked={currentSettings[Settings.Key.Theme] === "auto"}
			/>
			<label for="auto">Automatic</label>
			<input
				type="radio"
				id="light"
				name="theme"
				value="light"
				on:change={setTheme}
				checked={currentSettings[Settings.Key.Theme] === "light"}
			/>
			<label for="light">Light Theme</label>
			<input
				type="radio"
				id="dark "
				name="theme"
				value="dark"
				on:change={setTheme}
				checked={currentSettings[Settings.Key.Theme] === "dark"}
			/>
			<label for="dark">Dark Theme</label>
		</form>
	</div>
	<div class="input-group mb-3">
		<input
			type="button"
			class="btn btn-primary"
			on:click={setSaveFolder}
			value="Set Save Folder"
		/>
		<input
			type="text"
			class="form-control"
			value={currentSettings[Settings.Key.SaveFolder]}
			readonly
		/>
	</div>
	<hr />
	<h6><b>Quests</b></h6>
	<div class="form-check">
		<input
			class="form-check-input"
			type="checkbox"
			role="switch"
			id="advanced-flags"
			checked={currentSettings[Settings.Key.QuestsAdvancedFlags] == true}
			on:change={setQuestsAdvancedFlags}
		/>
		<label for="advanced-flags">
			<span> Advanced editing mode </span>
			<span
				use:tooltip={{
					content:
						"Allows editing the flags manually for each quest.<br/><i>Not recommended unless you know what you're doing.</i>",
					allowHTML: true,
					placement: "bottom",
					theme: "halbu",
					arrow: true,
					animation: "shift-toward",
					hideOnClick: false,
				}}><InfoIcon size="20" /></span
			>
		</label>
	</div>
	<div class="form-check">
		<input
			type="checkbox"
			class="form-check-input"
			role="switch"
			checked={currentSettings[Settings.Key.QuestsAdvancedAllQuests] == true}
			disabled={!currentSettings[Settings.Key.QuestsAdvancedFlags]}
			id="advanced-all-quests"
			on:change={setQuestsAdvancedAllQuests}
		/>
		<label for="advanced-all-quests"
			><span>Show unused quests</span>
			<span
				use:tooltip={{
					content:
						"Show quest slots unused by the game.<br/><i>Requires advanced editing mode.</i>",
					allowHTML: true,
					placement: "bottom",
					theme: "halbu",
					arrow: true,
					animation: "shift-toward",
					hideOnClick: false,
				}}><InfoIcon size="20" /></span
			></label
		>
	</div>
	<div class="form-check">
		<input
			class="form-check-input"
			id="show-prologue"
			type="checkbox"
			role="switch"
			checked={currentSettings[Settings.Key.QuestsShowPrologue] == true}
			on:change={setQuestsShowPrologue}
		/>
		<label for="show-prologue">
			<span> Show Prologue</span>
			<span
				use:tooltip={{
					content:
						"The prologue is the first quest of each act, and it controls whether you have already been introduced to a given act by certain NPCs",
					allowHTML: true,
					placement: "bottom",
					theme: "halbu",
					arrow: true,
					animation: "shift-toward",
					hideOnClick: false,
				}}><InfoIcon size="20" /></span
			>
		</label>
	</div>
</div>
