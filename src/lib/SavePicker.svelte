<script context="module">
    export const CharacterType = {
        Existing: Symbol("Existing"),
        New: Symbol("New"),
    };
</script>

<script>
    import { open } from "@tauri-apps/api/dialog";
    import { createEventDispatcher } from "svelte";
    import { Message, buildMessage } from "./utils/Message.svelte";
    import { invoke } from "@tauri-apps/api/tauri";
    import { Class } from "./utils/Constants.svelte";
    import charstats from "../res/charstats.json";
    const dispatch = createEventDispatcher();

    function dispatchMessage(id, data) {
        dispatch("message", buildMessage(id, data));
    }

    const readFileContents = async () => {
        try {
            const selectedPath = await open({
                multiple: false,
                filters: [
                    {
                        name: "D2R Save File",
                        extensions: ["d2s"],
                    },
                ],
                title: "Open .d2s file",
            });
            let saveFile = await invoke("get_character_from_path", {
                path: selectedPath,
            });
            dispatchMessage(Message.CharacterPicked, { save: saveFile });
        } catch (err) {
            console.error(err);
        }
    };

    async function newSave(charClass) {
        let newSave = await invoke("new_save", { class: charClass });
        dispatchMessage(Message.CharacterPicked, { save: newSave });
    }
</script>

<div id="list">
    <hgroup class="center">
        <h1>Halbu Editor</h1>
        <p>Diablo II : Resurrected Save Trainer</p>
    </hgroup>
    <button on:click={readFileContents}>Edit Character</button>
    <br />
    <hr />
    <br />
    <h6 class="center">New Character</h6>
    <div id="btn-group">
        {#each Object.keys(Class) as charClass}
            <button
                type="button"
                on:click={() => {
                    newSave(charClass);
                }}>{charClass}</button
            >
        {/each}
    </div>
</div>

<style>
    .center {
        text-align:center;
    }
    button {
        font-weight: bold;
    }
    #list {
        margin: auto;
        max-width: 30%;
    }
    #list > * {
        width: 100%;
    }
    #btn-group {
        display:flex;
        flex-direction: column;
        padding:0;
    }
    #btn-group > button{
        border-radius: 0;
        border: var(--pico-border-width) solid var(--pico-muted-border-color);
    }
    #btn-group > button:not(:last-child) {
        border-bottom: none; /* Prevent double borders */
        margin-bottom: 0;
    }
</style>
