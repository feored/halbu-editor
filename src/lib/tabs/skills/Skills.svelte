<script>
    export let save;

    import skilldesc from "../../../res/skilldesc.json";
    import skillpages from "./skillpages.json";
    import Skill from "./Skill.svelte";
    import { Message } from "../../utils/Message.svelte";

    const skillDescOffset = {
        "Amazon": 6,
        "Sorceress": 36,
        "Necromancer": 66,
        "Paladin": 96,
        "Barbarian": 126,
        "Druid": 160,
        "Assassin": 190
    }
    const skillRows = 6;
    const skillCols = 3;

    const classSkillDesc = skilldesc.slice(skillDescOffset[save.character.class], skillDescOffset[save.character.class] + 30);
    
    let skillPageRef;
    let pageSkills = [];
    let activeSkillPage = 3;

    function updatePage(pageID){
        pageSkills = classSkillDesc.filter((skill) => skill.SkillPage == pageID);
        activeSkillPage = pageID;
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
                save.attributes.newskills.value += event.detail.data;
                console.log(save.skills);
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
        <button on:click={() => updatePage((2-index)+1)}>{page}</button>
    {/each}
</div>
<div class="grid-3" bind:this={skillPageRef}>
    {#each pageSkills as skill}
        <Skill skillDesc={skill} skillData={save.skills.find((currentSkill) => currentSkill.skilldesc == skill.skilldesc)} availablePoints={save.attributes.newskills} on:message={handleSkillChanges}/>
    {/each}
</div>

<div class="row spaced">
    <button on:click={refund}>Refund All Points</button>
    <p>Points Left: {save.attributes.newskills.value}</p>
</div>
