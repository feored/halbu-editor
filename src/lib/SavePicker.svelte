<script context="module">
    export const CharacterType = {
        Existing: Symbol("Existing"),
        New: Symbol("New"),
    };
</script>

<script>
    import { onMount } from "svelte";
    import { open, save } from "@tauri-apps/api/dialog";
    import { createEventDispatcher } from "svelte";
    import { Message, buildMessage } from "./utils/Message.svelte";
    import { invoke } from "@tauri-apps/api/tauri";
    import { Class } from "./utils/Constants.svelte";
    import charstats from "../res/charstats.json";
    import { calcTitle } from "./utils/Utils.svelte";
    import { SettingsKey, settings_get, settings_initialize } from "./utils/Settings.svelte";
    import { AlertCircleIcon } from "lucide-svelte";

    const dispatch = createEventDispatcher();

    function dispatchMessage(id, data) {
        dispatch("message", buildMessage(id, data));
    }

    onMount(() => {
        getExistingCharacters();
    });

    let saveFolderSet = true;
    let saveFilesFound = [];

    async function readFileContents() {
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
            await loadSavePath(selectedPath);
        } catch (err) {
            console.error(err);
        }
    }

    async function loadSavePath(path) {
        try {
            let saveFile = await invoke("get_character_from_path", {
                path: path,
            });
            dispatchMessage(Message.CharacterPicked, { save: saveFile });
        } catch (err) {
            console.error(err);
        }
    }

    async function newSave(charClass) {
        let newSave = await invoke("new_save", { class: charClass });
        dispatchMessage(Message.CharacterPicked, { save: newSave });
    }

    async function getExistingCharacters() {
        await settings_initialize();
        let saveFolder = await settings_get(SettingsKey.SaveFolder);
        if (saveFolder.length < 1) {
            saveFolderSet = false;
            return;
        }

        try {
            let characters = await invoke("summary_folder", { path: saveFolder });
            saveFilesFound = characters;
        } catch (err) {
            console.error(err);
        }
    }
</script>

<div id="list" class="full-height vspaced">
    <hgroup class="text-center">
        <h1>Halbu Editor</h1>
        <p>Diablo II : Resurrected Save Editor</p>
    </hgroup>
    <div class="row full-width container-center">
        <button on:click={readFileContents}>Edit .d2s</button>
    </div>

    <article>
        <h5 class="text-center">Load Existing Character</h5>
        {#if !saveFolderSet}
                <p class="toast toast-info row">
                    <AlertCircleIcon />&nbsp;Set a designated save folder in the settings to easily pick from existing
                    characters.
                </p>
        {:else if saveFilesFound.length < 1}
        <p class="toast toast-info row">
            <AlertCircleIcon />&nbsp;Found no valid .d2s files in save folder.
        </p>
        {/if}
        <div class="grid-tiles">
            {#each saveFilesFound as saveFile}
                <a
                    href="#top"
                    role="button"
                    aria-pressed="false"
                    on:click={() => {
                        loadSavePath(saveFile.path);
                    }}
                >
                    <div class="col full-height" style="text-align:left">
                        <b class={saveFile.save.character.status.hardcore ? "red" : ""}
                            >{calcTitle(saveFile.save.character)}
                            {saveFile.save.character.name}</b
                        >
                        <span>
                            Level {saveFile.save.character.level}
                            {saveFile.save.character.class}
                        </span>
                        {#if saveFile.save.character.status.expansion}
                            <small><i>Expansion Character</i></small>
                        {/if}
                    </div>
                </a>
            {/each}
        </div>
    </article>
    <h5 class="text-center">New Character</h5>
    <div id="btn-group">
        {#each Object.keys(Class) as charClass}
            <button
                on:click={() => {
                    newSave(charClass);
                }}>{charClass}</button
            >
        {/each}
    </div>
</div>

<style>
    .grid-tiles {
        display: grid;
        grid-gap: var(--pico-spacing);
        grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    }
    
    #list {
        margin: auto;
        width: 66%;
    }
    #btn-group {
        display: flex;
        flex-direction: column;
        padding: 0;
        margin: auto;
        max-width: 30rem;
    }
    #btn-group > button {
        border-radius: 0;
        border: var(--pico-border-width) solid var(--pico-muted-border-color);
    }
    #btn-group > button:not(:last-child) {
        border-bottom: none; /* Prevent double borders */
        margin-bottom: 0;
    }
</style>
