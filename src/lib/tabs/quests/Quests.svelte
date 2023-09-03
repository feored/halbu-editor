<script>
    import * as log from "../../utils/Logs.svelte";
    import * as Settings from "../../utils/Settings.svelte";
    import { tooltip } from "../../utils/actions";
    import { InfoIcon } from "lucide-svelte";
    import acts from "./actquests.json";
    export let save;

    let showPrologue = Settings.getCache(Settings.Key.QuestsShowPrologue);
    let advancedFlags = Settings.getCache(Settings.Key.QuestsAdvancedFlags);
    let advancedAllQuests = Settings.getCache(Settings.Key.QuestsAdvancedFlags);

    const difficulties = [
        { id: "normal", display: "Normal" },
        { id: "nightmare", display: "Nightmare" },
        { id: "hell", display: "Hell" },
    ];

    const unused_act_quests = {
        act1: [],
        act2: [],
        act3: [],
        act4: [
            { id: "unused_1", display: "Unused Quest 1" },
            { id: "unused_2", display: "Unused Quest 2" },
            { id: "unused_3", display: "Unused Quest 3" },
        ],
        act5: [
            { id: "unused_1", display: "Unused Quest 1" },
            { id: "unused_2", display: "Unused Quest 2" },
        ],
    };

    const questFlags = [
        { id: "RewardGranted", display: "Reward Granted" },
        { id: "RewardPending", display: "Reward Pending" },
        { id: "Started", display: "Started" },
        { id: "LeaveTown", display: "Leave Town" },
        { id: "EnterArea", display: "Enter Area" },
        { id: "Custom1", display: "Custom 1" },
        { id: "Custom2", display: "Custom 2" },
        { id: "Custom3", display: "Custom 3" },
        { id: "Custom4", display: "Custom 4" },
        { id: "Custom5", display: "Custom 5" },
        { id: "Custom6", display: "Custom 6" },
        { id: "Custom7", display: "Custom 7" },
        { id: "UpdateQuestLog", display: "Update Quest Log" },
        { id: "PrimaryGoalDone", display: "Primary Goal Done" },
        { id: "CompletedNow", display: "Completed Now" },
        { id: "CompletedBefore", display: "Completed Before" },
    ];

    const quest_states = {
        clear: [],
        complete: ["RewardGranted", "UpdateQuestLog"],
    };

    const additional_quest_flags = {
        Custom6: "Killed Cow King",
    };

    function removeFlag(difficultyId, actId, questId, flagId) {
        save.quests[difficultyId][actId][questId].state = save.quests[difficultyId][actId][
            questId
        ].state.filter((item) => item != flagId);
    }

    function addFlag(difficultyId, actId, questId, flagId) {
        // state is a set in the backend, so make sure not to include duplicates
        if (!save.quests[difficultyId][actId][questId].state.includes(flagId)) {
            save.quests[difficultyId][actId][questId].state = [
                flagId,
                ...save.quests[difficultyId][actId][questId].state,
            ];
        }
    }

    function toggleFlag(difficultyId, actId, questId, flagId) {
        let flagPresent = save.quests[difficultyId][actId][questId].state.includes(flagId);
        if (flagPresent) {
            removeFlag(difficultyId, actId, questId, flagId);
        } else {
            addFlag(difficultyId, actId, questId, flagId);
        }
    }

    function isStateIndetermined(difficultyId, actId, questId, questState) {
        let flagsPresent = 0;
        questState.flags.forEach((flag) => {
            flagsPresent += save.quests[difficultyId][actId][questId].state.includes(flag) ? 1 : 0;
        });
        return flagsPresent != 0 && flagsPresent != questState.flags.length;
    }

    function isStatePresent(difficultyId, actId, questId, questState) {
        return questState.flags.every((flag) => {
            return save.quests[difficultyId][actId][questId].state.includes(flag);
        });
    }

    function toggleState(difficultyId, actId, questId, questState) {
        let statePresent = isStatePresent(difficultyId, actId, questId, questState);
        if (statePresent) {
            questState.flags.forEach((flag) => {
                removeFlag(difficultyId, actId, questId, flag);
            });
        } else {
            questState.flags.forEach((flag) => {
                addFlag(difficultyId, actId, questId, flag);
            });
        }
    }
