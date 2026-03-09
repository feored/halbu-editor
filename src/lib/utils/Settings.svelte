<script module>
	import { type } from "@tauri-apps/plugin-os";
	import { resolve, homeDir } from "@tauri-apps/api/path";
	import { LazyStore } from "@tauri-apps/plugin-store";
	import * as log from "./Logs.svelte";

	export let initialized = false;
	const store = new LazyStore("settings.json");
	export let cachedSettings = {};

	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply);

	export const Key = {
		Theme: "theme",
		ParseMode: "parse_mode",
		SaveFolder: "save_folder",
		QuestsAdvancedFlags: "quests_advanced_flags",
		QuestsAdvancedAllQuests: "quests_advanced_all_quests",
		QuestsShowPrologue: "quests_show_prologue",
	};

	async function getDefaultSettings() {
		let save_folder = "";
		const osType = type();
		if (osType === "windows") {
			const homeDirPath = await homeDir();
			save_folder = await resolve(homeDirPath, "Saved Games", "Diablo II Resurrected");
		}
		return {
			[Key.Theme]: "auto",
			[Key.ParseMode]: "lax",
			[Key.SaveFolder]: save_folder,
			[Key.QuestsAdvancedFlags]: false,
			[Key.QuestsAdvancedAllQuests]: false,
			[Key.QuestsShowPrologue]: false,
		};
	}

	export async function apply() {
		let theme = await get(Key.Theme);
		if (theme === "auto") {
			theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		if (["dark", "light"].includes(theme)) {
			document.querySelector("html").setAttribute("data-bs-theme", theme);
		}
	}

	async function initializeIfNecessary() {
		if (!initialized) {
			await initialize();
		}
	}

	export async function initialize() {
		const defaultSettings = await getDefaultSettings();
		cachedSettings = {};
		let keys = Object.values(Key);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			let present = await store.has(key);
			if (present) {
				cachedSettings[key] = await store.get(key);
			} else {
				cachedSettings[key] = defaultSettings[key];
				await store.set(key, defaultSettings[key]);
			}
		}
		await store.save();
		initialized = true;
	}

	export function has(key) {
		return key in cachedSettings;
	}

	export function get(key) {
		return cachedSettings[key];
	}

	export async function set(key, value) {
		await initializeIfNecessary();
		cachedSettings[key] = value;
		await store.set(key, value);
		await store.save();
	}
</script>
