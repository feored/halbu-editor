<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import CharacterPicker, {CharacterType} from "./lib/CharacterPicker.svelte";
    import Character from "./lib/Character.svelte";
    import Attributes from "./lib/Attributes.svelte"

    let loaded_character = false;
    let currentCharacter = null;

    async function handlePickedCharacter(event) {
        console.log(event.detail);
        if (event.detail.character == CharacterType.Existing){
            let result = await invoke("get_character", {b64data: event.detail.data});
            currentCharacter = result;
            loaded_character = true;
        } else {
            let result = await invoke("new_character", {class: event.detail.data});
            currentCharacter = result;
            loaded_character = true;
        }
        
    }

    function unpickCharacter(){
        loaded_character = false;
        currentCharacter = null;
    }
</script>

<main class="container">
    <h1>Halbu Editor</h1>
    {#if !loaded_character}
        <CharacterPicker on:message={handlePickedCharacter} />
    {:else}
        <button on:click={unpickCharacter}>Back</button>
        <Attributes save={currentCharacter}/>
    {/if}
</main>

<style>

</style>
