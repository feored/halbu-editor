<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { InfoIcon} from "lucide-svelte";
    import { Tooltip } from "@svelte-plugins/tooltips";
    import { Message, buildMessage} from "../../utils/Message.svelte";
    import { createEventDispatcher } from 'svelte';
    import { enforceMinMax } from "../../utils/actions.js";

    import titles from "./titles.json";
    import experienceTable from "./experience.json";
    import {Class, Difficulty, Act} from "../../utils/Constants.svelte";

   
    export const dispatch = createEventDispatcher();
    function dispatchMessage(id, data) {
        dispatch('message', buildMessage(id, data));
    }
    
    

    export let save;


    const MAX_GOLD_PER_LEVEL = 10000;
    const MAX_XP = 3520485254;

    let nameRef;

    $: goldInventoryMax = MAX_GOLD_PER_LEVEL * save.character.level;

    let currentLife = save.attributes.hitpoints.value / 256;
    $: save.attributes.hitpoints.value = Math.round(currentLife*256);

    let baseLife = save.attributes.maxhp.value / 256;
    $: save.attributes.maxhp.value = Math.round(baseLife*256);

    let currentMana = save.attributes.mana.value / 256;
    $: save.attributes.mana.value = Math.round(currentMana*256);

    let baseMana = save.attributes.maxmana.value / 256;
    $: save.attributes.maxmana.value = Math.round(baseMana*256);

    let currentStamina = save.attributes.stamina.value / 256;
    $: save.attributes.stamina.value = Math.round(currentStamina*256);

    let baseStamina = save.attributes.maxstamina.value / 256;
    $: save.attributes.maxstamina.value = Math.round(baseStamina*256);


    // Title & Progression

    let difficultyBeatenRef;
    
    let difficultiesToBeat = ["None", "Normal", "Nightmare", "Hell"];
    let difficultyBeaten = difficultiesToBeat[Math.floor(save.character.progression / (4 + (save.character.expansion ? 1 : 0)))];

    let title = "";
    updateTitle();

    function updateTitle(){
        save.character.progression = (4 + (save.character.status.expansion ? 1 : 0)) * (difficultiesToBeat.indexOf(difficultyBeaten));
        let gender = [Class.Amazon, Class.Assassin, Class.Sorceress].includes(save.character.class) ? "Female" : "Male";
        let core = save.character.status.hardcore ? "Hardcore" : "Softcore";
        let expansion = save.character.status.expansion ? "Expansion" : "Classic";
        title = titles[core][expansion][difficultyBeaten][gender];
    }

    // Level & XP

    async function changeLevel(){
        if (save.character.level == save.attributes.level.value){
            return // if we have changed to the same value, don't erase old xp
        }
        save.character.level = save.attributes.level.value;
        save.attributes.experience.value = experienceTable[save.attributes.level.value-1];
    }

    async function changeExperience(){
        let new_level = 99;
        for (let i=0; i < 99;  i++){
            if (experienceTable[i] > save.attributes.experience.value){
                new_level = i-1;
                break;
            }
        }
        if (new_level != save.attributes.level.value) {
            save.attributes.level.value = new_level;
            save.character.level = new_level;
        }
    }

    // Name validation

    let validName = true;

    function validateName(){
        let nameByteSize = new Blob([nameRef.value]).size;
        let characterByteSize = new Blob([nameRef.value.charAt(0)]).size;
        let characters = nameByteSize / characterByteSize;
        if (characters < 2 || characters > 15){
            validName = false;
            return
        }
        if (!RegExp(/^\p{L}[\p{L},_,\-]/,'u').test(nameRef.value)){
            // Check that string starts with a unicode letters
            // and only contains unicode letters or _ -
            validName = false;
            return
        }
        let dashes = 0;
        let underscores = 0;
        let i = nameRef.value.length;
        while (i--) {
            if (nameRef.value.charAt(i) == "-") {
                dashes++;
            } else if (nameRef.value.charAt(i) === "_"){
                underscores++
            }
        }
        if (dashes > 1 || underscores > 1){
            validName = false;
            return
        }
        console.log("valid name.");
        validName = true;
        save.character.name = nameRef.value;
    }
