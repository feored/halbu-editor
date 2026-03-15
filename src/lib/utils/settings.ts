import { type } from "@tauri-apps/plugin-os";
import { resolve, homeDir } from "@tauri-apps/api/path";
import { LazyStore } from "@tauri-apps/plugin-store";
import { readonly, writable } from "svelte/store";

export let initialized = false;
const settingsStoreFile = new LazyStore("settings.json");

export const Key = {
	Theme: "theme",
	ParseMode: "parse_mode",
	SaveFolder: "save_folder",
	BackupsEnabled: "backups_enabled",
	BackupsPerCharacter: "backups_per_character",
	QuestsAdvancedFlags: "quests_advanced_flags",
	QuestsAdvancedAllQuests: "quests_advanced_all_quests",
	QuestsShowPrologue: "quests_show_prologue",
} as const;

type SettingKey = (typeof Key)[keyof typeof Key];
type ThemeSetting = "auto" | "light" | "dark";
type ParseModeSetting = "lax" | "strict";
type KnownSettings = {
	[Key.Theme]: ThemeSetting;
	[Key.ParseMode]: ParseModeSetting;
	[Key.SaveFolder]: string;
	[Key.BackupsEnabled]: boolean;
	[Key.BackupsPerCharacter]: number;
	[Key.QuestsAdvancedFlags]: boolean;
	[Key.QuestsAdvancedAllQuests]: boolean;
	[Key.QuestsShowPrologue]: boolean;
};
type SettingsRecord = Record<string, unknown>;

const SETTING_KEYS = Object.values(Key) as SettingKey[];
const SETTING_KEY_SET = new Set<SettingKey>(SETTING_KEYS);
const settingsState: {
	cachedSettings: SettingsRecord;
	defaultSettings: KnownSettings | null;
	initializationPromise: Promise<void> | null;
} = {
	cachedSettings: {},
	defaultSettings: null,
	initializationPromise: null,
};
const settingsStoreWritable = writable<SettingsRecord>({});
export const settingsStore = readonly(settingsStoreWritable);

const THEMES = new Set<ThemeSetting>(["auto", "light", "dark"]);
const PARSE_MODES = new Set<ParseModeSetting>(["lax", "strict"]);

function isSettingKey(value: string): value is SettingKey {
	return SETTING_KEY_SET.has(value as SettingKey);
}

function publishSettings() {
	settingsStoreWritable.set({ ...settingsState.cachedSettings });
}

function normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
	return typeof value === "boolean" ? value : defaultValue;
}

function normalizePositiveInteger(value: unknown, defaultValue: number): number {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

const NORMALIZE_BY_KEY: {
	[K in SettingKey]: (value: unknown, defaultValue: KnownSettings[K]) => KnownSettings[K];
} = {
	[Key.Theme]: (value, defaultValue) =>
		typeof value === "string" && THEMES.has(value as ThemeSetting)
			? (value as ThemeSetting)
			: defaultValue,
	[Key.ParseMode]: (value, defaultValue) =>
		typeof value === "string" && PARSE_MODES.has(value as ParseModeSetting)
			? (value as ParseModeSetting)
			: defaultValue,
	[Key.SaveFolder]: (value, defaultValue) =>
		typeof value === "string" ? value : defaultValue,
	[Key.BackupsEnabled]: normalizeBoolean,
	[Key.BackupsPerCharacter]: normalizePositiveInteger,
	[Key.QuestsAdvancedFlags]: normalizeBoolean,
	[Key.QuestsAdvancedAllQuests]: normalizeBoolean,
	[Key.QuestsShowPrologue]: normalizeBoolean,
};

function normalizeKnownSettingValue<K extends SettingKey>(
	key: K,
	value: unknown,
	defaultSettings: KnownSettings,
): KnownSettings[K] {
	return NORMALIZE_BY_KEY[key](value, defaultSettings[key]);
}

function normalizeSettingValue(
	key: string,
	value: unknown,
	defaultSettings: KnownSettings,
): unknown {
	if (!isSettingKey(key)) {
		return value;
	}
	return normalizeKnownSettingValue(key, value, defaultSettings);
}

async function getDefaultSaveFolder(): Promise<string> {
	const osType = await type();
	if (osType !== "windows") {
		return "";
	}
	const homeDirPath = await homeDir();
	return resolve(homeDirPath, "Saved Games", "Diablo II Resurrected");
}

async function getDefaultSettings(): Promise<KnownSettings> {
	if (settingsState.defaultSettings != null) {
		return settingsState.defaultSettings;
	}
	const defaultSettings: KnownSettings = {
		[Key.Theme]: "auto",
		[Key.ParseMode]: "lax",
		[Key.SaveFolder]: await getDefaultSaveFolder(),
		[Key.BackupsEnabled]: true,
		[Key.BackupsPerCharacter]: 20,
		[Key.QuestsAdvancedFlags]: false,
		[Key.QuestsAdvancedAllQuests]: false,
		[Key.QuestsShowPrologue]: false,
	};
	settingsState.defaultSettings = defaultSettings;
	return defaultSettings;
}

function getEffectiveTheme(themeSetting: unknown): unknown {
	if (themeSetting === "auto") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}
	return themeSetting;
}

export async function apply() {
	const theme = getEffectiveTheme(get(Key.Theme));
	if (theme === "dark" || theme === "light") {
		document.documentElement.setAttribute("data-bs-theme", theme);
	}
}

async function initializeSettings() {
	const defaultSettings = await getDefaultSettings();
	const nextSettings: SettingsRecord = {};
	for (const key of SETTING_KEYS) {
		const hasStoredValue = await settingsStoreFile.has(key);
		const rawValue = hasStoredValue
			? await settingsStoreFile.get(key)
				: defaultSettings[key];
		const normalizedValue = normalizeSettingValue(key, rawValue, defaultSettings);
		nextSettings[key] = normalizedValue;
		if (!hasStoredValue || normalizedValue !== rawValue) {
			await settingsStoreFile.set(key, normalizedValue);
		}
	}
	await settingsStoreFile.save();
	settingsState.cachedSettings = nextSettings;
	initialized = true;
	publishSettings();
}

export async function initialize() {
	if (initialized) {
		return;
	}
	if (settingsState.initializationPromise != null) {
		await settingsState.initializationPromise;
		return;
	}
	settingsState.initializationPromise = initializeSettings();
	try {
		await settingsState.initializationPromise;
	} finally {
		settingsState.initializationPromise = null;
	}
}

async function initializeIfNecessary() {
	if (!initialized) {
		await initialize();
	}
}

export function get<K extends SettingKey>(key: K): KnownSettings[K];
export function get(key: string): unknown;
export function get(key: string): unknown {
	return settingsState.cachedSettings[key];
}

export async function set<K extends SettingKey>(
	key: K,
	value: KnownSettings[K],
): Promise<void>;
export async function set(key: string, value: unknown): Promise<void>;
export async function set(key: string, value: unknown): Promise<void> {
	await initializeIfNecessary();
	const defaultSettings = await getDefaultSettings();
	const normalizedValue = normalizeSettingValue(key, value, defaultSettings);
	settingsState.cachedSettings[key] = normalizedValue;
	await settingsStoreFile.set(key, normalizedValue);
	await settingsStoreFile.save();
	publishSettings();
}

if (typeof window !== "undefined") {
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		void apply();
	});
}
