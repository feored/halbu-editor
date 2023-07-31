<script>
    import General from "./General.svelte"
    import { UserSquare2Icon, PersonStandingIcon, LocateIcon, ScrollIcon, SwordIcon, BookPlusIcon} from 'lucide-svelte'

    export let save;
    export const TabID = {
            General: Symbol("General"),
            Mercenary: Symbol("Mercenary"),
            Skills: Symbol("Skills"),
            Waypoints: Symbol("Waypoints"),
            Quests: Symbol("Quests"),
            Items: Symbol("Items")
        };
    let currentTab = TabID.General;

</script>

<div class="row">
    <div class="col tabs">
        <button class="tab" class:selected={currentTab == TabID.General} on:click={() => {currentTab = TabID.General}}><UserSquare2Icon /></button>
        <button class="tab" class:selected={currentTab == TabID.Mercenary} on:click={() => {currentTab = TabID.Mercenary}}><PersonStandingIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Skills} on:click={() => {currentTab = TabID.Skills}}><BookPlusIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Waypoints} on:click={() => {currentTab = TabID.Waypoints}}><LocateIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Quests} on:click={() => {currentTab = TabID.Quests}}><ScrollIcon/></button>
        <button class="tab" class:selected={currentTab == TabID.Items} on:click={() => {currentTab = TabID.Items}}><SwordIcon /></button>
    </div>
    <div class="col margin tabContent">
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

    /* .tabContent {
        margin: 20px auto;
    } */
</style>
