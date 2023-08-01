<script>
    export let save;

    let idRef;

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

</script>


<h3>{save.character.mercenary.name}</h3>
<fieldset id="status" class="col">
    <legend>Status</legend>

    <div class="row">
        <input type="checkbox" id="dead" name="dead" bind:checked="{save.character.mercenary.dead}">
        <label for="dead">Dead</label>
    </div>

    <div class="col">
        <label for="id">ID</label>
        <input bind:this = {idRef} type="number" name="id" min="0" max="4294967295" step="1" on:input={() => {enforceMinMax(idRef)}} bind:value="{save.character.mercenary.id}">
    </div>

</fieldset>
