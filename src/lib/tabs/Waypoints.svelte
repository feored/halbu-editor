<script>
    export let save;

    const ROGUE_ENCAMPMENT = "RogueEncampment";
    
    let allWaypoints = {"normal" : false, "nightmare" : false, "hell" : false}
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

    function checkAllWaypoints(difficulty){
        allWaypoints[difficulty.id] = !allWaypoints[difficulty.id];
        setAllWaypoints(difficulty.id, allWaypoints[difficulty.id])
    }

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
        <article>
            <header>
                <div class="row spaced" style="align-items:baseline;">
                    <h5>{difficulty.display}</h5>
                    <input type="checkbox" name="allWaypoints" on:change={() => checkAllWaypoints(difficulty)} />
                </div>
            </header>
            <div class="grid" style="width:100%;">
                {#each acts as act}
                    <fieldset>
                        <legend>{act.display}</legend>
                        {#each save.waypoints[difficulty.id][act.id] as wp}
                            <div>
                                <input type="checkbox" id={wp.act+wp.id} name={wp.act+wp.id}
                                bind:checked="{wp.acquired}" disabled={wp.id===ROGUE_ENCAMPMENT}>
                                <label for={wp.act+wp.id}>{wp.name}</label>
                            </div>
                        {/each}
                    </fieldset>
                {/each}
            </div>
        </article>
    {/each}

<style>

</style>