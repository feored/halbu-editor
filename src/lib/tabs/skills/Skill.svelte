<script>
    import { createEventDispatcher } from "svelte";
    import { Message, buildMessage } from "../../utils/Message.svelte";
    import { enforceMinMax } from "../../utils/actions.js";
    import { tooltip } from "@svelte-plugins/tooltips";
    import SkillTooltip from "./SkillTooltip.svelte";


    export let id;
    export let skillInfo;
    export let skillPoints;
    export const refreshPoints = () => { console.log("refreshed!"); skillLevel = skillPoints;}
    export let isClickable = false;


    let skillLevel = skillPoints; 
    const dispatch = createEventDispatcher();
    function dispatchMessage(id, data) {
        dispatch("message", buildMessage(id, data));
    }

    $: invested_style = skillPoints > 0 ? "invested-points" : "no-points";
    $: tooltipContent =  {
                    component: SkillTooltip,
                    props: {
                        title: skillInfo["name"],
                        description: skillInfo["description"],
                        reqLevel: skillInfo["skilldata"]["reqlevel"],
                        skillLevel: skillLevel,
                        baseLevel: skillPoints,
                        content: "",
                    },
                };

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

</script>

<div style="grid-row: {skillInfo['row']}; grid-column: {skillInfo['col']};">
    <div class="row">
        <button
            use:tooltip={{content: tooltipContent
                ,
                position: "bottom",
                autoPosition: true,
                theme: "halbu-tooltip",
            }}
            class={invested_style}
            on:click={handleClick}
            on:contextmenu|preventDefault={handleClick}
            disabled={!isClickable}
            >{skillInfo["name"]}
        </button>
        <input
            style="width:25px; height:18px; align-self:flex-end;text-align:center;"
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
