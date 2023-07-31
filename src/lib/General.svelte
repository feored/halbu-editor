<script>
    import { invoke } from "@tauri-apps/api/tauri";
    export let save;

    let strengthRef, dexterityRef, vitalityRef, energyRef;

    let levelRef, experienceRef;

    async function setLevel(){
        save.character.level = save.attributes.level;
        await invoke("get_experience_range_from_level", {level: save.attributes.level})
        .then((xpRange) => {
            console.log(xpRange);
            if(save.attributes.experience < xpRange[0] || save.attributes.experience >= xpRange[1]){
                save.attributes.experience = xpRange[0];
            }
        })
    }

    async function setExperience(){
        await invoke("get_level_from_experience", {experience: save.attributes.experience})
        .then((level) => {
            if(save.attributes.level != level){
                save.attributes.level = level;
                save.character.level = level;
            }
        })
    }


    function enforceMinMax(el) {
        if (el.value != "") {
            if (parseInt(el.value) < parseInt(el.min)) {
            el.value = el.min;
            }
            if (parseInt(el.value) > parseInt(el.max)) {
            el.value = el.max;
            }
        }
    }
</script>

<h1 id="name">
    {save.character.name}
</h1>
<p>
    <i>{save.character.title}</i> <b>{save.character.class}</b>
</p>

<div class="row">
    <fieldset id="status" class="row">
        <legend>Status</legend>

        <div class="row">
            <input type="checkbox" id="expansion" name="expansion" bind:checked="{save.character.status.expansion}">
            <label for="expansion">Expansion</label>
        </div>

        <div class="row">
            <input type="checkbox" id="hardcore" name="hardcore" bind:checked="{save.character.status.hardcore}">
            <label for="hardcore">Hardcore</label>
        </div>

        <div class="row">
            <input type="checkbox" id="died" name="died" bind:checked="{save.character.status.died}">
            <label for="died">Died</label>
        </div>

        <div class="row">
            <input type="checkbox" id="ladder" name="ladder" bind:checked="{save.character.status.ladder}">
            <label for="ladder">Ladder</label>
        </div>
    </fieldset>
    <fieldset id="levelxp" class="row">
        <legend>Level</legend>
        <div id="level">
            <label for="level">Level</label>
            <input bind:this = {levelRef} type="number" name="level" min="1" max="99" step="1" on:input={() => {enforceMinMax(levelRef)}} on:change={setLevel} bind:value="{save.attributes.level}">
        </div>
        <div id="experience">
            <label for="experience">Experience</label>
            <input bind:this = {experienceRef} type="number" name="experience" min="0" max="3520485254" step="1" on:input={() => {enforceMinMax(experienceRef)}} on:change={setExperience} bind:value="{save.attributes.experience}">
        </div>
    </fieldset>
</div>
<h2>Stats</h2>
<div class="row">
    <div class="container">
        <fieldset id="attributes">
            <legend>Attributes</legend>
            <div class="">
                <label for="strength">Strength</label>
                <input bind:this = {strengthRef} type="number" name="strength" min="0" max="1023" step="1"  on:input={() => {enforceMinMax(strengthRef)}} bind:value="{save.attributes.strength}">
            </div>
            <div class="">
                <label for="dexterity">Dexterity</label>
                <input bind:this = {dexterityRef} type="number" name="dexterity" min="0" max="1023" step="1" on:input={() => {enforceMinMax(dexterityRef)}} bind:value="{save.attributes.dexterity}">
            </div>
            <div class="">
                <label for="vitality">Vitality</label>
                <input bind:this = {vitalityRef} type="number" name="vitality" min="0" max="1023" step="1" on:input={() => {enforceMinMax(vitalityRef)}} bind:value="{save.attributes.vitality}">
            </div>
            <div class="">
                <label for="energy">Energy</label>
                <input bind:this = {energyRef} type="number" name="energy" min="0" max="1023" step="1" on:input={() => {enforceMinMax(energyRef)}} bind:value="{save.attributes.energy}">
            </div>
        </fieldset>
    </div>
    <div class="container">
        <fieldset id="attributes">
            <legend>Resources</legend>
            <div class="row resource">
                <div class="col">
                    <label for="lifeCurrent">Current Life</label>
                    <input type="number" name="lifeCurrent" min="1" max="8181" step="1" bind:value="{save.attributes.life_current.integer}">
                </div>
                <p>&emsp;/&emsp;</p>
                <div class="col">
                    <label for="lifeBase">Base Life</label>
                    <input type="number" name="lifeBase" min="1" max="8181" step="1" bind:value="{save.attributes.life_base.integer}">
                </div>
            </div>
            <div class="row resource">
                <div class="col">
                    <label for="manaCurrent">Current Mana</label>
                    <input type="number" name="manaCurrent" min="1" max="8181" step="1" bind:value="{save.attributes.mana_current.integer}">
                </div>
                <p>&emsp;/&emsp;</p>
                <div class="col">
                    <label for="manaBase">Base Mana</label>
                    <input type="number" name="manaBase" min="1" max="8181" step="1" bind:value="{save.attributes.mana_base.integer}">
                </div>
            </div>
            <div class="row resource">
                <div class="col">
                    <label for="staminaCurrent">Current Stamina</label>
                    <input type="number" name="staminaCurrent" min="1" max="8181" step="1" bind:value="{save.attributes.stamina_current.integer}">
                </div>
                <p>&emsp;/&emsp;</p>
                <div class="col">
                    <label for="staminaBase">Base Stamina</label>
                    <input type="number" name="staminaBase" min="1" max="8181" step="1" bind:value="{save.attributes.stamina_base.integer}">
                </div>
            </div>
        </fieldset>
    </div>
</div>



<style>
    .resource {
        align-items: end;
        justify-content: center;
    }
    input[type="number"] {
        width:100px;
    }

    #status .row {
        margin:0 1rem;
    }

    fieldset {
        margin-right:1em;
        align-items: center;
    }

</style>