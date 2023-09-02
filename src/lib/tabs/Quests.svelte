<script>
    import * as log from "../utils/Logs.svelte";
    export let save;

    const difficulties = [
        { id: "normal", display: "Normal" },
        { id: "nightmare", display: "Nightmare" },
        { id: "hell", display: "Hell" },
    ];

    const acts = [
        {
            id: "act1",
            display: "Act I",
            quests: [
                { id: "prologue", display: "Prologue" },
                { id: "q1", display: "Den of Evil" },
                { id: "q2", display: "Sisters' Burial Grounds" },
                { id: "q3", display: "The Search for Cain" },
                { id: "q4", display: "The Forgotten Tower" },
                { id: "q5", display: "Tools of the Trade" },
                { id: "q6", display: "Sisters to the Slaughter" },
                { id: "completion", display: "Completion" },
            ],
        },
        {
            id: "act2",
            display: "Act II",
            quests: [
                { id: "prologue", display: "Prologue" },
                { id: "q1", display: "Radament's Lair" },
                { id: "q2", display: "The Horadric Staff" },
                { id: "q3", display: "Tainted Sun" },
                { id: "q4", display: "Arcane Sanctuary" },
                { id: "q5", display: "The Summoner" },
                { id: "q6", display: "The Seven Tombs" },
                { id: "completion", display: "Completion" },
            ],
        },
        {
            id: "act3",
            display: "Act III",
            quests: [
                { id: "prologue", display: "Prologue" },
                { id: "q1", display: "Den of Evil" },
                { id: "q2", display: "Sisters' Burial Grounds" },
                { id: "q3", display: "Tools of the Trade" },
                { id: "q4", display: "The Search for Cain" },
                { id: "q5", display: "The Blackened Temple" },
                { id: "q6", display: "The Guardian" },
                { id: "completion", display: "Completion" },
            ],
        },
        {
            id: "act4",
            display: "Act IV",
            quests: [
                { id: "prologue", display: "Prologue" },
                { id: "q1", display: "The Fallen Angel" },
                { id: "q2", display: "Hell's Forge" },
                { id: "q3", display: "Terror's End" },
                { id: "completion", display: "Completion" },
            ],
        },
        {
            id: "act5",
            display: "Act V",
            quests: [
                { id: "prologue", display: "Prologue" },
                { id: "q1", display: "Siege on Harrogath" },
                { id: "q2", display: "Rescue on Mount Arreat" },
                { id: "q3", display: "Prison of Ice" },
                { id: "q4", display: "Betrayal of Harrogath" },
                { id: "q5", display: "Rite of Passage" },
                { id: "q6", display: "Eve of Destruction" },
                { id: "completion", display: "Completion" },
            ],
        },
    ];

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

    function toggleFlag(difficultyId, actId, questId, flagId) {
        if (save.quests[difficultyId][actId][questId].state.includes(flagId)) {
            save.quests[difficultyId][actId][questId].state = save.quests[difficultyId][actId][
                questId
            ].state.filter((item) => item != flagId);
        } else {
            save.quests[difficultyId][actId][questId].state = [
                flagId,
                ...save.quests[difficultyId][actId][questId].state,
            ];
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
                    {#each act.quests as quest}
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
                                            toggleFlag(difficulty.id, act.id, quest.id, flag.id)}
                                    />
                                    <label for={difficulty.id + act.id + quest.id + flag.id}
                                        >{flag.display}</label
                                    >
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
            </article>
        {/each}
    </article>
{/each}
