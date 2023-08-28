<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { save } from "@tauri-apps/api/dialog";
    import { Message } from "./lib/utils/Message.svelte";
    import SavePicker, { CharacterType } from "./lib/SavePicker.svelte";
    import Save from "./lib/Save.svelte";

    let currentSave = null;
    let validSave = true;

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
{#if currentSave == null}
    <main class="container full-height">
        <div id="center" class="full-height">
            <SavePicker on:message={handleMessages} />
        </div>
    </main>
{:else}
    <Save save={currentSave} {validSave} on:message={handleMessages} />
{/if}

<style>
    #center {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>
