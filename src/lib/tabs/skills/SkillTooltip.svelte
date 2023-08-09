<svelte:options accessors />

<script>
    export let title = "";
    export let description = "";
    export let reqLevel = 1;
    export let skillLevel;
    export let baseLevel = 0;
    export let content = "";
    //export let synergies;

    let formattedDescription = description.split("\n").reverse().join("\n");
    formattedDescription = formattedDescription.charAt(0).toUpperCase() + formattedDescription.slice(1);
</script>

<div class="col flex-center">
    <h4>{title}</h4>
    <p>{formattedDescription}</p>
    <p>Required Level: {reqLevel}</p>
    <p>{skillLevel > 0 ? "Current Skill Level: " + skillLevel + " (Base: " + baseLevel + ")" : "First Level"}</p>

</div>

<style>
    #title {
        font-weight: bold;
        color:var(--focus);
    }
    p {
        text-align:center;
        color: var(--text-muted);
    }
</style>