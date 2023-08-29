<script>
    import { invoke } from "@tauri-apps/api/tauri";
    import { InfoIcon } from "lucide-svelte";
    import names from "./names.json";
    import variants from "./variants.json";
    import { Difficulty, Act, u32MAX } from "../../utils/Constants.svelte";
    import { enforceMinMax, tooltip } from "../../utils/actions.js";

    export let save;

    const MercenaryClass = {
        Rogue: "Rogue",
        Desert: "Desert Mercenary",
        IronWolf: "Iron Wolf",
        Barbarian: "Barbarian",
    };

    function xpFromLevel(level, rate) {
        return rate * (level + 1) * (level * level);
    }

    function levelFromXp(experience, rate) {
        let xpConstant = experience / rate;
        let s = Math.floor(Math.pow(xpConstant, 1 / 3));
        if (xpConstant < Math.pow(s, 3) + Math.pow(s, 2)) {
            return s - 1;
        } else {
            return s;
        }
    }

    function variantIDToInfo(variantID) {
        const result = variants.filter((info) => info.id == variantID);
        if (result.length != 1) {
            console.error(
                `Error trying to get variant from variant id ${variantID}.`
            );
            return variants[0];
        }
        return JSON.parse(JSON.stringify(result[0]));
    }

    // Check if mercenary is hired and disable everything if not

    function hire() {
        isHired = !isHired;
        save.character.mercenary.id = isHired
            ? Math.floor(Math.random() * u32MAX)
            : 0;
    }

    let hiredRef;
    $: isHired = save.character.mercenary.id != 0;

    // Variants
    let mercVariant = variantIDToInfo(save.character.mercenary.variant_id);

    let possibleVariants = variants.filter(
        (merc) =>
            merc.difficulty == mercVariant.difficulty &&
            merc.type == mercVariant.type
    );

    function updateVariant() {
        possibleVariants = variants.filter(
            (merc) =>
                merc.difficulty == mercVariant.difficulty &&
                merc.type == mercVariant.type
        );
        changeExperience();
    }

    // Experience
    let mercLevel = levelFromXp(
        save.character.mercenary.experience,
        mercVariant.rate
    );

    function changeExperience() {
        mercLevel = levelFromXp(
            save.character.mercenary.experience,
            mercVariant.rate
        );
    }

    function changeLevel() {
        save.character.mercenary.experience = xpFromLevel(
            mercLevel,
            mercVariant.rate
        );
    }

    // Names
    let variantNames = names[mercVariant.type];

    function updateName() {
        variantNames = names[mercVariant.type];
        save.character.mercenary.name_id = Math.floor(
            Math.random() * variantNames.length
        );
    }

    $: if (variantNames.length > 0) {
        save.character.mercenary.name =
            variantNames[save.character.mercenary.name_id];
    }
</script>

<article>
    <header>
        <h5>Status</h5>
    </header>
    <div class="grid" style="align-items:center">
        <div>
            <input
                aria-invalid={!isHired}
                role="switch"
                bind:this={hiredRef}
                type="checkbox"
                id="hired"
                name="hired"
                on:change={hire}
                bind:checked={isHired}
            />
            <label for="hired"><b>{isHired ? "Hired" : "Not Hired"}</b></label>
        </div>

        <div>
            <input
                role="switch"
                type="checkbox"
                id="dead"
                name="dead"
                bind:checked={save.character.mercenary.dead}
                disabled={!isHired}
            />
            <label for="dead"
                >{save.character.mercenary.dead ? "Dead" : "Alive"}</label
            >
        </div>

        <div>
            <label for="id">ID</label>
            <input
                type="number"
                name="id"
                min="0"
                max={u32MAX}
                step="1"
                bind:value={save.character.mercenary.id}
                readonly
            />
        </div>
        <div>
            <label for="name">Name</label>
            <select
                bind:value={save.character.mercenary.name_id}
                name="name_id"
                id="name_id"
                disabled={!isHired}
            >
                {#each variantNames as name, index}
                    <option value={index}>{name}</option>
                {/each}
            </select>
        </div>
    </div>
    <div class="grid" style="align-items:center">
        <div>
            <label for="level"
                >Level&nbsp;
                <span
                    use:tooltip={{
                        content:
                            "<p style='text-align:center'>Hirelings need different amounts of XP per level depending on their class and the difficulty they were hired in.</p>",
                        allowHTML: true,
                        placement: "bottom",
                        theme: "halbu",
                        arrow: true,
                        animation: "shift-toward",
                        hideOnClick: false,
                    }}
                >
                    <InfoIcon size={18} />
                </span></label
            >
            <input
                use:enforceMinMax
                type="number"
                name="id"
                min="1"
                max="98"
                step="1"
                bind:value={mercLevel}
                on:input={changeLevel}
                disabled={!isHired}
            />
        </div>

        <div>
            <label for="experience">Experience</label>
            <input
                use:enforceMinMax
                type="number"
                name="id"
                min="0"
                max={u32MAX}
                step="1"
                bind:value={save.character.mercenary.experience}
                on:input={changeExperience}
                disabled={!isHired}
            />
        </div>
    </div>
</article>
<article>
    <header>
        <h5>Hireling Type</h5>
    </header>
    <fieldset id="variant" class="grid">
        <div>
            <label for="difficultyHired">Difficulty Hired</label>
            <select
                bind:value={mercVariant.difficulty}
                name="difficultyHired"
                id="difficultyHired"
                on:change={updateVariant}
                disabled={!isHired}
            >
                <option value={Difficulty.Normal}>Normal</option>
                <option value={Difficulty.Nightmare}>Nightmare</option>
                <option value={Difficulty.Hell}>Hell</option>
            </select>
        </div>

        <div>
            <label for="class">Class</label>
            <select
                bind:value={mercVariant.type}
                name="class"
                id="class"
                on:change={() => {
                    updateVariant();
                    updateName();
                }}
                disabled={!isHired}
            >
                <option value={MercenaryClass.Rogue}>Rogue</option>
                <option value={MercenaryClass.Desert}>Desert Mercenary</option>
                <option value={MercenaryClass.IronWolf}>Iron Wolf</option>
                <option value={MercenaryClass.Barbarian}>Barbarian</option>
            </select>
        </div>

        <div>
            <label for="variant">Variant</label>
            <select
                bind:value={mercVariant.variant}
                name="variant"
                id="mercVariant"
                on:change={() => {
                    updateVariant();
                }}
                disabled={!isHired}
            >
                {#each possibleVariants as merc}
                    <option value={merc["variant"]}>{merc["variant"]}</option>
                {/each}
            </select>
        </div>
    </fieldset>
</article>

<div class="grid-5 flex-center" />
