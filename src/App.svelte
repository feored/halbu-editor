<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { save } from "@tauri-apps/api/dialog";
    import { Message } from "./lib/utils/Message.svelte";
    import { SettingsIcon } from "lucide-svelte";
    import SavePicker, { CharacterType } from "./lib/SavePicker.svelte";
    import Save from "./lib/Save.svelte";
    import SettingsPage from "./lib/SettingsPage.svelte";

    let currentSave = null;

    let inSettings = false;

    async function saveCharacter() {
        const filePath = await save({
            defaultPath: currentSave.character.name,
            filters: [
                {
                    name: "D2R Save File",
                    extensions: ["d2s"],
                },
            ],
        });
        let res = await invoke("save_file", {
            path: filePath,
            save: currentSave,
        });
    }

    async function handlePickedCharacter(messageContents) {
        currentSave = messageContents.save;
    }

    function unpickCharacter() {
        currentSave = null;
    }

    function handleMessages(event) {
        switch (event.detail.id) {
            case Message.CharacterUnpicked:
                unpickCharacter();
                break;
            case Message.CharacterPicked:
                handlePickedCharacter(event.detail.data);
                break;
            case Message.SaveFile:
                saveCharacter();
                break;
        }
    }
</script>

<div id="option-btn">
    <button class:outline={inSettings} id="settings" on:click={() => (inSettings = !inSettings)}
        ><SettingsIcon /></button
    >
</div>
{#if inSettings}
    <main class="full-height container-center">
        <div class="full-width pad">
            <SettingsPage />
        </div>
    </main>
{:else if currentSave == null}
    <main class="pad">
        <SavePicker on:message={handleMessages} />
    </main>
{:else}
    <Save save={currentSave} on:message={handleMessages} />
{/if}

<style>
    .pad {
        padding: var(--pico-spacing);
    }

    #option-btn {
        top: var(--pico-spacing);
        right: var(--pico-spacing);
        position: absolute;
    }
</style>
