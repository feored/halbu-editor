<script>
    export let save;
</script>

<div class="container">
    <h1 id="name">
        {save.character.name}
    </h1>
    <div>
        <h3>Stats</h3>
        <div class="row">
            <label for="strength">Strength</label>
            <input type="number" name="strength" min="0" max="999" step="1" value="{save.attributes.strength}">
        </div>
        <div class="row">
            <label for="dexterity">Dexterity</label>
            <input type="number" name="dexterity" min="0" max="999" step="1" value="{save.attributes.dexterity}">
        </div>
        <div class="row">
            <label for="vitality">Vitality</label>
            <input type="number" name="vitality" min="0" max="999" step="1" value="{save.attributes.vitality}">
        </div>
        <div class="row">
            <label for="energy">Energy</label>
            <input type="number" name="energy" min="0" max="999" step="1" value="{save.attributes.energy}">
        </div>
    </div>
</div>


<style>
    .container {
        display: flex;
        flex-direction: column;
    }
</style>