</script>


<fieldset id="info" class="row spaced">
    <legend>Information</legend>
        <div class="col">
            <label for="name" >
                Name
                &nbsp;
                <Tooltip content="<ul><li>2-15 characters</li><li>Only 1 _ and - allowed</li><li>Must begin with a letter</li><li>No numbers</li><li>No mixing languages</li></ul>" position={"bottom"}>
                    <InfoIcon size={18}/>
                </Tooltip>
            </label>
                <input class={validName == false ? "invalid" : ""} on:keydown={validateName} on:input={validateName} on:change={validateName}
                title="2-15 characters" bind:this = {nameRef} type="text" id="name" placeholder="default" name="name" required minlength="2"
                maxlength="15" size="15" value="{save.character.name}" style="width:15em;"/>
        </div>
        <div class="col">
            <label for="class">Class</label>
            <select bind:value={save.character.class} name="class" id="class" on:change={updateTitle} >
                <option value="{Class.Amazon}">Amazon</option>
                <option value="{Class.Assassin}">Assassin</option>
                <option value="{Class.Barbarian}">Barbarian</option>
                <option value="{Class.Druid}">Druid</option>
                <option value="{Class.Necromancer}">Necromancer</option>
                <option value="{Class.Paladin}">Paladin</option>
                <option value="{Class.Sorceress}">Sorceress</option>
            </select>
        </div>
        <div class="col">
            <label for="mapSeed">Map Seed</label>
            <input type="number" name="mapSeed" min="0" max="4294967295" step="1" use:enforceMinMax bind:value="{save.character.map_seed}">
        </div>
