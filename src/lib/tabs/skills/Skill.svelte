<script>
    import { createEventDispatcher } from "svelte";
    import { Message, buildMessage } from "../../utils/Message.svelte";
    import { tooltip } from "../../utils/actions.js";
    import { countOccurrences } from "../../utils/Utils.svelte";
    import { skillOffset, skillIdToSaveId } from "../../utils/Utils.svelte";

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

    function synergy(calc) {
        // This function is needed because for some reason the entire synergy line is set to 0 if the variable
        // (slvl/blvl) is 0 i.e the skill is not set, even the parts of the line that are constant
        // ie (synergy(1000+ (lvl-1) * 500 )) should return 0 if the skill level is 0, not 500
        const foundSlvl = calc.match(/slvl\([^\)]*\)/g);

        if (foundSlvl != null && slvl(foundSlvl[0].slice(5, -1)) == 0) {
            return 0;
        }

        const foundBlvl = calc.match(/blvl\([^\)]*\)/g);
        if (foundBlvl != null && blvl(foundBlvl[0].slice(5, -1)) == 0) {
            return 0;
        }

        return eval(calc);
    }

    function blvl(skillId) {
        return slvl(skillId);
    }

    function slvl(skillId) {
        let saveSkillId = skillIdToSaveId(skillId, character.class);
        if (saveSkillId >= 0 && saveSkillId < 30) {
            return skills[saveSkillId].points;
        } else {
            return 0;
        }
    }

    function evalMastery(mastery) {
        if (character.class != "Sorceress") {
            return 0;
        }
        if (mastery === "ltng") {
            return 50 + (skills[27].points - 1) * 12;
        }

        if (mastery === "fire") {
            return 30 + (skills[25].points - 1) * 7;
        }

        return 0;
    }

    function evalCalc(calc, next = false) {
        let endCalc = calc;
        let lvl = skills[currentId].points == 0 ? 1 : skills[currentId].points;

        if (next) {
            lvl++;
        }

        let evalScope = {
            lvl: lvl,
            skills: skills,
            skillOffset: skillOffset,
            character: character,
        };

        let fns = [slvl, blvl, synergy, evalMastery, skillIdToSaveId];

        endCalc = endCalc.replaceAll("lightningmastery", "evalMastery('ltng')");
        endCalc = endCalc.replaceAll("firemastery", "evalMastery('fire')");
        endCalc = endCalc.replaceAll("floor", "Math.floor");
        endCalc = endCalc.replaceAll("min", "Math.min");
        endCalc = endCalc.replaceAll("max", "Math.max");

        return scopedEval(endCalc, evalScope, fns);
    }

    function scopedEval(script, scope, functions) {
        let fnText = functions.map((fn) => fn.toString()).join(";");
        let scopeText = "";
        Object.keys(scope).forEach((key) => {
            scopeText += "var " + key + " = " + JSON.stringify(scope[key]) + ";";
        });
        return Function(`"use strict"; ${scopeText}${fnText} return (${script})`)();
    }

    function descLine(descline, next = false) {
        // Only values used within the skilldesc.txt file are [36, 74, 75, 40, 76, 18, 13, 34, 31, 41, 77]
        switch (descline["id"]) {
            case 34:
            case 39:
            case 41:
                return descline["texta"];
                break;
            case 18:
                return descline["texta"];
                break;
            case 31:
            case 36:
                let value =
                    "calcb" in descline
                        ? evalCalc(descline["calca"], next) / evalCalc(descline["calcb"], next)
                        : evalCalc(descline["calca"], next);
                if ("textb" in descline && value != 1) {
                    return replaceFirstNumber(descline["textb"], value);
                } else {
                    return replaceFirstNumber(descline["texta"], value);
                }
                break;
            case 40:
                return "<span id='synTitle'>" + descLineGeneral(descline, next) + "</span>";
                break;
            case 74:
            case 75:
            case 76:
            default:
                return descLineGeneral(descline, next);
                break;
        }
    }

    function replaceFirstNumber(line, number) {
        let signedIndex = line.indexOf("%+d");
        let genIndex = line.indexOf("%d");
        if (signedIndex != -1 && (genIndex == -1 || signedIndex < genIndex)) {
            line = line.replace("%+d", (number > 0 ? "+" : "") + number.toString());
        } else {
            line = line.replace("%d", number.toString());
        }
        return line;
    }

    function descLineGeneral(descLine, next = false) {
        let endLine = descLine["texta"];
        let calcs =
            countOccurrences(descLine["texta"], "%d") + countOccurrences(descLine["texta"], "%+d");
        if (calcs > 0) {
            let calcA = evalCalc(descLine["calca"], next);
            endLine = replaceFirstNumber(endLine, calcA);
        }
        if (calcs > 1) {
            let calcB = evalCalc(descLine["calcb"], next);
            endLine = replaceFirstNumber(endLine, calcB);
        }

        if (countOccurrences(descLine["texta"], "%s") > 0) {
            endLine = endLine.replace("%s", descLine["textb"]);
        }

        endLine = endLine.replaceAll("%%", "%");
        return endLine;
    }

    // Tooltip
    let formattedDescription =
        skillData["description"].charAt(0).toUpperCase() + skillData["description"].slice(1) + ".";

    $: tooltipContent = `
    <div class='col flex-center'>
        <h3 id='skillTitle'>${skillData["name"]}</h3>
        <p class='descripton'>${formattedDescription}</p>
        <p id='levelreq' style='${
            character.level < skillData["reqlevel"] ? "color:var(--pico-del-color)" : ""
        }'>
            Required Level: ${skillData["reqlevel"]}
        </p>
        
            ${skillData["dsc2lines"]
                .map((line) => "<span class='desc'>" + descLine(line) + "</span></br>")
                .reverse()
                .join("\n")}
        <p class='desc'>${
            skills[currentId].points > 0
                ? "Current Skill Level: " + skills[currentId].points
                : "First Level"
        }
        </p>
        <p>
            ${skillData["desclines"]
                .map((line) => "<span class='desc'>" + descLine(line) + "</span></br>")
                .reverse()
                .join("\n")}
        </p>
        <p>
            ${
                skills[currentId].points < 1
                    ? ""
                    : "<span class='desc'>Next Level</span><br>" +
                      skillData["desclines"]
                          .map(
                              (line) =>
                                  "<span class='desc'>" + descLine(line, true) + "</span></br>"
                          )
                          .reverse()
                          .join("\n")
            }
        </p>
        <p>
            ${skillData["dsc3lines"]
                .map((line) => "<span class='desc'>" + descLine(line) + "</span></br>")
                .join("\n")}
        </p>
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
            type="number"
            name="id"
            min="0"
            max="99"
            step="1"
            bind:value={skills[currentId].points}
        />
    </div>
</div>

<style>
    button {
        font-size: small;
        height: 6rem;
        width: 6rem;
        padding: 0.2rem;
    }

    input {
        width: 2rem;
        height: 2rem;
        padding: 0.2rem;
    }

    .invested-points {
        background-color: var(--pico-primary);
        color: var(--pico-primary-inverse);
    }
    .no-points {
        color: var(--pico-muted-color);
        background-color: var(--pico-form-element-background-color);
    }
</style>
