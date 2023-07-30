<script>
    import { invoke } from "@tauri-apps/api/tauri";
    export let save;

    let strengthRef;
    let levelRef;
    async function setStrength(){
        await invoke("set_strength", {strength: save.attributes.strength})
        .catch((error) => save.attributes.strength = error);
    }

    async function setLevel(){
        await invoke("set_level", {level: save.attributes.level})
        .catch((error) => {save.attributes.level = 1;  console.log(error)});
    }


    function enforceMinMax(el) {
        console.log(el.value);
    if (el.value != "") {
        if (parseInt(el.value) < parseInt(el.min)) {
        el.value = el.min;
        }
        if (parseInt(el.value) > parseInt(el.max)) {
        el.value = el.max;
        }
    }
    console.log(el.value);
    }
</script>
<h1 id="name">
    {save.character.name}
</h1>
<h2>Stats</h2>
<div class="row">
    <div class="container">
        <div>
            <div class="row flex-right">
                <label for="strength">Strength</label>
                <input bind:this = {strengthRef} type="number" name="strength" min="0" max="999" step="1"  on:keyup={() => {enforceMinMax(strengthRef)}} on:change={setStrength} bind:value="{save.attributes.strength}">
            </div>
            <div class="row flex-right">
                <label for="dexterity">Dexterity</label>
                <input type="number" name="dexterity" min="0" max="999" step="1" bind:value="{save.attributes.dexterity}">
            </div>
            <div class="row flex-right">
                <label for="vitality">Vitality</label>
                <input type="number" name="vitality" min="0" max="999" step="1" bind:value="{save.attributes.vitality}">
            </div>
            <div class="row flex-right">
                <label for="energy">Energy</label>
                <input type="number" name="energy" min="0" max="999" step="1" bind:value="{save.attributes.energy}">
            </div>
        </div>
    </div>
    <div class="container">
        <div class="row flex-right">
            <label for="life">Life</label>
            <input type="number" name="life" min="1" max="9999" step="1" bind:value="{save.attributes.life_base.integer}">
        </div>
        <div class="row flex-right">
            <label for="mana">Mana</label>
            <input type="number" name="mana" min="1" max="9999" step="1" bind:value="{save.attributes.mana_base.integer}">
        </div>
        <div class="row flex-right">
            <label for="stamina">Stamina</label>
            <input type="number" name="stamina" min="0" max="999" step="1" bind:value="{save.attributes.stamina_base.integer}">
        </div>
        <div class="row flex-right">
            <label for="level">Level</label>
            <input bind:this = {levelRef} type="number" name="level" min="1" max="99" step="1" on:keyup={() => {enforceMinMax(levelRef)}} on:change={setLevel} bind:value="{save.attributes.level}">
        </div>
    </div>
</div>


<style>
    label {
        width: 7em;
        font-weight: bold;
        font-size:larger;
    }

    input {
        width:100px;
        height:3em;
    }

    .flex-right {
        padding:0.5em;
        align-items: center;
    }
</style>