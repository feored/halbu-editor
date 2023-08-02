<script>
    export let save;

    let idRef, nameRef, experienceRef;

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

    async function get_names() {

    }

</script>


<h3>{save.character.mercenary.name}</h3>
<fieldset id="status" class="grid-4 flex-center">
    <legend>Status</legend>

    <div class="row">
        <input type="checkbox" id="dead" name="dead" bind:checked="{save.character.mercenary.dead}">
        <label for="dead">Dead</label>
    </div>

    <div class="col">
        <label for="id">ID</label>
        <input bind:this = {idRef} type="number" name="id" min="0" max="4294967295" step="1" on:input={() => {enforceMinMax(idRef)}} bind:value="{save.character.mercenary.id}">
    </div>

    <div class="col">
        <label for="name">Name</label>
        <input bind:this = {nameRef} type="text" name="name" bind:value="{save.character.mercenary.name}">
    </div>

    <div class="col">
        <label for="experience">Experience</label>
        <input bind:this = {experienceRef} type="number" name="id" min="0" max="4294967295" step="1" on:input={() => {enforceMinMax(experienceRef)}} bind:value="{save.character.mercenary.experience}">
    </div>

</fieldset>
