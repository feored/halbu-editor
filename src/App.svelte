<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { save } from "@tauri-apps/api/dialog";
    import { ArrowLeftIcon, SaveIcon} from 'lucide-svelte'
    import { Message} from "./lib/Message.svelte";
    import CharacterPicker, {CharacterType} from "./lib/CharacterPicker.svelte";
    import Character from "./lib/Character.svelte";

    let currentSave = null;
    let validSave = true;

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

    async function handlePickedCharacter(messageContents) {
        console.log(messageContents);
        if (messageContents.character == CharacterType.Existing){
            let result = await invoke("get_character_from_path", {path: messageContents.data});
            currentSave = result;
        } else {
            
            let result = await invoke("new_character", {class: messageContents.data});
            currentSave = result;
        }
        
    }

    function unpickCharacter(){
        currentSave = null;
    }

    function handleSaveValidity(messageContents){
        validSave = messageContents.valid;
    }


    function handleMessages(event){
        switch (event.detail.id){
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

<main class="container">
    {#if currentSave == null}
        <h1 id="title">Halbu Editor</h1>
        <CharacterPicker on:message={handleMessages} />
    {:else}
        <Character save={currentSave} validSave={validSave} on:message={handleMessages}/>
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
