<script context="module">
    import { type } from "@tauri-apps/api/os";
    import { resolve, homeDir } from "@tauri-apps/api/path";
    import { SettingsManager } from "tauri-settings";

    let initialized = false;

    export const SettingsKey = {
        Theme: "theme",
        SaveFolder: "save_folder",
    };

    async function getDefaultSettings() {
        let save_folder = "";
        const osType = await type();
        if (osType === "Windows_NT") {
            const homeDirPath = await homeDir();
            save_folder = await resolve(homeDirPath, "Saved Games", "Diablo II Resurrected");
        }
        return {
            theme: "auto",
            save_folder: save_folder,
        };
    }

    const settingsManager = new SettingsManager(await getDefaultSettings(), {
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
