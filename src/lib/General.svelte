<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { Info, InfoIcon} from "lucide-svelte";
    import { Tooltip } from "@svelte-plugins/tooltips";

    export let save;

    const MAX_GOLD_PER_LEVEL = 10000;

    let nameRef;
    let strengthRef, dexterityRef, vitalityRef, energyRef;
    let levelRef, experienceRef;
    let lifeCurrentRef,  lifeBaseRef, manaCurrentRef, manaBaseRef, staminaCurrentRef, staminaBaseRef;
    let statPointsLeftRef, skillPointsLeftRef;
    let goldInventoryRef, goldStashRef;

    async function changeLevel(){
        save.character.level = save.attributes.level;
        await invoke("get_experience_range_from_level", {level: save.attributes.level})
        .then((xpRange) => {
            console.log(xpRange);
            if(save.attributes.experience < xpRange[0] || save.attributes.experience >= xpRange[1]){
                save.attributes.experience = xpRange[0];
            }
        })
        goldInventoryRef.max = MAX_GOLD_PER_LEVEL * save.character.level;

    }

    async function setExperience(){
        await invoke("get_level_from_experience", {experience: save.attributes.experience})
        .then((level) => {
            if(save.attributes.level != level){
                save.attributes.level = level;
                changeLevel()
            }
        })
    }


    function enforceMinMax(el) {
        if (el.value != "") {
            if (parseFloat(el.value) < parseFloat(el.min)) {
            el.value = el.min;
            }
            if (parseFloat(el.value) > parseFloat(el.max)) {
            el.value = el.max;
            }
        }
    }

    function validateName(){

    }
</script>

<div class="row">
    <div>
        <label for="name" class="row" style="vertical-align:middle;">Name</label>
        <div class="row" style="align-items:center">
            <input title="2-15 characters" bind:this = {nameRef} type="text" id="name" placeholder="default" name="name" required minlength="2" maxlength="15" size="15" on:input={() => {validateName}} bind:value="{save.character.name}"/>
            <div>
            <Tooltip content="<ul><li>2-15 characters (UTF-8)</li><li>1 underscore or dash allowed</li><li>Must begin with a letter</li></ul>" position={"bottom"}>
                <InfoIcon />
            </Tooltip>
            </div>
        </div>
        <p>
            <i>{save.character.title}</i> <b>{save.character.class}</b>
        </p>
    </div>
