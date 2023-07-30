<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { save } from "@tauri-apps/api/dialog";
    import { ArrowLeftIcon} from 'svelte-feather-icons'
    import CharacterPicker, {CharacterType} from "./lib/CharacterPicker.svelte";
    import Character from "./lib/Character.svelte";

    let loaded_character = false;
    let currentCharacter = null;

    async function handlePickedCharacter(event) {
        console.log(event.detail);
        if (event.detail.character == CharacterType.Existing){
            let result = await invoke("get_character_from_path", {path: event.detail.data});
            currentCharacter = result;
            loaded_character = true;
        } else {
            let result = await invoke("new_character", {class: event.detail.data});
            currentCharacter = result;
            loaded_character = true;
        }
        
    }

    async function saveCharacter() {
        const filePath = await save({
        filters: [{
            name: 'D2R Save File',
            extensions: ['d2s']
        }]
        });
        let res = await invoke("save_file", {path:filePath});
    }

    function unpickCharacter(){
        loaded_character = false;
        currentCharacter = null;
    }
</script>

<main class="container">
    <h1 id="title">Halbu Editor</h1>
    {#if !loaded_character}
        <CharacterPicker on:message={handlePickedCharacter} />
    {:else}
        <div class="row">
            <button class="icon-btn" on:click={unpickCharacter}><ArrowLeftIcon />Back</button>
            <button on:click={saveCharacter}>Save</button>
        </div>
        
        <Character save={currentCharacter}/>
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
