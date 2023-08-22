<script>
    import skillpages from "./skillpages.json";
    import Skill from "./Skill.svelte";
    import { Message } from "../../utils/Message.svelte";
    import { Rows } from "lucide-svelte";
    import allSkillsData from "../../../../static/skills_complete.json";
    import { onMount } from "svelte";

    export let save;

    const skillRows = 6;
    const skillCols = 3;

    const skillOffset = {
        "Amazon": 6,
        "Sorceress": 36,
        "Necromancer": 66,
        "Paladin": 96,
        "Barbarian": 126,
        "Druid": 221,
        "Assassin": 251
    }

    function skillIdToSaveId(id){
        return id-skillOffset[save.character.class];
    }

    let skillsData = allSkillsData.filter(
        (skillData) => skillData.class == save.character.class
    );

    let clickableSkills = new Array(30);

    onMount(() => {
		updateClickableSkills();
	});

    function isSkillClickable(id) {
        let skillData = skillsData.find((skill) => skill["id"] == id);
        // check level req first
        if (skillData["reqlevel"] > save.character.level) {
            return false;
        }
        // check prereqs
        let prereqsFulfilled = true;
        skillData["reqskills"].forEach((skillId) => {
            let skillSaveId = skillIdToSaveId(skillId);
            if (save.skills[skillSaveId].points < 1) {
                prereqsFulfilled = false;
            }
        });
        return prereqsFulfilled;
    }

    function updateClickableSkills(){
        clickableSkills = save.skills.map((skill) => isSkillClickable(skill.id));
    }

    updateClickableSkills();

    function handleSkillChanges(event){
        switch (event.detail.id){
            case Message.SkillPointChange:
                let skillNum = skillIdToSaveId(event.detail.data.id);
                if (event.detail.data["value"] > 0 && isSkillClickable(event.detail.data.id)){
                    save.skills[skillNum].points += event.detail.data.value;
                    save.attributes.newskills.value -= event.detail.data.value;
                    updateClickableSkills();
                } else if (save.skills[skillNum].points > 0 && save.skills[skillNum].points >= event.detail.data.value){
                    save.skills[skillNum].points += event.detail.data.value;
                    save.attributes.newskills.value -= event.detail.data.value;
                    updateClickableSkills();
                }
                //save.attributes.newskills.value += event.detail.data;
                break;
            default:
                console.error("Skills page received message that was not skill point change: " + event.detail.id.description);
                break;
        }
    }


    function refund(){
        save.skills.map((skill) => {
            save.attributes.newskills.value += skill.points;
            skill.points = 0;
        });
        save.skills = [...save.skills];
    }

</script>

<div id="skillTree">
    <div id="pageSelection" />
    <div class="row spaced">
        <div class="col">
            <h3>
                {skillpages[save.character.class][2]}
            </h3>
            <div class="grid-3 selected-page" style="padding:10px;">
                {#each skillsData.filter((skill) => skill.page == 3) as skill}
                    <Skill
                        id={skill.id}
                        skillData={skill}
                        skillPoints={save.skills[skill["saveId"]].points}
                        isClickable={clickableSkills[skill["saveId"]]}
                        charLevel={save.attributes.level.value}
                        on:message={handleSkillChanges}
                    />
                {/each}
            </div>
        </div>
        <div class="col">
            <h3>
                {skillpages[save.character.class][1]}
            </h3>
            <div class="grid-3 selected-page" style="padding:10px;">
                {#each skillsData.filter((skill) => skill.page == 2) as skill}
                    <Skill
                        id={skill.id}
                        skillData={skill}
                        skillPoints={save.skills[skill["saveId"]].points}
                        isClickable={clickableSkills[skill["saveId"]]}
                        charLevel={save.attributes.level.value}
                        on:message={handleSkillChanges}
                    />
                {/each}
            </div>
        </div>
        <div class="col">
            <h3>
                {skillpages[save.character.class][0]}
            </h3>
            <div class="grid-3 selected-page" style="padding:10px;">
                {#each skillsData.filter((skill) => skill.page == 1) as skill}
                    <Skill
                        id={skill.id}
                        skillData={skill}
                        skillPoints={save.skills[skill["saveId"]].points}
                        isClickable={clickableSkills[skill["saveId"]]}
                        charLevel={save.attributes.level.value}
                        on:message={handleSkillChanges}
                    />
                {/each}
            </div>
        </div>
    </div>
</div>
<div class="row spaced" style="margin-top:10px">
    <button on:click={refund}>Refund All Points</button>
    <p>Points Left: {save.attributes.newskills.value}</p>
</div>

<style>
    .selected-page-btn {
        background-color: var(--transparent);
        width: 100%;
    }

    .selected-page {
        border-radius: 6px;
        width: 450px;
        height: 600px;
        background-color: var(--transparent);
    }

    .unselected-page-btn {
        color: var(--text-muted);
        width: 100%;
    }

    #skillTree {
        width: 450px;
    }

    #skillTree #pageSelection {
        margin: auto;
        justify-content: space-between;
        align-items: center;
        display: flex;
        flex-direction: row;
    }

    #skillTree #pageSelection button {
        height: 60px;
    }
</style>
