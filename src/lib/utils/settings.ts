import { homeDir, resolve } from "@tauri-apps/api/path";
import { type } from "@tauri-apps/plugin-os";
import { LazyStore } from "@tauri-apps/plugin-store";
import { readonly, writable } from "svelte/store";

const store = new LazyStore("settings.json");

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

export type SettingKey = (typeof Key)[keyof typeof Key];
export type Theme = "auto" | "light" | "dark";
export type ParseMode = "lax" | "strict";
export type Settings = {
	[Key.Theme]: Theme;
	[Key.ParseMode]: ParseMode;
	[Key.SaveFolder]: string;
	[Key.BackupsEnabled]: boolean;
	[Key.BackupsPerCharacter]: number;
	[Key.QuestsAdvancedFlags]: boolean;
	[Key.QuestsAdvancedAllQuests]: boolean;
	[Key.QuestsShowPrologue]: boolean;
};

const keys = Object.values(Key) as SettingKey[];
const baseSettings: Settings = {
	[Key.Theme]: "auto",
	[Key.ParseMode]: "lax",
	[Key.SaveFolder]: "",
	[Key.BackupsEnabled]: true,
	[Key.BackupsPerCharacter]: 20,
	[Key.QuestsAdvancedFlags]: false,
	[Key.QuestsAdvancedAllQuests]: false,
	[Key.QuestsShowPrologue]: false,
};

let initialized = false;
let values: Settings = { ...baseSettings };
let defaults: Settings | null = null;
let initializePromise: Promise<void> | null = null;

const storeValues = writable<Settings>({ ...values });
export const settingsStore = readonly(storeValues);

function publish(): void {
	storeValues.set({ ...values });
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalize(key: SettingKey, value: unknown, fallback: Settings): Settings[SettingKey] {
	switch (key) {
		case Key.Theme:
			return value === "auto" || value === "light" || value === "dark"
				? value
				: fallback[key];
		case Key.ParseMode:
			return value === "lax" || value === "strict" ? value : fallback[key];
		case Key.SaveFolder:
			return typeof value === "string" ? value : fallback[key];
		case Key.BackupsEnabled:
		case Key.QuestsAdvancedFlags:
		case Key.QuestsAdvancedAllQuests:
		case Key.QuestsShowPrologue:
			return normalizeBoolean(value, fallback[key]);
		case Key.BackupsPerCharacter:
			return normalizePositiveInteger(value, fallback[key]);
	}
}

async function getDefaultSaveFolder(): Promise<string> {
	if ((await type()) !== "windows") {
		return "";
	}

	return resolve(await homeDir(), "Saved Games", "Diablo II Resurrected");
}

async function getDefaults(): Promise<Settings> {
	if (defaults != null) {
		return defaults;
	}

	defaults = {
		...baseSettings,
		[Key.SaveFolder]: await getDefaultSaveFolder(),
	};
	return defaults;
}

function getTheme(theme: Theme): "light" | "dark" {
	if (theme === "auto") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}

	return theme;
}

export async function apply(): Promise<void> {
	document.documentElement.setAttribute("data-bs-theme", getTheme(get(Key.Theme)));
}

export async function initialize(): Promise<void> {
	if (initialized) {
		return;
	}

	if (initializePromise != null) {
		await initializePromise;
		return;
	}

	initializePromise = (async () => {
		const fallback = await getDefaults();
		const nextValues: Settings = { ...fallback };
		const next = nextValues as Record<SettingKey, Settings[SettingKey]>;

		for (const key of keys) {
			const hasValue = await store.has(key);
			const rawValue = hasValue ? await store.get(key) : fallback[key];
			const nextValue = normalize(key, rawValue, fallback);

			next[key] = nextValue;
			if (!hasValue || nextValue !== rawValue) {
				await store.set(key, nextValue);
			}
		}

		await store.save();
		values = nextValues;
		initialized = true;
		publish();
	})();

	try {
		await initializePromise;
	} finally {
		initializePromise = null;
	}
}

export function get<K extends SettingKey>(key: K): Settings[K] {
	return values[key];
}

export async function set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
	if (!initialized) {
		await initialize();
	}

	const fallback = await getDefaults();
	const nextValue = normalize(key, value, fallback) as Settings[K];

	values[key] = nextValue;
	await store.set(key, nextValue);
	await store.save();
	publish();
}

if (typeof window !== "undefined") {
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		void apply();
	});
}
