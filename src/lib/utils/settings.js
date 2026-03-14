import { type } from "@tauri-apps/plugin-os";
import { resolve, homeDir } from "@tauri-apps/api/path";
import { LazyStore } from "@tauri-apps/plugin-store";
import { readonly, writable } from "svelte/store";

export let initialized = false;
const store = new LazyStore("settings.json");
let cachedSettings = {};
let initializationPromise = null;
let defaultSettingsCache = null;
const settingsStoreWritable = writable({});
export const settingsStore = readonly(settingsStoreWritable);

function publishSettings() {
	settingsStoreWritable.set({ ...cachedSettings });
}

if (typeof window !== "undefined") {
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply);
}

export const Key = {
	Theme: "theme",
	ParseMode: "parse_mode",
	SaveFolder: "save_folder",
	BackupsEnabled: "backups_enabled",
	BackupsPerCharacter: "backups_per_character",
	QuestsAdvancedFlags: "quests_advanced_flags",
	QuestsAdvancedAllQuests: "quests_advanced_all_quests",
	QuestsShowPrologue: "quests_show_prologue",
};

const THEMES = new Set(["auto", "light", "dark"]);
const PARSE_MODES = new Set(["lax", "strict"]);

function normalizeBoolean(value, fallback) {
	if (typeof value === "boolean") {
		return value;
	}
	return fallback;
}

function normalizePositiveInteger(value, fallback) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) {
		return fallback;
	}
	return parsed;
}

function normalizeSettingValue(key, value, defaults) {
	switch (key) {
		case Key.Theme:
			return typeof value === "string" && THEMES.has(value) ? value : defaults[Key.Theme];
		case Key.ParseMode:
			return typeof value === "string" && PARSE_MODES.has(value)
				? value
				: defaults[Key.ParseMode];
		case Key.SaveFolder:
			return typeof value === "string" ? value : defaults[Key.SaveFolder];
		case Key.BackupsEnabled:
			return normalizeBoolean(value, defaults[Key.BackupsEnabled]);
		case Key.BackupsPerCharacter:
			return normalizePositiveInteger(value, defaults[Key.BackupsPerCharacter]);
		case Key.QuestsAdvancedFlags:
			return normalizeBoolean(value, defaults[Key.QuestsAdvancedFlags]);
		case Key.QuestsAdvancedAllQuests:
			return normalizeBoolean(value, defaults[Key.QuestsAdvancedAllQuests]);
		case Key.QuestsShowPrologue:
			return normalizeBoolean(value, defaults[Key.QuestsShowPrologue]);
		default:
			return value;
	}
}

async function getDefaultSettings() {
	let save_folder = "";
	const osType = await type();
	if (osType === "windows") {
		const homeDirPath = await homeDir();
		save_folder = await resolve(homeDirPath, "Saved Games", "Diablo II Resurrected");
	}
	return {
		[Key.Theme]: "auto",
		[Key.ParseMode]: "lax",
		[Key.SaveFolder]: save_folder,
		[Key.BackupsEnabled]: true,
		[Key.BackupsPerCharacter]: 20,
		[Key.QuestsAdvancedFlags]: false,
		[Key.QuestsAdvancedAllQuests]: false,
		[Key.QuestsShowPrologue]: false,
	};
}

export async function apply() {
	let theme = get(Key.Theme);
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
	if (initialized) {
		return;
	}
	if (initializationPromise != null) {
		await initializationPromise;
		return;
	}

	initializationPromise = (async () => {
		const defaultSettings = await getDefaultSettings();
		defaultSettingsCache = defaultSettings;
		cachedSettings = {};
		let keys = Object.values(Key);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			let present = await store.has(key);
			let rawValue;
			if (present) {
				rawValue = await store.get(key);
			} else {
				rawValue = defaultSettings[key];
			}
			const normalizedValue = normalizeSettingValue(key, rawValue, defaultSettings);
			cachedSettings[key] = normalizedValue;
			if (!present || normalizedValue !== rawValue) {
				await store.set(key, normalizedValue);
			}
		}
		await store.save();
		initialized = true;
		publishSettings();
	})();

	try {
		await initializationPromise;
	} finally {
		initializationPromise = null;
	}
}

export function get(key) {
	return cachedSettings[key];
}

export async function set(key, value) {
	await initializeIfNecessary();
	if (defaultSettingsCache == null) {
		defaultSettingsCache = await getDefaultSettings();
	}
	const normalizedValue = normalizeSettingValue(key, value, defaultSettingsCache);
	cachedSettings[key] = normalizedValue;
	await store.set(key, normalizedValue);
	await store.save();
	publishSettings();
}
