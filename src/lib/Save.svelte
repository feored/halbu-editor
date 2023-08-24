<script>
    import Character from "./tabs/Character/Character.svelte"
    import Mercenary from "./tabs/Mercenary/Mercenary.svelte"
    import Waypoints from "./tabs/Waypoints.svelte"
    import Skills from "./tabs/skills/Skills.svelte";

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

<div class="row" style="align-self: flex-start; height:100%;">
    <div class="col tabs" style="position: -webkit-sticky; position:sticky; top:0px;">
        <button class="tab" on:click={()=> dispatchMessage(Message.CharacterUnpicked)}><ArrowLeftIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Character} on:click={() => {currentTab = TabID.Character}}><PersonStandingIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Mercenary} on:click={() => {currentTab = TabID.Mercenary}}><UserSquare2Icon /></button>
        <button class="tab" class:selected={currentTab == TabID.Skills} on:click={() => {currentTab = TabID.Skills}}><BookPlusIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Waypoints} on:click={() => {currentTab = TabID.Waypoints}}><LocateIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Quests} on:click={() => {currentTab = TabID.Quests}}><ScrollIcon /></button>
        <button class="tab" class:selected={currentTab == TabID.Items} on:click={() => {currentTab = TabID.Items}}><SwordIcon /></button>
        <button class="tab" on:click={()=> dispatchMessage(Message.SaveFile)} disabled={!validSave}><SaveIcon /></button>
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
        justify-content:flex-start;
        align-items: center;
        height:100%;
        background-color: var(--background);
    }

    .tab {
        /* width:100%; */
        display:flex;
        flex-direction: row;
        align-items: center;
        justify-content:space-between;
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
