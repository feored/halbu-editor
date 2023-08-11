<script>
    import { createEventDispatcher } from "svelte";
    import { Message, buildMessage } from "../../utils/Message.svelte";
    import { tooltip } from "../../utils/actions.js";

    import "tippy.js/dist/tippy.css";
    import "tippy.js/animations/shift-toward.css";

    export let id;
    export let skillInfo;
    export let skillPoints;
    export let isClickable = false;
    export let charLevel;

    let skillLevel = skillPoints;
    const dispatch = createEventDispatcher();
    function dispatchMessage(id, data) {
        dispatch("message", buildMessage(id, data));
    }

    $: invested_style = skillPoints > 0 ? "invested-points" : "no-points";

    function handleClick(event) {
        if (event.button == 0) {
            updatePoints(1);
        } else if (event.button == 2) {
            updatePoints(-1);
        }
    }

    function updatePoints(value) {
        dispatchMessage(Message.SkillPointChange, { id: id, value: value });
    }

    // Tooltip
    let formattedDescription;
    $: {
        formattedDescription = skillInfo["description"]
            .split("\n")
            .reverse()
            .join("\n");
        formattedDescription =
            formattedDescription.charAt(0).toUpperCase() +
            formattedDescription.slice(1) + ".";
    }

    $: tooltipContent = `<div class='col flex-center tooltip'>
                        <h4 id='skillTitle'>${skillInfo["name"]}</h4>
                        <p class='descripton'>${formattedDescription}</p>
                        <p id='levelreq' class='${
                            charLevel < skillInfo["skilldata"]["reqlevel"]
                                ? "error"
                                : ""
                        }'>Required Level: ${
        skillInfo["skilldata"]["reqlevel"]
    }</p>
                        <p class='desc'>${
                            skillPoints > 0
                                ? "Current Skill Level: " +
                                  skillPoints +
                                  " (Base: " +
                                  skillPoints +
                                  ")"
                                : "First Level"
                        }</p> </div>`;

    console.log(charLevel < skillInfo["skilldata"]["reqlevel"] ? "error" : "");
</script>

<div
    style="grid-row: {skillInfo['row']}; grid-column: {skillInfo['col']};"
    class={isClickable ? "" : "disabled"}
>
    <div class="row">
        <button
            use:tooltip={{
                content: tooltipContent,
                allowHTML: true,
                placement: "bottom",
                theme: "halbu",
                arrow: true,
                animation: "shift-toward",
                hideOnClick: false,
            }}
            class={invested_style}
            on:click={handleClick}
            on:contextmenu|preventDefault={handleClick}
            >{skillInfo["name"]}
        </button>
        <input
            style="width:30px; height:30px; align-self:flex-end; padding:2px;"
            type="number"
            name="id"
            min="0"
            max="99"
            step="1"
            bind:value={skillPoints}
            readonly
        />
    </div>
</div>

<style>
    button {
        font-size: small;
        height: 80px;
        width: 80px;
        padding: 2px;
    }

    .invested-points {
        background-color: var(--focus);
        color: var(--text-bright);
    }
    .no-points {
        color: var(--text-muted);
    }
</style>