</div>
<div class="row">
    <fieldset id="levelxp" class="row">
        <legend>Level</legend>
        <div id="level">
            <label for="level">Level</label>
            <input bind:this = {levelRef} type="number" name="level" min="1" max="99" step="1" on:input={() => {enforceMinMax(levelRef)}} on:change={changeLevel} bind:value="{save.attributes.level}">
        </div>
        <div id="experience">
            <label for="experience">Experience</label>
            <input bind:this = {experienceRef} type="number" name="experience" min="0" max="3520485254" step="1" on:input={() => {enforceMinMax(experienceRef)}} on:change={setExperience} bind:value="{save.attributes.experience}">
        </div>
    </fieldset>
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
</div>
<h3>Stats</h3>
<div class="row">
    <div class="container">
        <fieldset id="attributes">
            <legend>Attributes</legend>
            <div>
                <label for="strength">Strength</label>
                <input bind:this = {strengthRef} type="number" name="strength" min="0" max="1023" step="1"  on:input={() => {enforceMinMax(strengthRef)}} bind:value="{save.attributes.strength}">
            </div>
            <div>
                <label for="dexterity">Dexterity</label>
                <input bind:this = {dexterityRef} type="number" name="dexterity" min="0" max="1023" step="1" on:input={() => {enforceMinMax(dexterityRef)}} bind:value="{save.attributes.dexterity}">
            </div>
            <div>
                <label for="vitality">Vitality</label>
                <input bind:this = {vitalityRef} type="number" name="vitality" min="0" max="1023" step="1" on:input={() => {enforceMinMax(vitalityRef)}} bind:value="{save.attributes.vitality}">
            </div>
            <div>
                <label for="energy">Energy</label>
                <input bind:this = {energyRef} type="number" name="energy" min="0" max="1023" step="1" on:input={() => {enforceMinMax(energyRef)}} bind:value="{save.attributes.energy}">
            </div>
        </fieldset>
    </div>
    <div class="container">
        <fieldset id="resources">
            <legend>Resources</legend>
            <div class="row resource">
                <div class="col">
                    <label for="lifeCurrent">Current Life</label>
                    <input bind:this = {lifeCurrentRef} on:input={() => {enforceMinMax(lifeCurrentRef)}} type="number" name="lifeCurrent" min="1" max="8181" step="1" bind:value="{save.attributes.life_current.integer}">
                </div>
                <p>&emsp;/&emsp;</p>
                <div class="col">
                    <label for="lifeBase">Base Life</label>
                    <input bind:this = {lifeBaseRef} on:input={() => {enforceMinMax(lifeBaseRef)}} type="number" name="lifeBase" min="1" max="8181" step="1" bind:value="{save.attributes.life_base.integer}">
                </div>
            </div>
            <div class="row resource">
                <div class="col">
                    <label for="manaCurrent">Current Mana</label>
                    <input bind:this = {manaCurrentRef} on:input={() => {enforceMinMax(manaCurrentRef)}} type="number" name="manaCurrent" min="1" max="8181" step="1" bind:value="{save.attributes.mana_current.integer}">
                </div>
                <p>&emsp;/&emsp;</p>
                <div class="col">
                    <label for="manaBase">Base Mana</label>
                    <input bind:this = {manaBaseRef} on:input={() => {enforceMinMax(manaBaseRef)}} type="number" name="manaBase" min="1" max="8181" step="1" bind:value="{save.attributes.mana_base.integer}">
                </div>
            </div>
            <div class="row resource">
                <div class="col">
                    <label for="staminaCurrent">Current Stamina</label>
                    <input bind:this = {staminaCurrentRef} on:input={() => {enforceMinMax(staminaCurrentRef)}} type="number" name="staminaCurrent" min="1" max="8181" step="1" bind:value="{save.attributes.stamina_current.integer}">
                </div>
                <p>&emsp;/&emsp;</p>
                <div class="col">
                    <label for="staminaBase">Base Stamina</label>
                    <input bind:this = {staminaBaseRef} on:input={() => {enforceMinMax(staminaBaseRef)}} type="number" name="staminaBase" min="1" max="8181" step="1" bind:value="{save.attributes.stamina_base.integer}">
                </div>
            </div>
            <div class="row resource">
                <div class="col" style="flex-grow: 1;">
                    <label for="statPointsLeft">Stat Points Left</label>
                    <input bind:this = {statPointsLeftRef} on:input={() => {enforceMinMax(statPointsLeftRef)}} type="number" name="statPointsLeft" min="0" max="1023" step="1" bind:value="{save.attributes.stat_points_left}">
                </div>
                <div class="col">
                    <label for="skillPointsLeft">Skill Points Left</label>
                    <input bind:this = {skillPointsLeftRef} on:input={() => {enforceMinMax(skillPointsLeftRef)}} type="number" name="statPointsLeft" min="0" max="255" step="1" bind:value="{save.attributes.skill_points_left}">
                </div>
            </div>
        </fieldset>
    </div>
    <div class="container">
        <fieldset id="gold">
            <legend>Gold</legend>
            <div>
                <label for="goldInventory">Gold In Inventory</label>
                <input bind:this = {goldInventoryRef} type="number" name="goldInventory" min="0" max="10000" step="1"  on:input={() => {enforceMinMax(goldInventoryRef)}} bind:value="{save.attributes.gold_inventory}">
            </div>
            <div>
                <label for="goldStash">Gold In Stash</label>
                <input bind:this = {goldStashRef} type="number" name="goldStash" min="0" max="2500000" step="1" on:input={() => {enforceMinMax(goldStashRef)}} bind:value="{save.attributes.gold_stash}">
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