</fieldset>
<div class="row spaced">
    <fieldset id="levelxp" class="row spaced flex-center">
        <legend>Level</legend>
        <div id="level">
            <label for="level">Level</label>
            <input type="number" name="level" min="1" max="99" step="1" use:enforceMinMax bind:value="{save.attributes.level.value}" on:input={changeLevel} >
        </div>
        <div id="experience">
            <label for="experience">Experience</label>
            <input type="number" name="experience" min="0" max={MAX_XP} step="1" use:enforceMinMax bind:value="{save.attributes.experience.value}" on:input={changeExperience} >
        </div>
    </fieldset>
    <fieldset id="status" class="grid-4 flex-center">
        <legend>Status</legend>

        <div class="row">
            <input type="checkbox" id="expansion" name="expansion" bind:checked="{save.character.status.expansion}" disabled = {save.character.class === "Druid" || save.character.class === "Assassin"} on:change={updateTitle}>
            <label for="expansion">Expansion</label>
        </div>

        <div class="row">
            <input type="checkbox" id="hardcore" name="hardcore" bind:checked="{save.character.status.hardcore}" on:change={updateTitle}>
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
<div class="row spaced">
        <fieldset id="attributes" class="col flex-center">
            <legend>Attributes</legend>
            <div>
                <label for="strength">Strength</label>
                <input type="number" name="strength" min="0" max="1023" step="1" use:enforceMinMax bind:value="{save.attributes.strength.value}">
            </div>
            <div>
                <label for="dexterity">Dexterity</label>
                <input type="number" name="dexterity" min="0" max="1023" step="1" use:enforceMinMax bind:value="{save.attributes.dexterity.value}">
            </div>
            <div>
                <label for="vitality">Vitality</label>
                <input type="number" name="vitality" min="0" max="1023" step="1" use:enforceMinMax bind:value="{save.attributes.vitality.value}">
            </div>
            <div>
                <label for="energy">Energy</label>
                <input type="number" name="energy" min="0" max="1023" step="1" use:enforceMinMax bind:value="{save.attributes.energy.value}">
            </div>
        </fieldset>
        <fieldset id="resources" class="grid-2">
            <legend>Resources</legend>
                <div class="col">
                    <label for="lifeCurrent">Current Life</label>
                    <input  use:enforceMinMax type="number" name="lifeCurrent" min="1" max="8181" step="0.001" bind:value="{currentLife}">                
                </div>
                
                <div class="col">
                    <label for="lifeBase">Base Life</label>
                    <input use:enforceMinMax type="number" name="lifeBase" min="1" max="8181" step="0.001" bind:value="{baseLife}">
                </div>
                
                <div class="col">
                    <label for="manaCurrent">Current Mana</label>
                    <input use:enforceMinMax type="number" name="manaCurrent" min="1" max="8181" step="0.001" bind:value="{currentMana}">
                </div>

                <div class="col">
                    <label for="manaBase">Base Mana</label>
                    <input use:enforceMinMax type="number" name="manaBase" min="1" max="8181" step="0.001" bind:value="{baseMana}">
                </div>

                <div class="col">
                    <label for="staminaCurrent">Current Stamina</label>
                    <input use:enforceMinMax type="number" name="staminaCurrent" min="1" max="8181" step="0.001" bind:value="{currentStamina}">
                </div>

                <div class="col">
                    <label for="staminaBase">Base Stamina</label>
                    <input use:enforceMinMax type="number" name="staminaBase" min="1" max="8181" step="0.001" bind:value="{baseStamina}">
                </div>

                <div class="col">
                    <label for="statPointsLeft">Stat Points Left</label>
                    <input use:enforceMinMax type="number" name="statPointsLeft" min="0" max="1023" step="1" bind:value="{save.attributes.statpts.value}">
                </div>

                <div class="col">
                    <label for="skillPointsLeft">Skill Points Left</label>
                    <input use:enforceMinMax type="number" name="skillPointsLeft" min="0" max="255" step="1" bind:value="{save.attributes.newskills.value}">
                </div>
        </fieldset>
        <div class="grid-1">
            <fieldset id="gold" class="grid-2">
                <legend>Gold</legend>
                <div>
                    <label for="goldInventory">Inventory</label>
                    <input use:enforceMinMax type="number" name="goldInventory" min="0" max={goldInventoryMax} step="1" bind:value="{save.attributes.gold.value}">
                </div>
                <div>
                    <label for="goldStash">Stash</label>
                    <input use:enforceMinMax type="number" name="goldStash" min="0" max="2500000" step="1" bind:value="{save.attributes.goldbank.value}">
                </div>
            </fieldset>
        
            <fieldset id="difficulty" class="grid-2">
                <legend>Difficulty</legend>
                <div>
                    <label for="difficultyBeaten">Difficulty Beaten</label>
                    <select bind:value={difficultyBeaten} on:change={updateTitle} name="currentDifficulty">
                        <option value="None" selected={difficultyBeaten === "None"}>None</option>
                        <option value="Normal" selected={difficultyBeaten === "Normal"}>Normal</option>
                        <option value="Nightmare" selected={difficultyBeaten === "Nightmare"}>Nightmare</option>
                        <option value="Hell" selected={difficultyBeaten === "Hell"}>Hell</option>
                    </select>
                </div>
                <div>
                    <label for="title">Title</label>
                    <input type="text" name="title" size="10" bind:value="{title}" readonly />
                </div>
                <div>
                    <label for="currentDifficulty">Current Difficulty</label>
                    <select bind:value={save.character.difficulty} name="currentDifficulty">
                        <option value={Difficulty.Normal}>Normal</option>
                        <option value={Difficulty.Nightmare}>Nightmare</option>
                        <option value={Difficulty.Hell}>Hell</option>
                    </select>
                </div>
                <div>
                    <label for="currentAct">Current Act</label>
                    <select bind:value={save.character.act} name="currentAct">
                        <option value={Act.Act1}>Act I</option>
                        <option value={Act.Act2}>Act II</option>
                        <option value={Act.Act3}>Act III</option>
                        <option value={Act.Act4}>Act IV</option>
                        <option value={Act.Act5}>Act V</option>
                    </select>
                </div>
            </fieldset>
    </div>
</div>



<style>

</style>