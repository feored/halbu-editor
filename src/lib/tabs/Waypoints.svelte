<script>
    import { tooltip } from "./../utils/actions.js";
    import { InfoIcon } from "lucide-svelte";

    export let save;

    const ROGUE_ENCAMPMENT = "RogueEncampment";

    let difficulties = [
        {
            id: "normal",
            display: "Normal",
            acts: {
                act1: false,
                act2: false,
                act3: false,
                act4: false,
                act5: false,
            },
        },
        {
            id: "nightmare",
            display: "Nightmare",
            acts: {
                act1: false,
                act2: false,
                act3: false,
                act4: false,
                act5: false,
            },
        },
        {
            id: "hell",
            display: "Hell",
            acts: {
                act1: false,
                act2: false,
                act3: false,
                act4: false,
                act5: false,
            },
        },
    ];

    let acts = [
        { id: "act1", display: "Act I" },
        { id: "act2", display: "Act II" },
        { id: "act3", display: "Act III" },
        { id: "act4", display: "Act IV" },
        { id: "act5", display: "Act V" },
    ];

    // Initialize checkboxes
    for (let i = 0; i < difficulties.length; i++) {
        for (let j = 0; j < acts.length; j++) {
            let same = true;
            for (let k = 1; k < save.waypoints[difficulties[i].id][acts[j].id].length; k++) {
                if (
                    save.waypoints[difficulties[i].id][acts[j].id][k].acquired !=
                    save.waypoints[difficulties[i].id][acts[j].id][k - 1].acquired
                ) {
                    same = false;
                    break;
                }
            }
            if (same) {
                difficulties[i].acts[acts[j].id] =
                    save.waypoints[difficulties[i].id][acts[j].id][1].acquired;
            }
        }
    }

    function toggleActWaypoints(difficulty, act) {
        difficulty.acts[act.id] = !difficulty.acts[act.id];
        setActWaypoints(difficulty, act, difficulty.acts[act.id]);
    }

    function setActWaypoints(difficulty, act, value) {
        for (let i = 0; i < save.waypoints[difficulty.id][act.id].length; i++) {
            if (save.waypoints[difficulty.id][act.id][i].id != ROGUE_ENCAMPMENT) {
                save.waypoints[difficulty.id][act.id][i].acquired = value;
            }
        }
    }

    function CheckActWaypoints(difficulty, act) {
        console.log(difficulty.display);
        console.log(act.display);
        let same = true;
        for (let i = 1; i < save.waypoints[difficulty.id][act.id].length; i++) {
            if (save.waypoints[difficulty.id][act.id][i - 1].id != ROGUE_ENCAMPMENT) {
                console.log(save.waypoints[difficulty.id][act.id][i - 1].id);
                if (
                    save.waypoints[difficulty.id][act.id][i - 1].acquired !=
                    save.waypoints[difficulty.id][act.id][i].acquired
                ) {
                    same = false;
                    break;
                }
            }
        }

        if (same) {
            difficulties.find((diff) => (diff.id === difficulty.id)).acts[act.id] =
                save.waypoints[difficulty.id][act.id][1].acquired; // don't use 0 because 0 is rogue encampment and is always on
            difficulties = difficulties; // Used to let Svelte know the array has changed https://learn.svelte.dev/tutorial/updating-arrays-and-objects
        }
    }
</script>

{#each difficulties as difficulty}
    <article>
        <header>
            <div class="row spaced" style="align-items:baseline;">
                <h5>{difficulty.display}</h5>
            </div>
        </header>
        <div class="grid" style="width:100%;">
            {#each acts as act}
                <fieldset>
                    <div class="row spaced" style="align-items:baseline;">
                        <legend><b>{act.display}</b></legend><input
                            type="checkbox"
                            name="actWaypoints"
                            bind:checked={difficulty.acts[act.id]}
                            on:click={() => toggleActWaypoints(difficulty, act)}
                        />
                    </div>
                    {#each save.waypoints[difficulty.id][act.id] as wp}
                        <div>
                            <input
                                type="checkbox"
                                id={wp.act + wp.id}
                                name={wp.act + wp.id}
                                bind:checked={wp.acquired}
                                disabled={wp.id === ROGUE_ENCAMPMENT}
                                on:change={() => CheckActWaypoints(difficulty, act)}
                            />
                            <label for={wp.act + wp.id}>{wp.name}</label>
                            {#if wp.id === ROGUE_ENCAMPMENT}
                                <span
                                    use:tooltip={{
                                        content:
                                            "<p style='text-align:center'>The Rogue Encampment is acquired by default.</p>",
                                        allowHTML: true,
                                        placement: "bottom",
                                        theme: "halbu",
                                        arrow: true,
                                        animation: "shift-toward",
                                        hideOnClick: false,
                                    }}><InfoIcon size={16} /></span
                                >
                            {/if}
                        </div>
                    {/each}
                </fieldset>
            {/each}
        </div>
    </article>
{/each}

<style>
</style>
