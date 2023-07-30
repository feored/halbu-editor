<script>
    import General from "./General.svelte"
    import { UserIcon} from 'svelte-feather-icons'

    export let save;
    export const TabID = {
            General: Symbol("General"),
            Other: Symbol("Other"),
            Other2: Symbol("Other2")
        };
    let currentTab = TabID.General;

</script>

<div class="row">
    <div class="col tabs">
        <button class="tab" class:selected={currentTab == TabID.General} on:click={() => {currentTab = TabID.General}}><UserIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Other} on:click={() => {currentTab = TabID.Other}}>Other</button>
        <button class="tab" class:selected={currentTab == TabID.Other2} on:click={() => {currentTab = TabID.Other2}}>Other 2</button>
    </div>
    <div class="col margin">
        {#if currentTab == TabID.General}
            <General save={save} />
        {/if}
    </div>
</div>

<style>
    .tabs {
        justify-content: space-between;
        height:100%;
        width:100px;
    }
    .tab {
        flex:0 0 auto;
        height:100px;
    }
    .selected{
        background-color: var(--beige);
    }
</style>
