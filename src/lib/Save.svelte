<script>
    import Character from "./tabs/Character/Character.svelte"
    import Mercenary from "./tabs/Mercenary/Mercenary.svelte"
    import Waypoints from "./tabs/Waypoints.svelte"
    import Skills from "./tabs/Skills.svelte";

    import {Message, buildMessage} from "./utils/Message.svelte";
    import { createEventDispatcher } from 'svelte';

    export const dispatch = createEventDispatcher();
    function dispatchMessage(id, data) {
        dispatch('message', buildMessage(id, data));
    }

    import { ArrowLeftIcon, SaveIcon, UserSquare2Icon, PersonStandingIcon, LocateIcon, ScrollIcon, SwordIcon, BookPlusIcon} from 'lucide-svelte'

    export let save;
    export let validSave = true;

    export const TabID = {
            Character: Symbol("Character"),
            Mercenary: Symbol("Mercenary"),
            Skills: Symbol("Skills"),
            Waypoints: Symbol("Waypoints"),
            Quests: Symbol("Quests"),
            Items: Symbol("Items")
        };
    let currentTab = TabID.Character;

    
</script>

<div class="row" style="align-self: flex-start">
    <div class="col tabs" style="position: -webkit-sticky; position:sticky; top:20px;">
        <button class="tab-btn icon-btn flex-center" on:click={()=> dispatchMessage(Message.CharacterUnpicked)}><ArrowLeftIcon />&nbsp;Back</button>
        <button class="tab" class:selected={currentTab == TabID.Character} on:click={() => {currentTab = TabID.Character}}><UserSquare2Icon /><p>Character</p></button>
        <button class="tab" class:selected={currentTab == TabID.Mercenary} on:click={() => {currentTab = TabID.Mercenary}}><PersonStandingIcon /><p>Mercenary</p></button>
        <button class="tab" class:selected={currentTab == TabID.Skills} on:click={() => {currentTab = TabID.Skills}}><BookPlusIcon /><p>Skills</p></button>
        <button class="tab" class:selected={currentTab == TabID.Waypoints} on:click={() => {currentTab = TabID.Waypoints}}><LocateIcon /><p>Waypoints</p></button>
        <button class="tab" class:selected={currentTab == TabID.Quests} on:click={() => {currentTab = TabID.Quests}}><ScrollIcon /><p>Quests</p></button>
        <button class="tab" class:selected={currentTab == TabID.Items} on:click={() => {currentTab = TabID.Items}}><SwordIcon /><p>Items</p></button>
        <button class="tab-btn icon-btn flex-center" on:click={()=> dispatchMessage(Message.SaveFile)} disabled={!validSave}><SaveIcon />&nbsp;Save</button>
    </div>
    <div class="col" style="margin-left:20px;">
        {#if currentTab == TabID.Character}
            <Character save={save} on:message/>
        {:else if currentTab == TabID.Mercenary}
            <Mercenary save={save} />
        {:else if currentTab == TabID.Skills}
            <Skills save={save} />
        {:else if currentTab == TabID.Waypoints}
            <Waypoints save={save} />
        
        {/if}
    </div>
</div>

<style>
    .tabs {
        justify-content: space-between;
        align-items: center;
        width : 140px;
        height:100%;
    }
    .tab {
        flex:0 0 auto;
        width:100%;
        align-items: center;
    }
    .tab-btn {
        flex:0 0 auto;
        width:100%;
        text-align: center;
        align-items: center;
    }
    .tab p {
        font-weight:lighter;
    }
    .selected{
        background-color: var(--button-hover);
        border: 1px var(--focus) solid;
    }

    /* .tabContent {
        margin: 20px auto;
    } */
</style>
