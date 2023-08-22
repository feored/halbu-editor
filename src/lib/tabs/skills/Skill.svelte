<script>
    import { createEventDispatcher } from "svelte";
    import { Message, buildMessage } from "../../utils/Message.svelte";
    import { tooltip } from "../../utils/actions.js";
    import { countOccurrences } from "../../utils/Utils.svelte";

    import "tippy.js/dist/tippy.css";
    import "tippy.js/animations/shift-toward.css";


    export let id;
    export let skillData;
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

    function blvl(x){
        return 0;
    }

    function slvl(x){
        return 0;
    }

    function evalCalc(calc){

        console.log("Evaluating " + calc);
        let endCalc = calc;
        let lvl = skillPoints;
        let firemastery = 0;
        let lightningmastery = 0;
        endCalc = endCalc.replaceAll("floor", "Math.floor");
        endCalc = endCalc.replaceAll("min", "Math.min");
        endCalc = endCalc.replaceAll("max", "Math.max");
        console.log("Evaluating2 " + endCalc);
        return eval(endCalc);
        //return endCalc
    }

    function replaceFirstNumber(line, number){
        let signedIndex = line.indexOf("%+d");
        let genIndex = line.indexOf("%d");
        console.log("Signed index: " + signedIndex + ", Gen index " + genIndex);
        if (signedIndex != -1 && (genIndex == -1 || signedIndex < genIndex))
        {
            line = line.replace("%+d", number.toString())
        } else {
            line = line.replace("%d", number.toString())
        }
        return line
    }

    function descLine(descLine){
        let endLine = descLine['texta'];
        let calcs = countOccurrences(descLine["texta"], "%d") + countOccurrences(descLine["texta"], "%+d")
        console.log("Calcs: " + calcs);
        if (calcs > 0) {
            let calcA = evalCalc(descLine["calca"])
            endLine = replaceFirstNumber(endLine, calcA);
        }
        if (calcs > 1) {
            let calcB = evalCalc(descLine["calcb"])
            endLine = replaceFirstNumber(endLine, calcB);
        }

        if (countOccurrences(descLine["texta"], "%s") > 0){
            endLine = endLine.replace("%s", descLine["textb"])
        }

        endLine = endLine.replaceAll("%%", "%");
        console.log(endLine);
        return endLine
        
    }

    // Tooltip
    let formattedDescription =
        skillData["description"].charAt(0).toUpperCase() +
        skillData["description"].slice(1) +
        ".";

    $: tooltipContent = `
    <div class='col flex-center'>
        <h4 id='skillTitle'>${skillData["name"]}</h4>
        <p class='descripton'>${formattedDescription}</p>
        <p id='levelreq' class='${
            charLevel < skillData["reqlevel"] ? "error" : ""
        }'>
            Required Level: ${skillData["reqlevel"]}
        </p>
        
            ${skillData["dsc2lines"].map((line) => "<span class='desc'>" + descLine(line) + "</span></br>").join("\n")}
        <p class='desc'>${
            skillPoints > 0
                ? "Current Skill Level: " +
                    skillPoints +
                    " (Base: " +
                    skillPoints +
                    ")"
                : "First Level"
        }
        </p>
            ${skillData["desclines"].map((line) => "<span class='desc'>" + descLine(line) + "</span></br>").join("\n")}
            ${skillData["dsc3lines"].map((line) => "<span class='desc' style='color:green'>" + descLine(line) + "</span></br>").join("\n")}
    </div>
    `;
</script>



<div
    style="grid-row: {skillData['row']}; grid-column: {skillData['column']};"
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
            >{skillData["name"]}
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
