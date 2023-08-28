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

<div class="full-height full-width">
        <nav class="container-fluid" style="margin-bottom: var(--pico-block-spacing-vertical); position:sticky; top: 0px;;">
            <ul>
                <li>
                    <button class="tab outline" on:click={()=> dispatchMessage(Message.CharacterUnpicked)}><ArrowLeftIcon /> Back</button>
                </li>
            </ul>
            <ul>
                <li>
                    <button class="tab" class:outline={currentTab == TabID.Character} on:click={() => {currentTab = TabID.Character}}><PersonStandingIcon />&nbsp;Character</button>
                </li>
                <li>
                    <button class="tab" class:outline={currentTab == TabID.Mercenary} on:click={() => {currentTab = TabID.Mercenary}}><UserSquare2Icon />&nbsp;Hireling</button>
                </li>
                <li>
                    <button class="tab" class:outline={currentTab == TabID.Skills} on:click={() => {currentTab = TabID.Skills}}><BookPlusIcon />&nbsp;Skills</button>
                </li>
                <li>
                    <button class="tab" class:outline={currentTab == TabID.Waypoints} on:click={() => {currentTab = TabID.Waypoints}}><LocateIcon />&nbsp;Waypoints</button>
                </li>
                <li>
                    <button class="tab" class:outline={currentTab == TabID.Quests} on:click={() => {currentTab = TabID.Quests}}><ScrollIcon />&nbsp;Quests</button>
                </li>
                <li>
                    <button class="tab" class:outline={currentTab == TabID.Items} on:click={() => {currentTab = TabID.Items}}><SwordIcon />&nbsp;Items</button>  
                </li>
            </ul>
            <ul>
                <li>
                    <button class="tab outline" on:click={()=> dispatchMessage(Message.SaveFile)} disabled={!validSave}><SaveIcon /> Save</button>
                </li>
            </ul>
        </nav>
        <div class="container">
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
    nav {
        background-color: var(--pico-alternate-background);
    }

    .tab {
        display:flex;
        flex-direction: row;
        align-items: center;
        justify-content:space-between;
    }

</style>
