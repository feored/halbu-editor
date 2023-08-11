<script>
    import skillpages from "./skillpages.json";
    import skillstrings from "./skillstrings.json";
    import Skill from "./Skill.svelte";
    import { Message } from "../../utils/Message.svelte";
    import { Rows } from 'lucide-svelte';
    //import skillsJson from "../../../res/skills.json";
    //import skillsDescJson from "../../../res/skilldesc.json";
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

    let classSkills=[];
    let clickableSkills = {};

    function skillNumFromId(id){
        return id - skillOffset[save.character.class];
    }
    
    function updateSkills(){
        classSkills = [];
        let minSkillOffset = skillOffset[save.character.class];
        for(let i = minSkillOffset;  i < minSkillOffset + 30; i++){
            classSkills.push({});
            Object.keys(skillsJson[i]).forEach((key) => 
            classSkills[i]
            );
        }
        let minSkillDescOffset = skillDescOffset[save.character.class];
        for(let i = minSkillDescOffset;  i < minSkillDescOffset + 30; i++){
            classSkills[i]skillsDescJson[i]);
            classSkills
        }
        
    }

    updateSkills();

    // function isSkillClickable(id){
    //     // check level req first
    //     if (skillsdata[id].reqlevel > save.character.level) {
    //         return false
    //     } 
    //     let prereqs = [skillsdata[id]["reqskill1"], skillsdata[id]["reqskill2"], skillsdata[id]["reqskill3"]];
    //     let prereqsFulfilled = true;
    //     prereqs.forEach((skillName) => {
    //         let skillObj = save.skills.find((skObj) => {if (skObj.name == skillName) { return skObj;}});
    //         if (skillObj != undefined && skillObj.points < 1) {
    //             prereqsFulfilled = false;
    //         } 
    //     });
    //     return prereqsFulfilled;
    // }

    // function updatePage(pageID){
    //     let tempData = [];
    //     let classSkillDesc = skilldesc.slice(skillDescOffset[save.character.class], skillDescOffset[save.character.class] + 30);
    //     let skill_descs = classSkillDesc.filter((skill) => skill.SkillPage == pageID);
    //     skill_descs.forEach((skilldescRow) => {
    //         let id = save.skills.find((currentSkill) => currentSkill.skilldesc == skilldescRow.skilldesc).id;
    //         let currentSkillString = skillstrings[skilldescRow["str name"]];
    //         let skillInfo = {"id" : id, "name" : currentSkillString[skilldescRow["str name"]],
    //         "description" : currentSkillString[skilldescRow["str long"]], "row": skilldescRow["SkillRow"],
    //         "col": skilldescRow["SkillColumn"], "skilldata": skillsdata[id]};
    //         tempData.push(skillInfo);

    //     });
    //     pageSkills = tempData;
    //     activeSkillPage = pageID;
    //     updateClickableSkills();
    // }

    // function updateClickableSkills(){
    //     console.log(save.skills);
    //     let tempClickableSkills = {};
    //     pageSkills.forEach((skillInfo) => {
    //         tempClickableSkills[skillInfo["id"]] = isSkillClickable(skillInfo["id"]);
    //         console.log(skillInfo["id"] + " : "  + isSkillClickable(skillInfo["id"]));
    //     });
    //     clickableSkills = tempClickableSkills;
    // }


    // function refund(){
    //     save.skills = [...save.skills.forEach((skill) => {
    //         save.attributes.newskills.value += skill.points;
    //         skill.points = 0;
    //     })];
    // }

    // function handleSkillChanges(event){
    //     switch (event.detail.id){
    //         case Message.SkillPointChange:
    //             let skillNum = skillNumFromId(event.detail.data.id);
    //             if (event.detail.data["value"] > 0 && isSkillClickable(event.detail.data.id)){
    //                 save.skills[skillNum].points += event.detail.data.value;
    //                 save.attributes.newskills.value -= event.detail.data.value;
    //                 updateClickableSkills();
    //             } else if (save.skills[skillNum].points > 0 && save.skills[skillNum].points >= event.detail.data.value){
    //                 save.skills[skillNum].points += event.detail.data.value;
    //                 save.attributes.newskills.value -= event.detail.data.value;
    //                 updateClickableSkills();
    //             }
    //             //save.attributes.newskills.value += event.detail.data;
                
    //             break;
    //         default:
    //             console.error("Skills page received message that was not skill point change: " + event.detail.id.description);
    //             break;
    //     }
    // }

</script>
<!-- 
<div id="skillTree">
    <div id="pageSelection">
    </div>
    <div class="row spaced">
        <div class="col">
            <h3>
                {skillpages[save.character.class][3]}
            </h3>
            <div class="grid-3 selected-page" style="padding:10px;">
                {#each classSkills.filter((skill) => skill.page == 3) as skill}
                    <Skill
                    id={skill.id}
                    skillInfo={skill}
                    skillPoints={save.skills[skill["id"] - skillOffset[save.character.class]].points}
                    isClickable={clickableSkills[skill["id"]]}
                    charLevel={save.attributes.level.value}
                    on:message={handleSkillChanges}/>
                {/each}
            </div>
        </div>
        <div class="col">
            <h3>
                {skillpages[save.character.class][2]}
            </h3>
            <div class="grid-3 selected-page" style="padding:10px;">
                {#each classSkills.filter((skill) => skill.page == 2) as skill}
                    <Skill
                    id={skill.id}
                    skillInfo={skill}
                    skillPoints={save.skills[skill["id"] - skillOffset[save.character.class]].points}
                    isClickable={clickableSkills[skill["id"]]}
                    charLevel={save.attributes.level.value}
                    on:message={handleSkillChanges}/>
                {/each}
            </div>
        </div>
        <div class="col">
            <h3>
                {skillpages[save.character.class][1]}
            </h3>
            <div class="grid-3 selected-page" style="padding:10px;">
                {#each classSkills.filter((skill) => skill.page == 1) as skill}
                    <Skill
                    id={skill.id}
                    skillInfo={skill}
                    skillPoints={save.skills[skill["id"] - skillOffset[save.character.class]].points}
                    isClickable={clickableSkills[skill["id"]]}
                    charLevel={save.attributes.level.value}
                    on:message={handleSkillChanges}/>
                {/each}
            </div>
        </div>
    </div>
</div>
<div class="row spaced" style="margin-top:10px">
    <button on:click={refund}>Refund All Points</button>
    <p>Points Left: {save.attributes.newskills.value}</p>
</div> -->


<style>
.selected-page-btn {
    background-color:var(--transparent);
    width:100%;
}

.selected-page {
    border-radius: 6px;
    width:450px;
    height:600px;
    background-color:var(--transparent);
}

.unselected-page-btn {
    color:var(--text-muted);
    width:100%;
}

#skillTree{
    width:450px;
}

#skillTree #pageSelection{
    margin:auto;
    justify-content: space-between;
    align-items: center;
    display:flex;
    flex-direction:row;
}

#skillTree #pageSelection button{
    height:60px;
}

</style>