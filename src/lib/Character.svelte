<script>
    import General from "./General.svelte"
    import Mercenary from "./Mercenary.svelte"

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
        <button class="tab col" class:selected={currentTab == TabID.General} on:click={() => {currentTab = TabID.General}}><UserSquare2Icon /><p>Character</p></button>
        <button class="tab" class:selected={currentTab == TabID.Mercenary} on:click={() => {currentTab = TabID.Mercenary}}><PersonStandingIcon /><p>Mercenary</p></button>
        <button class="tab" class:selected={currentTab == TabID.Skills} on:click={() => {currentTab = TabID.Skills}}><BookPlusIcon /><p>Skills</p></button>
        <button class="tab" class:selected={currentTab == TabID.Waypoints} on:click={() => {currentTab = TabID.Waypoints}}><LocateIcon /><p>Waypoints</p></button>
        <button class="tab" class:selected={currentTab == TabID.Quests} on:click={() => {currentTab = TabID.Quests}}><ScrollIcon /><p>Quests</p></button>
        <button class="tab" class:selected={currentTab == TabID.Items} on:click={() => {currentTab = TabID.Items}}><SwordIcon /><p>Items</p></button>
    </div>
    <div class="col margin tabContent">
        {#if currentTab == TabID.General}
            <General save={save} on:message />
        {:else if currentTab == TabID.Mercenary}
            <Mercenary save={save} />
        {/if}
    </div>
</div>

<style>
    .tabs {
        justify-content: space-between;
        align-items: center;
        height:100%;
    }
    .tab {
        flex:0 0 auto;
        height:100px;
        width:100%;
        align-items: center;
    }
    .tab p {
        font-weight:lighter;
    }
    .selected{
        background-color: var(--beige);
    }

    /* .tabContent {
        margin: 20px auto;
    } */
</style>