</script>

{#each difficulties as difficulty}
    <article>
        <header>
            <h4>{difficulty.display}</h4>
        </header>
        {#each acts as act}
            <article>
                <h5>{act.display}</h5>
                <div class="grid-adaptable">
                    {#if advancedFlags}
                        {#each act.quests as quest}
                            {#if quest.id != "prologue" || showPrologue}
                                <div>
                                    <p><b>{quest.display}</b></p>
                                    {#each questFlags as flag}
                                        <div class="row spaced">
                                            <input
                                                type="checkbox"
                                                id={difficulty.id + act.id + quest.id + flag.id}
                                                checked={save.quests[difficulty.id][act.id][
                                                    quest.id
                                                ].state.includes(flag.id)}
                                                on:change={() =>
                                                    toggleFlag(
                                                        difficulty.id,
                                                        act.id,
                                                        quest.id,
                                                        flag.id
                                                    )}
                                            />
                                            <label for={difficulty.id + act.id + quest.id + flag.id}
                                                >{flag.display}</label
                                            >
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {/each}
                        {#if advancedAllQuests}
                            {#each unused_act_quests[act.id] as quest}
                                <div>
                                    <p><b>{quest.display}</b></p>
                                    {#each questFlags as flag}
                                        <div class="row spaced">
                                            <input
                                                type="checkbox"
                                                id={difficulty.id + act.id + quest.id + flag.id}
                                                checked={save.quests[difficulty.id][act.id][
                                                    quest.id
                                                ].state.includes(flag.id)}
                                                on:change={() =>
                                                    toggleFlag(
                                                        difficulty.id,
                                                        act.id,
                                                        quest.id,
                                                        flag.id
                                                    )}
                                            />
                                            <label for={difficulty.id + act.id + quest.id + flag.id}
                                                >{flag.display}</label
                                            >
                                        </div>
                                    {/each}
                                </div>
                            {/each}
                        {/if}
                    {:else}
                        <!-- Normal mode-->
                        {#each act.quests as quest}
                            {#if quest.id != "prologue" || showPrologue}
                                <div>
                                    <p>
                                        <b>{quest.display}</b>
                                    </p>
                                    {#each quest.states as state}
                                        <div class="row spaced">
                                            <input
                                                type="checkbox"
                                                id={difficulty.id +
                                                    act.id +
                                                    quest.id +
                                                    state.display}
                                                checked={isStatePresent(
                                                    difficulty.id,
                                                    act.id,
                                                    quest.id,
                                                    state
                                                )}
                                                indeterminate={isStateIndetermined(
                                                    difficulty.id,
                                                    act.id,
                                                    quest.id,
                                                    state
                                                )}
                                                on:change={() =>
                                                    toggleState(
                                                        difficulty.id,
                                                        act.id,
                                                        quest.id,
                                                        state
                                                    )}
                                            />
                                            <label
                                                for={difficulty.id +
                                                    act.id +
                                                    quest.id +
                                                    state.display}
                                                >{state.display}{#if (quest.id == "completion" && act.id != "act4") || (quest.id == "q2" && act.id == "act4")}&nbsp;<span
                                                        use:tooltip={{
                                                            content:
                                                                "Required to use the waypoint to the next act.",
                                                            allowHTML: true,
                                                            placement: "bottom",
                                                            theme: "halbu",
                                                            arrow: true,
                                                            animation: "shift-toward",
                                                            hideOnClick: false,
                                                        }}><InfoIcon size="16" /></span
                                                    >{/if}</label
                                            >
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {/each}
                    {/if}
                </div>
            </article>
        {/each}
    </article>
{/each}
