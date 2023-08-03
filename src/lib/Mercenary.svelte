<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { onMount } from 'svelte';
    import { InfoIcon} from "lucide-svelte";
    import { Tooltip } from "@svelte-plugins/tooltips";

    export let save;

    onMount(() => {
        get_names();
        changeExperience()
    });

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


    let idRef, nameRef;
    let classRef, variantRef, difficultyRef;
    let experienceRef, levelRef;

    let mercenaryHired = save.character.mercenary.id != 0;
    $: save.character.mercenary.id = mercenaryHired ? Math.floor(Math.random() * 4294967295) : 0;
    
    // Handle mercenary levels/xp calculations
    let mercLevel;

    async function changeExperience(){
        await invoke("mercenary_get_level_from_xp", {mercenary: save.character.mercenary})
        .then((level) => {
            mercLevel = level;
        })
    }

    async function changeLevel(){
        await invoke("mercenary_get_xp_from_level", {mercenary: save.character.mercenary, level: mercLevel})
        .then((experience) => {
            save.character.mercenary.experience = experience;
        })
    }

    // Handle mercenary names
    let variantNames = [];

    async function get_names() {
        await invoke("mercenary_get_names", {variant: save.character.mercenary.variant})
        .then((names) => {
            variantNames = names;
        })
    }    
    
    // Handle mercenary class/difficulty/variant
    async function changeClass(){
        if (difficultyHired === "Normal"){
            mercenaryVariant = variantsNormal[mercenaryClass][0]["variant"]
        } else {
            mercenaryVariant = variantsNMHell[mercenaryClass][0]["variant"]
        }
        updateVariant();
        
    }

    async function updateName(){
        await get_names();
        save.character.mercenary.name_id = Math.floor(Math.random()*variantNames.length);
    }

    $: if (variantNames.length > 0) { save.character.mercenary.name = variantNames[save.character.mercenary.name_id]; }


    let difficulties = ["Normal", "Nightmare", "Hell"];
    let classes = [
        {"class": "Rogue", "display": "Rogue"},
        {"class": "DesertMercenary", "display":"Desert Mercenary"},
        {"class": "IronWolf", "display": "Iron Wolf"},
        {"class": "Barbarian", "display": "Barbarian"}
    ];

    let variantsNormal = {
        "Rogue" : [
            {"variant": "Fire", "display": "Fire"},
            {"variant": "Cold", "display": "Cold"}
        ],
        "DesertMercenary": [
            {"variant": "Prayer", "display": "Prayer"},
            {"variant": "Defiance", "display": "Defiance"}, 
            {"variant": "BlessedAim", "display": "Blessed Aim"}
        ],
        "IronWolf": [
            {"variant": "Fire", "display": "Fire"},
            {"variant": "Cold", "display": "Cold"},
            {"variant": "Lightning", "display": "Lightning"}
        ],
        "Barbarian": [
            {"variant": "Bash", "display": "Bash"},
            {"variant": "Frenzy", "display": "Frenzy"}
        ]
    };

    let variantsNMHell = {
        "Rogue" : [
            {"variant": "Fire", "display": "Fire"},
            {"variant": "Cold", "display": "Cold"}
        ],
        "DesertMercenary": [
            {"variant": "Thorns", "display": "Thorns"},
            {"variant": "HolyFreeze", "display": "Holy Freeze"},
            {"variant": "Might", "display": "Might"},
            {"variant": "Prayer", "display": "Prayer"},
            {"variant": "Defiance", "display": "Defiance"}, 
            {"variant": "BlessedAim", "display": "Blessed Aim"}
        ],
        "IronWolf": [
            {"variant": "Fire", "display": "Fire"},
            {"variant": "Cold", "display": "Cold"},
            {"variant": "Lightning", "display": "Lightning"}
        ],
        "Barbarian": [
            {"variant": "Bash", "display": "Bash"},
            {"variant": "Frenzy", "display": "Frenzy"}
        ]
    };

    let difficultyHired = save.character.mercenary.variant[1];
    let mercenaryClass = Object.keys(save.character.mercenary.variant[0])[0]
    let mercenaryVariant = save.character.mercenary.variant[0][mercenaryClass]

    // Dynamic, computed key
    function updateVariant(){
        save.character.mercenary.variant = [{[mercenaryClass]: mercenaryVariant}, difficultyHired]
        changeExperience()
    }
    

</script>

<div class="row spaced">
    <fieldset id="status" class="row flex-center spaced">
        <legend>Status</legend>

        <div class="row">
            <input type="checkbox" id="hired" name="hired" bind:checked="{mercenaryHired}">
            <label style="font-weight:bold" for="hired">Hired</label>
        </div>

        <div class="row">
            <input type="checkbox" id="dead" name="dead" bind:checked="{save.character.mercenary.dead}">
            <label for="dead">Dead</label>
        </div>

        <div class="col">
            <label for="id">ID</label>
            <input bind:this = {idRef} type="number" name="id" min="0" max="4294967295" step="1" bind:value="{save.character.mercenary.id}" readonly>
        </div>

        <div class="col">
            <label for="name">Name</label>
            <select bind:value={save.character.mercenary.name_id} name="name_id" id="name_id">
                {#each variantNames as name, index}
                    <option value="{index}">{name}</option>
                {/each}
            </select>
        </div>
    </fieldset>
    <fieldset id="level" class="row spaced">
        <legend>Level</legend>
        <div class="col">
            <label for="level">Level&nbsp;
                <Tooltip content="<p style='text-align:center'>Hirelings need different amounts of XP per level depending on their class.</p>" position={"bottom"}>
                    <InfoIcon size={18}/>
                </Tooltip></label>
            <input bind:this = {levelRef} type="number" name="id" min="1" max="98" step="1" bind:value="{mercLevel}" on:input={() => {changeLevel(); enforceMinMax(levelRef);}}>
        </div>
    
    
        <div class="col">
            <label for="experience">Experience</label>
            <input bind:this = {experienceRef} type="number" name="id" min="0" max="4294967295" step="1" bind:value="{save.character.mercenary.experience}" on:input={() => {changeExperience(); enforceMinMax(experienceRef);}} >
        </div>
    </fieldset>
</div>

<fieldset id="variant" class="grid-3 flex-center">

    <div class="col">
        <label for="difficultyHired">Difficulty Hired</label>
        <select bind:value={difficultyHired} name="difficultyHired" id="difficultyHired"  on:change={updateVariant}>
            {#each difficulties as difficulty}
                <option value="{difficulty}">{difficulty}</option>
            {/each}
        </select>
    </div>

    <div class="col">
        <label for="class">Class</label>
        <select bind:value={mercenaryClass} name="class" id="class" on:change={() => {changeClass();updateName(); }}>
            {#each classes as mercClass}
                <option value="{mercClass["class"]}">{mercClass["display"]}</option>
            {/each}
        </select>
    </div>

    <div class="col">
        <label for="variant">Variant</label>
            <select bind:value={mercenaryVariant} name="variant" id="mercVariant" on:change={() => {updateVariant(); }}>
                {#if difficultyHired === "Normal"}
                    {#each variantsNormal[mercenaryClass] as mercVariant}
                        <option value="{mercVariant["variant"]}">{mercVariant["display"]}</option>
                    {/each}
                {:else}
                    {#each variantsNMHell[mercenaryClass] as mercVariant}
                        <option value="{mercVariant["variant"]}">{mercVariant["display"]}</option>
                    {/each}
                {/if}
            </select> 
    </div>


</fieldset>

<div class="grid-5 flex-center">
    
</div>

