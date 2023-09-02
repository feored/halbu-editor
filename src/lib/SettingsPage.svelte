<script>
    import { SunMoonIcon, FolderIcon } from "lucide-svelte";
    import { open } from "@tauri-apps/api/dialog";
    import * as Settings from "./utils/Settings.svelte";
    import * as log from "./utils/Logs.svelte";

    // Initialize values
    let currentSettings = Settings.BASE_SETTINGS;

    Settings.initialize();
    Settings.get(Settings.Key.SaveFolder).then((value) => {
        currentSettings[Settings.Key.SaveFolder] = value;
    });
    Settings.get(Settings.Key.Theme).then((value) => {
        currentSettings[Settings.Key.Theme] = value;
    });
    Settings.get(Settings.Key.AdvancedQuests).then((value) => {
        currentSettings[Settings.Key.AdvancedQuests] = value;
    });

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

    async function setAdvancedQuests(event) {
        Settings.set(Settings.Key.AdvancedQuests, event.target.checked);
    }
</script>

<article style="max-width:62.5rem; margin:auto;">
    <header><h5>Settings</h5></header>
    <div class="col vspaced">
        <div>
            <form>
                <legend><b>Set theme</b></legend>
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
        <div>
            <form role="group">
                <input type="text" value={currentSettings[Settings.Key.SaveFolder]} readonly />
                <input type="button" on:click={setSaveFolder} value="Set Save Folder" />
            </form>
        </div>
        <div>
            <form>
                <div class="row spaced">
                    <input
                        type="checkbox"
                        on:change={setAdvancedQuests}
                        role="switch"
                        checked={currentSettings[Settings.Key.AdvancedQuests] == true}
                    />
                    <p>
                        <b>Quests</b>: Advanced editing mode. Allows editing the state of each quest
                        manually (not recommended).
                    </p>
                </div>
            </form>
        </div>
    </div>
</article>
