<script context="module">
    export const CharacterType = {
            Existing: Symbol("Existing"),
            New: Symbol("New")
        };
</script>

<script>
    import { open } from "@tauri-apps/api/dialog";
    import { createEventDispatcher } from 'svelte';
    import { Message, buildMessage} from "./Message.svelte";

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
            dispatchMessage(Message.CharacterPicked, {data: selectedPath, character: CharacterType.Existing});
        } catch (err) {
            console.error(err);
        }
    }

    const dispatch = createEventDispatcher();

    let classes = [
        "Amazon",
        "Assassin",
        "Barbarian",
        "Druid",
        "Paladin",
        "Necromancer",
        "Sorceress"
    ];

    function dispatchNewCharacter(characterClass){
        dispatchMessage(Message.CharacterPicked, {data: characterClass, character: CharacterType.New});
    }


</script>

<div class="center">
    <div class="center"> 
        <button on:click={readFileContents}>Edit Character</button>
    </div>

    <hr />

    <div class="center">   
        {#each classes as charClass}
            <button type="button" class="center-button" on:click={() => dispatchNewCharacter(charClass)}>New {charClass}</button>
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