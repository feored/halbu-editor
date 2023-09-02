<script context="module">
    import { type } from "@tauri-apps/api/os";
    import { resolve, homeDir } from "@tauri-apps/api/path";
    import { SettingsManager } from "tauri-settings";

    let initialized = false;
    let settingsManager;

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

    async function initializeIfNecessary() {
        if (!initialized) {
            await initialize();
        }
    }

    export async function initialize() {
        settingsManager = new SettingsManager(await getDefaultSettings(), {
            prettify: true,
            numSpaces: 4,
        });
        await settingsManager.initialize();
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
</script>
