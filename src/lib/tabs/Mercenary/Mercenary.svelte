<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { InfoIcon} from "lucide-svelte";
    import { Tooltip } from "@svelte-plugins/tooltips";
    import names from "./names.json";
    import variants from "./variants.json";
    import {Difficulty, Act, u32MAX} from "../../utils/Constants.svelte";
    import {enforceMinMax} from "../../utils/Utils.svelte";

    console.log(variants);
    export let save;

    const MercenaryClass = {
        Rogue: "Rogue",
        Desert: "Desert Mercenary",
        IronWolf: "Iron Wolf",
        Barbarian: "Barbarian"
    }

    function xpFromLevel(level, rate){
        return rate * (level + 1) * (level * level);
    }

    function levelFromXp(experience, rate){
        let xpConstant = experience/rate;
        let s = Math.floor(Math.pow(xpConstant, 1/3));
        if (xpConstant < (Math.pow(s, 3) + Math.pow(s, 2))) {
            return (s - 1)
        } else {
            return s
        }
    }

    function variantIDToInfo(variantID){
        const result = variants.filter((info) => info.id == variantID);
        if (result.length != 1){
            console.log(`Error trying to get variant from variant id ${variantID}.`);
            return variants[0];
        }
        return JSON.parse(JSON.stringify(result[0]));
    }

    function hire(){
        isHired = !isHired;
        save.character.mercenary.id = isHired ? Math.floor(Math.random() * u32MAX) : 0;
    }


    // References
    let idRef, nameRef, hiredRef;
    let classRef, variantRef, difficultyRef;
    let experienceRef, levelRef;


    $: isHired = save.character.mercenary.id != 0;

    // Variants
    let mercVariant = variantIDToInfo(save.character.mercenary.variant_id);

    let possibleVariants = variants.filter((merc) => merc.difficulty == mercVariant.difficulty && merc.type == mercVariant.type);

    function updateVariant(){
        console.log(variants);
        possibleVariants = variants.filter((merc) => merc.difficulty == mercVariant.difficulty && merc.type == mercVariant.type);
        changeExperience();
        console.log(possibleVariants);
    }

    // Experience
    let mercLevel = levelFromXp(save.character.mercenary.experience, mercVariant.rate);

    function changeExperience(){
        mercLevel = levelFromXp(save.character.mercenary.experience, mercVariant.rate)
    }

    function changeLevel(){
        save.character.mercenary.experience = xpFromLevel(mercLevel, mercVariant.rate)
    }

    // Names
    let variantNames = names[mercVariant.type];

    function updateName(){
        variantNames = names[mercVariant.type];
        save.character.mercenary.name_id = Math.floor(Math.random()*variantNames.length);
    }

    $: if (variantNames.length > 0) { save.character.mercenary.name = variantNames[save.character.mercenary.name_id]; }


    
    

</script>

<div class="row flex-center spaced">
    <fieldset id="status" class="row flex-center spaced">
        <legend>Status</legend>

        <div class="row">
            <input bind:this={hiredRef} type="checkbox" id="hired" name="hired" on:change="{hire}" bind:checked={isHired}>
            <label style="font-weight:bold" for="hired">Hired</label>
        </div>

        <div class="row">
            <input type="checkbox" id="dead" name="dead" bind:checked="{save.character.mercenary.dead}" disabled={!isHired}>
            <label for="dead">Dead</label>
        </div>

        <div class="col">
            <label for="id">ID</label>
            <input bind:this = {idRef} type="number" name="id" min="0" max={u32MAX} step="1" bind:value="{save.character.mercenary.id}" readonly>
        </div>

        <div class="col">
            <label for="name">Name</label>
            <select bind:value={save.character.mercenary.name_id} name="name_id" id="name_id" disabled={!isHired}>
                {#each variantNames as name, index}
                    <option value="{index}">{name}</option>
                {/each}
            </select>
        </div>
    </fieldset>
    <fieldset id="level" class="row flex-center">
        <legend>Level</legend>
        <div class="col">
            <label for="level">Level&nbsp;
                <Tooltip content="<p style='text-align:center'>Hirelings need different amounts of XP per level depending on their class.</p>" position={"bottom"}>
                    <InfoIcon size={18}/>
                </Tooltip></label>
            <input bind:this = {levelRef} type="number" name="id" min="1" max="98" step="1" bind:value="{mercLevel}" on:input={() => {changeLevel(); enforceMinMax(levelRef);}} disabled={!isHired}>
        </div>
    
    
        <div class="col">
            <label for="experience">Experience</label>
            <input bind:this = {experienceRef} type="number" name="id" min="0" max={u32MAX} step="1" bind:value="{save.character.mercenary.experience}" on:input={() => {changeExperience(); enforceMinMax(experienceRef);}} disabled={!isHired}>
        </div>
    </fieldset>
</div>

<fieldset id="variant" class="grid-3 flex-center">
    <legend>Mercenary Type</legend>
    <div class="col">
        <label for="difficultyHired">Difficulty Hired</label>
        <select bind:value={mercVariant.difficulty} name="difficultyHired" id="difficultyHired"  on:change={updateVariant} disabled={!isHired}>
            <option value={Difficulty.Normal}>Normal</option>
            <option value={Difficulty.Nightmare}>Nightmare</option>
            <option value={Difficulty.Hell}>Hell</option>
            
        </select>
    </div>

    <div class="col">
        <label for="class">Class</label>
        <select bind:value={mercVariant.type} name="class" id="class" on:change={() => {updateVariant(); updateName(); }} disabled={!isHired}>
            <option value={MercenaryClass.Rogue}>Rogue</option>
            <option value={MercenaryClass.Desert}>Desert Mercenary</option>
            <option value={MercenaryClass.IronWolf}>Iron Wolf</option>
            <option value={MercenaryClass.Barbarian}>Barbarian</option>
            
        </select>
    </div>

    <div class="col">
        <label for="variant">Variant</label>
            <select bind:value={mercVariant.variant} name="variant" id="mercVariant" on:change={() => {updateVariant(); }} disabled={!isHired}>
                {#each possibleVariants as merc}
                    <option value="{merc["variant"]}">{merc["variant"]}</option>
                {/each}
            </select> 
    </div>


</fieldset>

<div class="grid-5 flex-center">
    
</div>

