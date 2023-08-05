<script>
    export let save;

    const ROGUE_ENCAMPMENT = "RogueEncampment";
    
    let difficulties = [
        {id:"normal", display:"Normal"}, 
        {id:"nightmare", display: "Nightmare"},
        {id:"hell", display:"Hell"}
    ];

    let acts = [
        {id:"act1", display:"Act I"},
        {id:"act2", display:"Act II"},
        {id:"act3", display:"Act III"},
        {id:"act4", display:"Act IV"},
        {id:"act5", display:"Act V"},
    ];

    function setAllWaypoints(difficulty, value){
        acts.forEach((act) => {
            for (let i = 0; i < save.waypoints[difficulty][act.id].length; i++){
                if (save.waypoints[difficulty][act.id][i] != ROGUE_ENCAMPMENT){
                    save.waypoints[difficulty][act.id][i].acquired = value;
                }
            }
        });
    }
</script>

{#each difficulties as difficulty}
    <div class="row spaced" style="align-items:center;">
        <h3 style="flex-grow:1;">{difficulty.display}</h3>
        <button on:click={()=>setAllWaypoints(difficulty.id, true)}>Get All</button>
        <button on:click={()=>setAllWaypoints(difficulty.id, false)}>Remove All</button>
    </div>
    <div class="grid-5">
        {#each acts as act}
            <fieldset class="col spaced">
                <legend>{act.display}</legend>
                {#each save.waypoints[difficulty.id][act.id] as wp}
                    <div class="row">
                        <input type="checkbox" id={wp.act+wp.id} name={wp.act+wp.id}
                        bind:checked="{wp.acquired}" disabled={wp.id===ROGUE_ENCAMPMENT}>
                        <label for={wp.act+wp.id}>{wp.name}</label>
                    </div>
                {/each}
            </fieldset>
        {/each}
    </div>  
{/each}

<style>

</style>