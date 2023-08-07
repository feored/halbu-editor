<script context="module">
    export const CharacterType = {
            Existing: Symbol("Existing"),
            New: Symbol("New")
        };
</script>

<script>
    import { open } from "@tauri-apps/api/dialog";
    import { createEventDispatcher } from 'svelte';
    import { Message, buildMessage} from "./utils/Message.svelte";
    import { invoke } from "@tauri-apps/api/tauri";
    import { Class } from "./utils/Constants.svelte";
    import charstats from "../res/charstats.json"
    const dispatch = createEventDispatcher();

    function dispatchMessage(id, data) {
        dispatch('message', buildMessage(id, data));
    }

    const readFileContents = async () => {
        try {
            const selectedPath = await open({
                multiple: false,
                filters : [{
                    name: "D2R Save File",
                    extensions: ["d2s"]
                }],
                title: "Open .d2s file"
            });
            let saveFile = await invoke("get_character_from_path", {path: selectedPath});
            dispatchMessage(Message.CharacterPicked, {save: saveFile});
        } catch (err) {
            console.error(err);
        }
    }

    async function newSave(charClass){
        let blankSave = await invoke("blank_save");
        
        blankSave.character.class = charClass;

        blankSave.character.level = 1;
        blankSave.attributes.level.value = 1;

        blankSave.attributes.strength.value = charstats[charClass].str;
        blankSave.attributes.dexterity.value = charstats[charClass].dex;
        blankSave.attributes.energy.value = charstats[charClass].int;
        blankSave.attributes.vitality.value = charstats[charClass].vit;

        blankSave.attributes.maxhp.value = (blankSave.attributes.vitality.value + charstats[charClass].hpadd) * 256;
        blankSave.attributes.hitpoints.value = blankSave.attributes.maxhp.value;

        blankSave.attributes.maxstamina.value = charstats[charClass].stamina * 256;
        blankSave.attributes.stamina.value = blankSave.attributes.maxstamina.value;

        blankSave.attributes.maxmana.value = charstats[charClass].int* 256;
        blankSave.attributes.mana.value = blankSave.attributes.maxmana.value;

        dispatchMessage(Message.CharacterPicked, {save: blankSave});
    } 




</script>

<div class="center">
    <div class="center"> 
        <button on:click={readFileContents}>Edit Character</button>
    </div>

    <hr />

    <div class="center">   
        {#each Object.keys(Class) as charClass}
            <button type="button" class="center-button" on:click={() => {newSave(charClass)}}>New {charClass}</button>
        {/each}
    </div>

</div>

<style>
    button {
        font-weight: bold;
    }
    .center-button {
        text-align: center;
        width:100%;
    } 
    .center {
        margin: auto;
        min-width:30%;
        display: flex;
        flex-direction: column;
    }
</style>