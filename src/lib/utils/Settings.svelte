<script context="module">
    let initialized = false;

    import { SettingsManager } from "tauri-settings";

    export const SettingsKey = {
        Theme: "theme",
        SaveFolder: "save_folder",
    };

    const DEFAULT_SETTINGS = {
        theme: "auto",
        save_folder: "",
    };

    const settingsManager = new SettingsManager(DEFAULT_SETTINGS, {
        prettify: true,
        numSpaces: 4,
    });

    async function initializeIfNecessary() {
        if (!initialized) {
            await settings_initialize();
        }
    }

    export async function settings_initialize() {
        await settingsManager.initialize();
        initialized = true;
    }

    export async function settings_has(key) {
        await initializeIfNecessary();
        return settingsManager.hasCache(key);
    }

    export async function settings_get(key) {
        await initializeIfNecessary();
        return settingsManager.get(key);
    }

    export async function settings_set(key, value) {
        await initializeIfNecessary();
        return settingsManager.set(key, value);
    }
</script>
