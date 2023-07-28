<script>
    export let save;
</script>

<h2>Stats</h2>
<div class="row">
    <div class="container">
        <div>
            <div class="row">
                <label for="strength">Strength</label>
                <input type="number" name="strength" min="0" max="999" step="1" bind:value="{save.attributes.strength}">
            </div>
            <div class="row">
                <label for="dexterity">Dexterity</label>
                <input type="number" name="dexterity" min="0" max="999" step="1" bind:value="{save.attributes.dexterity}">
            </div>
            <div class="row">
                <label for="vitality">Vitality</label>
                <input type="number" name="vitality" min="0" max="999" step="1" bind:value="{save.attributes.vitality}">
            </div>
            <div class="row">
                <label for="energy">Energy</label>
                <input type="number" name="energy" min="0" max="999" step="1" bind:value="{save.attributes.energy}">
            </div>
        </div>
    </div>
    <div class="container">
        <div class="row">
            <label for="life">Life</label>
            <input type="number" name="life" min="1" max="9999" step="1" bind:value="{save.attributes.life_base.integer}">
        </div>
        <div class="row">
            <label for="mana">Mana</label>
            <input type="number" name="mana" min="1" max="9999" step="1" bind:value="{save.attributes.mana_base.integer}">
        </div>
        <div class="row">
            <label for="stamina">Stamina</label>
            <input type="number" name="stamina" min="0" max="999" step="1" bind:value="{save.attributes.stamina_base.integer}">
        </div>
    </div>
</div>


<style>
     label {
        display: inline-block;
        width: 150px;
      }
    .container {
        background-color:#404040 ;
        width:100%;
        margin: 1em;
        display: flex;
        flex-direction: column;
    }

    .container .row {
        background-color:blue;
        width: 50%;
        margin:auto;
    }
</style>