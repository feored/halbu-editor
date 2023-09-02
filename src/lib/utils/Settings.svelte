<script context="module">
    import { type } from "@tauri-apps/api/os";
    import { resolve, homeDir } from "@tauri-apps/api/path";
    import { SettingsManager } from "tauri-settings";
    import * as log from "./Logs.svelte";

    let initialized = false;
    let settingsManager;

    export const Key = {
        Theme: "theme",
        SaveFolder: "save_folder",
        AdvancedQuests: "advanced_quests",
    };

    export const BASE_SETTINGS = {
        [Key.Theme]: "",
        [Key.SaveFolder]: "",
        [Key.AdvancedQuests]: false,
    };

    async function getDefaultSettings() {
        let save_folder = "";
        const osType = await type();
        if (osType === "Windows_NT") {
            const homeDirPath = await homeDir();
            save_folder = await resolve(homeDirPath, "Saved Games", "Diablo II Resurrected");
        }
        return {
            [Key.Theme]: "auto",
            [Key.SaveFolder]: save_folder,
            [Key.AdvancedQuests]: false,
        };
    }

    export async function apply() {
        let theme = await get(Key.Theme);
        if (theme === "auto") {
            document.querySelector("html").removeAttribute("data-theme");
        } else if (["dark", "light"].includes(theme)) {
            document.querySelector("html").setAttribute("data-theme", theme);
        }
    }

    async function initializeIfNecessary() {
        if (!initialized) {
            await initialize();
        }
    }

    export async function initialize() {
        let defaultSettings = await getDefaultSettings();
        settingsManager = new SettingsManager(defaultSettings, {
            prettify: true,
            numSpaces: 4,
        });
        // In case we have added settings in a new release. add
        // the new settings in defaults to the current settings
        let foundSettings = await settingsManager.initialize();
        if (Object.keys(foundSettings).length < Object.keys(defaultSettings).length) {
            Object.keys(defaultSettings).forEach((key) => {
                if (!(key in foundSettings)) {
                    set(key, defaultSettings[key]);
                }
            });
        }
        await settingsManager.syncCache();
        initialized = true;
    }

    export async function has(key) {
        await initializeIfNecessary();
        return settingsManager.hasCache(key);
    }

    export async function get(key) {
        await initializeIfNecessary();
        return settingsManager.get(key);
    }

    export async function set(key, value) {
        await initializeIfNecessary();
        return settingsManager.set(key, value);
    }

    export function getCache(key) {
        if (!initialized) {
            log.error(
                "Error: Trying to get a value from the cache before the settings manager has been initialized."
            );
        }
        return settingsManager.getCache(key);
    }
</script>
