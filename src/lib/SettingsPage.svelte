<script>
    import { InfoIcon } from "lucide-svelte";
    import { open } from "@tauri-apps/api/dialog";
    import { tooltip } from "./utils/actions.js";
    import * as Settings from "./utils/Settings.svelte";
    import * as log from "./utils/Logs.svelte";

    // Initialize values
    let currentSettings = Settings.getCachedSettings();

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
        console.log(currentSettings[Settings.Key.QuestsAdvancedFlags]);
    }

    async function setQuestsAdvancedAllQuests(event) {
        Settings.set(Settings.Key.QuestsAdvancedAllQuests, event.target.checked);
        currentSettings[Settings.Key.QuestsAdvancedAllQuest] = event.target.checked;
    }

    async function setQuestsShowPrologue(event) {
        Settings.set(Settings.Key.QuestsShowPrologue, event.target.checked);
        currentSettings[Settings.Key.QuestsShowPrologue] = event.target.checked;
    }
</script>

<article style="max-width:62.5rem; margin:auto;">
    <header><h4>Settings</h4></header>
    <div class="col vspaced">
        <h5>General</h5>
        <div class="row spaced">
            <legend>Set theme</legend>
            <form>
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
                <input type="button" on:click={setSaveFolder} value="Set Save Folder" />
                <input type="text" value={currentSettings[Settings.Key.SaveFolder]} readonly />
            </form>
        </div>
        <h5>Quests</h5>
        <form>
            <div class="row spaced">
                <input
                    type="checkbox"
                    role="switch"
                    checked={currentSettings[Settings.Key.QuestsAdvancedFlags]}
                    on:change={setQuestsAdvancedFlags}
                />
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
            </div>
        </form>
        <form>
            <div class="row spaced">
                <input
                    type="checkbox"
                    role="switch"
                    checked={currentSettings[Settings.Key.QuestsAdvancedAllQuests]}
                    disabled={!currentSettings[Settings.Key.QuestsAdvancedFlags]}
                    on:change={setQuestsAdvancedAllQuests}
                />
                <span>Show Unused Quests</span>
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
                >
            </div>
        </form>
        <form>
            <div class="row spaced">
                <input
                    type="checkbox"
                    role="switch"
                    checked={currentSettings[Settings.Key.QuestsShowPrologue]}
                    on:change={setQuestsShowPrologue}
                />
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
            </div>
        </form>
    </div>
</article>
