<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { save } from "@tauri-apps/api/dialog";
    import { Message } from "./lib/utils/Message.svelte";
    import { SettingsIcon } from "lucide-svelte";
    import SavePicker, { CharacterType } from "./lib/SavePicker.svelte";
    import Save from "./lib/Save.svelte";
    import SettingsPage from "./lib/SettingsPage.svelte";

    let currentSave = null;
    let validSave = true;

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

    function handleSaveValidity(messageContents) {
        validSave = messageContents.valid;
    }

    function handleMessages(event) {
        switch (event.detail.id) {
            case Message.ValidSave:
                handleSaveValidity(event.detail.data);
                break;
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

<div id="option">
    <button class:outline={inSettings} id="settings" on:click={() => (inSettings = !inSettings)}
        ><SettingsIcon /></button
    >
</div>
{#if inSettings}
    <main id="center" class="full-height full-width">
        <SettingsPage />
    </main>
{:else if currentSave == null}
    <main id="center" class="full-height">
        <SavePicker on:message={handleMessages} />
    </main>
{:else}
    <Save save={currentSave} {validSave} on:message={handleMessages} />
{/if}

<style>
    #center {
        justify-content: center;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    #option {
        top: var(--pico-spacing);
        right: var(--pico-spacing);
        position: absolute;
    }
</style>
