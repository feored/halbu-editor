<script context="module">
    export const CharacterType = {
            Existing: Symbol("Existing"),
            New: Symbol("New")
        };
</script>

<script>
    import { createEventDispatcher } from 'svelte';


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

    let files;

    function readFile() {
        let file = files[0];
        let reader = new FileReader();
        reader.addEventListener('load', dispatchFile);
        // Use base64 because of serde issue with 
        // deserializing uint8array as a map....
        // https://github.com/rustwasm/wasm-bindgen/issues/2017
        reader.readAsDataURL(file);
    }

    function dispatchFile(event){
        dispatch('message', {
            //remove the data:*/*;base64, from the data URL
            data: event.target.result.split(',')[1],
            character: CharacterType.Existing
        });
    }

    function dispatchNewCharacter(characterClass){
        console.log("DISPATCHED NEW!!" + characterClass);
        dispatch('message', {
            //remove the data:*/*;base64, from the data URL
            data: characterClass,
            character: CharacterType.New
        });
    };


</script>

<div class="center">
    

    <div class="row center"> 
        <label for="file-upload" class="custom-file-upload">
            Edit Existing Character
        </label> 
        <input id="file-upload" type="file" bind:files accept=".d2s" on:change={readFile}>
    </div>

    <hr class="rounded"/>

    <div>   
        {#each classes as charClass}
        <div>
            <button type="button" on:click={() => dispatchNewCharacter(charClass)}>New {charClass}</button>
        </div>
        {/each}
    </div>

</div>

<style>
    #file-upload {
        display: none;
    }
    .custom-file-upload {
        background-color:#0f0f0f98;
        border-radius: 8px;
        border: 1px solid transparent;
        padding: 0.6em 1.2em;
        font-size: 1em;
        font-weight: 500;
        font-family: inherit;
        display: inline-block;
        cursor: pointer;
    }
    hr.rounded {
        width:100%;
        border: 1px solid black;
        border-radius: 5px;
        margin: 1em;
    }
    button {
        width: 50%;
        margin:0.5em;
    }
    .center {
        margin: auto;
        min-width: 50%;
        padding: 10px;
        display: flex;
        flex-direction: column;
    }
</style>