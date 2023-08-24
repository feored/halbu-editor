<script>
    import { createEventDispatcher } from "svelte";
    import { Message, buildMessage } from "../../utils/Message.svelte";
    import { tooltip } from "../../utils/actions.js";
    import { countOccurrences } from "../../utils/Utils.svelte";
    import { skillIdToSaveId } from "../../utils/Utils.svelte";


    import "tippy.js/dist/tippy.css";
    import "tippy.js/animations/shift-toward.css";
    import { save } from "@tauri-apps/api/dialog";


    export let id;
    export let skillData;
    export let isClickable = false;
    export let character;
    export let skills;

    const currentId = skillData["saveId"];

    const dispatch = createEventDispatcher();
    function dispatchMessage(id, data) {
        dispatch("message", buildMessage(id, data));
    }

    $: invested_style = skills[currentId].points > 0 ? "invested-points" : "no-points";

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

    function blvl(skillId){
        return slvl(skillId);
    }

    function slvl(skillId){
        let saveSkillId = skillIdToSaveId(skillId, character.class);
        if (saveSkillId >= 0 && saveSkillId < 30){
            return skills[saveSkillId].points;
        } else {
            return 0;
        }
    }

    function evalCalc(calc){
        console.log("Evaluating: " + calc);
        let endCalc = calc;
        let lvl = skills[currentId].points;
        let firemastery = 0;
        let lightningmastery = 0;
        endCalc = endCalc.replaceAll("floor", "Math.floor");
        endCalc = endCalc.replaceAll("min", "Math.min");
        endCalc = endCalc.replaceAll("max", "Math.max");
        console.log("Evaluated: " + endCalc + " = " + eval(endCalc));
        return eval(endCalc);
        //return endCalc
    }

    function descLine(descline){
        // Only values used within the skilldesc.txt file are [36, 74, 75, 40, 76, 18, 13, 34, 31, 41, 77]
        switch (descline["id"]){

            case 36:
            default:
                return descLineGeneral(descline);
                break;
        }
    }

    function replaceFirstNumber(line, number){
        let signedIndex = line.indexOf("%+d");
        let genIndex = line.indexOf("%d");
        console.log("Signed index: " + signedIndex + ", Gen index " + genIndex);
        if (signedIndex != -1 && (genIndex == -1 || signedIndex < genIndex))
        {
            line = line.replace("%+d", (number < 0 ? "-" : "+") + number.toString())
        } else {
            line = line.replace("%d", number.toString())
        }
        return line
    }

    function descLineGeneral(descLine){
        let endLine = descLine['texta'];
        let calcs = countOccurrences(descLine["texta"], "%d") + countOccurrences(descLine["texta"], "%+d")
        console.log("Calcs in '''" + descLine['texta'] + "''': "  + calcs);
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
            character.Level < skillData["reqlevel"] ? "error" : ""
        }'>
            Required Level: ${skillData["reqlevel"]}
        </p>
        
            ${skillData["dsc2lines"].map((line) => "<span class='desc'>" + descLine(line) + "</span></br>").reverse().join("\n")}
        <p class='desc'>${
            skills[currentId].points > 0
                ? "Current Skill Level: " +
                skills[currentId].points +
                    " (Base: " +
                    skills[currentId].points +
                    ")"
                : "First Level"
        }
        </p>
            ${skillData["desclines"].map((line) => "<span class='desc'>" + descLine(line) + "</span></br>").reverse().join("\n")}
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
            bind:value={skills[currentId].points}
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
