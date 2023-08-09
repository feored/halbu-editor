<script>
    import { tooltip } from "@svelte-plugins/tooltips";
    import skilldesc from "../../../res/skilldesc.json";
    import skillpages from "./skillpages.json";
    import skillstrings from "./skillstrings.json";
    import Skill from "./Skill.svelte";
    import skillsdata from "../../../res/skills.json";
    import { Message } from "../../utils/Message.svelte";

    export let save;

    const skillDescOffset = {
        "Amazon": 6,
        "Sorceress": 36,
        "Necromancer": 66,
        "Paladin": 96,
        "Barbarian": 126,
        "Druid": 160,
        "Assassin": 190
    }

    const skillOffset = {
        "Amazon": 6,
        "Sorceress": 36,
        "Necromancer": 66,
        "Paladin": 96,
        "Barbarian": 126,
        "Druid": 221,
        "Assassin": 251
    }

    const skillRows = 6;
    const skillCols = 3;

    const classSkillDesc = skilldesc.slice(skillDescOffset[save.character.class], skillDescOffset[save.character.class] + 30);
    
    let skillPageRef;
    let pageSkills = [];
    let clickableSkills = {};
    let activeSkillPage = 3;

    function skillNumFromId(id){
        return id - skillOffset[save.character.class];
    }

    function isSkillClickable(id){
        // check level req first
        if (skillsdata[id].reqlevel > save.character.level) {
            return false
        } 
        let prereqs = [skillsdata[id]["reqskill1"], skillsdata[id]["reqskill2"], skillsdata[id]["reqskill3"]];
        let prereqsFulfilled = true;
        prereqs.forEach((skillName) => {
            let skillObj = save.skills.find((skObj) => {if (skObj.name == skillName) { return skObj;}});
            if (skillObj != undefined && skillObj.points < 1) {
                prereqsFulfilled = false;
            } 
        });
        return prereqsFulfilled;
    }

    function updatePage(pageID){        
        let tempData = [];
        let skill_descs = classSkillDesc.filter((skill) => skill.SkillPage == pageID);
        skill_descs.forEach((skilldescRow) => {
            let id = save.skills.find((currentSkill) => currentSkill.skilldesc == skilldescRow.skilldesc).id;
            let currentSkillString = skillstrings[skilldescRow["str name"]];
            let skillInfo = {"id" : id, "name" : currentSkillString[skilldescRow["str name"]],
            "description" : currentSkillString[skilldescRow["str long"]], "row": skilldescRow["SkillRow"],
            "col": skilldescRow["SkillColumn"], "skilldata": skillsdata[id]};
            tempData.push(skillInfo);

        });
        pageSkills = tempData;
        activeSkillPage = pageID;
        updateClickableSkills();
    }

    function updateClickableSkills(){
        let tempClickableSkills = {};
        pageSkills.forEach((skillInfo) => {
            tempClickableSkills[skillInfo["id"]] = isSkillClickable(skillInfo["id"]);
        });
        clickableSkills = tempClickableSkills;
        console.log(clickableSkills);
    }

    updatePage(3);


    function refund(){
        save.skills = [...save.skills.forEach((skill) => {
            save.attributes.newskills.value += skill.points;
            skill.points = 0;
        })];
    }

    function handleSkillChanges(event){
        switch (event.detail.id){
            case Message.SkillPointChange:
                let skillNum = skillNumFromId(event.detail.data.id);
                if (event.detail.data["value"] > 0 && isSkillClickable(event.detail.data.id)){
                    save.skills[skillNum].points += event.detail.data.value;
                    updateClickableSkills();
                } else if (save.skills[skillNum].points > 0 && save.skills[skillNum].points >= event.detail.data.value){
                    save.skills[skillNum].points += event.detail.data.value;
                    updateClickableSkills();
                }
                //save.attributes.newskills.value += event.detail.data;
                
                break;
            default:
                console.error("Skills page received message that was not skill point change: " + event.detail.id.description);
                break;
        }
    }

</script>

<div class="grid-3">
    {#each [...skillpages[save.character.class]].reverse() as page, index}
    <!-- D2 displays the pages in reverse order for whatever reason-->
        <button class={(2-index+1) == activeSkillPage ? "selected-page-btn" : "unselected-page-btn"} on:click={() => updatePage((2-index)+1)}>{page}</button>
    {/each}
</div>
<div class="grid-3 selected-page" style="padding:10px;" bind:this={skillPageRef}>
    {#each pageSkills as skill}
        <Skill
        id={skill.id}
        skillInfo={skill}
        skillPoints={save.skills[skill["id"] - skillOffset[save.character.class]].points}
        isClickable={clickableSkills[skill["id"]]}
        on:message={handleSkillChanges}/>
    {/each}
</div>

<div class="row spaced" style="margin-top:10px">
    <button on:click={refund}>Refund All Points</button>
    <p>Points Left: {save.attributes.newskills.value}</p>
</div>

<style>
.selected-page-btn {
    background-color:var(--panel);
    width:100%;
}

.selected-page {
    border-radius: 6px;
    background-color:var(--panel);
}

.unselected-page-btn {
    color:var(--text-muted);
    width:100%;
}
</style>