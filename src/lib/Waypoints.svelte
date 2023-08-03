<script>
    export let save;
    
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
</script>



{#each difficulties as difficulty}
    <h3>{difficulty.display}</h3>
    <div class="grid-5">
        {#each acts as act}
            <fieldset class="col spaced">
                <legend>{act.display}</legend>
                {#each save.waypoints[difficulty.id][act.id] as wp}
                    <div class="row">
                        <input type="checkbox" id={wp.act+wp.id} name={wp.act+wp.id}
                        bind:checked="{wp.acquired}" disabled={wp.id==="RogueEncampment"}>
                        <label for={wp.act+wp.id}>{wp.name}</label>
                    </div>
                {/each}
            </fieldset>
        {/each}
    </div>  
{/each}