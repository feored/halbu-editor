<script>
    import General from "./General.svelte"

    export let save;

</script>

<h1 id="name">
    {save.character.name}
</h1>
<General save={save} />

