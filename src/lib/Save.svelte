<script>
    import Character from "./tabs/Character/Character.svelte";
    import Mercenary from "./tabs/Mercenary/Mercenary.svelte";
    import Waypoints from "./tabs/Waypoints.svelte";
    import Skills from "./tabs/skills/Skills.svelte";
    import Settings from "./SettingsPage.svelte";

    import { Message, buildMessage } from "./utils/Message.svelte";
    import { createEventDispatcher } from "svelte";

    export const dispatch = createEventDispatcher();
    function dispatchMessage(id, data) {
        dispatch("message", buildMessage(id, data));
    }

    import {
        ArrowLeftIcon,
        SaveIcon,
        UserSquare2Icon,
        PersonStandingIcon,
        LocateIcon,
        ScrollIcon,
        SwordIcon,
        BookPlusIcon,
        SettingsIcon,
    } from "lucide-svelte";
    import SettingsPage from "./SettingsPage.svelte";

    export let save;
    export let validSave = true;

    export const TabID = {
        Character: Symbol("Character"),
        Mercenary: Symbol("Mercenary"),
        Skills: Symbol("Skills"),
        Waypoints: Symbol("Waypoints"),
        Quests: Symbol("Quests"),
        Items: Symbol("Items"),
        Settings: Symbol("Settings"),
    };
    let currentTab = TabID.Character;
</script>

<div class="full-height full-width">
    <nav
        class="container-fluid"
        id="navbar"
    >
        <ul>
            <li>
                <button
                    class="tab outline"
                    on:click={() => dispatchMessage(Message.CharacterUnpicked)}
                    ><ArrowLeftIcon /> Back</button
                >
            </li>
        </ul>
        <ul>
            <li>
                <button
                    class="tab"
                    class:selected={currentTab == TabID.Character}
                    on:click={() => {
                        currentTab = TabID.Character;
                    }}><PersonStandingIcon />&nbsp;Character</button
                >
            </li>
            <li>
                <button
                    class="tab"
                    class:selected={currentTab == TabID.Mercenary}
                    on:click={() => {
                        currentTab = TabID.Mercenary;
                    }}><UserSquare2Icon />&nbsp;Hireling</button
                >
            </li>
            <li>
                <button
                    class="tab"
                    class:selected={currentTab == TabID.Skills}
                    on:click={() => {
                        currentTab = TabID.Skills;
                    }}><BookPlusIcon />&nbsp;Skills</button
                >
            </li>
            <li>
                <button
                    class="tab"
                    class:selected={currentTab == TabID.Waypoints}
                    on:click={() => {
                        currentTab = TabID.Waypoints;
                    }}><LocateIcon />&nbsp;Waypoints</button
                >
            </li>
            <li>
                <button
                    class="tab"
                    class:selected={currentTab == TabID.Quests}
                    on:click={() => {
                        currentTab = TabID.Quests;
                    }}><ScrollIcon />&nbsp;Quests</button
                >
            </li>
            <li>
                <button
                    class="tab"
                    class:selected={currentTab == TabID.Items}
                    on:click={() => {
                        currentTab = TabID.Items;
                    }}><SwordIcon />&nbsp;Items</button
                >
            </li>
        </ul>
        <ul>
            <li>
                <button
                    class="tab"
                    class:selected={currentTab == TabID.Settings}
                    on:click={() => {
                        currentTab = TabID.Settings;
                    }}><SettingsIcon /></button
                >
            </li>
            <li>
                <button
                    class="tab outline"
                    on:click={() => dispatchMessage(Message.SaveFile)}
                    disabled={!validSave}><SaveIcon />&nbsp;Save</button
                >
            </li>
        </ul>
    </nav>

    {#if currentTab == TabID.Character}
        <div class="container tab-content">
            <Character {save} on:message />
        </div>
    {:else if currentTab == TabID.Mercenary}
        <div class="container tab-content">
            <Mercenary {save} />
        </div>
    {:else if currentTab == TabID.Skills}
        <div class="container-fluid tab-content">
            <Skills {save} />
        </div>
    {:else if currentTab == TabID.Waypoints}
        <div class="container tab-content">
            <Waypoints {save} />
        </div>
    {:else if currentTab == TabID.Settings}
        <div class="container tab-content">
            <Settings />
        </div>
    {/if}
</div>

<style>
    #navbar {
        margin-bottom: var(--pico-block-spacing-vertical);
        position:fixed;
        top: 0px;
        background-color: var(--pico-alternate-background);
        
    }
    .selected {
        background-color: var(--pico-form-element-active-background-color);
    }

    .tab-content {
        margin-top: calc(1rem * var(--pico-line-height) + var(--pico-nav-link-spacing-vertical) * 2 + 4rem);
        padding-bottom: calc(var(--pico-block-spacing-vertical) * 0.66);
    }

    .tab {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
</style>
