<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { save } from "@tauri-apps/api/dialog";
    import { ArrowLeftIcon, SaveIcon} from 'lucide-svelte'
    import CharacterPicker, {CharacterType} from "./lib/CharacterPicker.svelte";
    import Character from "./lib/Character.svelte";

    let loaded_character = false;
    let currentSave = null;
    let validSave = true;

    async function handlePickedCharacter(event) {
        console.log(event.detail);
        if (event.detail.character == CharacterType.Existing){
            let result = await invoke("get_character_from_path", {path: event.detail.data});
            currentSave = result;
            loaded_character = true;
        } else {
            let result = await invoke("new_character", {class: event.detail.data});
            currentSave = result;
            loaded_character = true;
        }
        
    }

    async function saveCharacter() {
        const filePath = await save({
        defaultPath: currentSave.character.name,
        filters: [{
            name: 'D2R Save File',
            extensions: ['d2s']
        }]
        });
        let res = await invoke("save_file", {path:filePath, save: currentSave});
    }

    function unpickCharacter(){
        loaded_character = false;
        currentSave = null;
    }

    function handleSaveValid(event){
        console.log(event.detail.valid);
        validSave = event.detail.valid;
    }
</script>

<main class="container">
    {#if !loaded_character}
        <h1 id="title">Halbu Editor</h1>
        <CharacterPicker on:message={handlePickedCharacter} />
    {:else}
        <div>
            <button class="icon-btn" on:click={unpickCharacter}><ArrowLeftIcon /> Back</button>
            <button class="icon-btn" on:click={saveCharacter} disabled={!validSave}><SaveIcon /> Save</button>
        </div>
        
        <Character save={currentSave} on:message={handleSaveValid}/>
    {/if}
</main>

<style>
.container {
    width:100%;
}

#title {
    text-align:center;
}
</style>
