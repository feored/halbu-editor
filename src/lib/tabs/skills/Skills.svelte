<script>
    import skillpages from "./skillpages.json";
    import Skill from "./Skill.svelte";
    import { Message } from "../../utils/Message.svelte";
    import { Rows } from "lucide-svelte";
    import { skillIdToSaveId } from "../../utils/Utils.svelte";
    import allSkillsData from "../../../../static/skills_complete.json";
    import { onMount } from "svelte";

    export let save;

    const skillRows = 6;
    const skillCols = 3;

    let skillsData = allSkillsData.filter((skillData) => skillData.class == save.character.class);

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
            let skillSaveId = skillIdToSaveId(skillId, save.character.class);
            if (save.skills[skillSaveId].points < 1) {
                prereqsFulfilled = false;
            }
        });
        return prereqsFulfilled;
    }

    function updateClickableSkills() {
        clickableSkills = save.skills.map((skill) => isSkillClickable(skill.id));
    }

    updateClickableSkills();

    function handleSkillChanges(event) {
        switch (event.detail.id) {
            case Message.SkillPointChange:
                let skillNum = skillIdToSaveId(event.detail.data.id, save.character.class);
                if (event.detail.data["value"] > 0 && isSkillClickable(event.detail.data.id)) {
                    save.skills[skillNum].points += event.detail.data.value;
                    save.attributes.newskills.value -= event.detail.data.value;
                    updateClickableSkills();
                } else if (
                    save.skills[skillNum].points > 0 &&
                    save.skills[skillNum].points >= event.detail.data.value
                ) {
                    save.skills[skillNum].points += event.detail.data.value;
                    save.attributes.newskills.value -= event.detail.data.value;
                    updateClickableSkills();
                }
                //save.attributes.newskills.value += event.detail.data;
                break;
            default:
                console.error(
                    "Skills page received message that was not skill point change: " +
                        event.detail.id.description
                );
                break;
        }
    }

    function refund() {
        save.skills.map((skill) => {
            save.attributes.newskills.value += skill.points;
            skill.points = 0;
        });
        save.skills = [...save.skills];
    }
</script>

<div class="pad container-center">
    <div class="grid-skills" style="margin-bottom:1rem;">
        {#each [2, 1, 0] as skillPageIndex}
            <article class="container-center">
                <header>
                    <h3 class="page-title">
                        {skillpages[save.character.class][skillPageIndex]}
                    </h3>
                </header>
                <div class="grid-3 skills-page pad">
                    {#each skillsData.filter((skill) => skill.page == skillPageIndex + 1) as skill}
                        <Skill
                            id={skill.id}
                            skillData={skill}
                            skills={save.skills}
                            character={save.character}
                            isClickable={clickableSkills[skill["saveId"]]}
                            on:message={handleSkillChanges}
                        />
                    {/each}
                </div>
            </article>
        {/each}
    </div>
    <div class="row spaced">
        <button on:click={refund}>Refund All Points</button>
        <p>Points Left: {save.attributes.newskills.value}</p>
    </div>
</div>

<style>
    article {
        margin: auto;
        max-width: 520px;
        padding-left: 0 !important;
        padding-right: 0 !important;
    }
    article > header {
        width: 100%;
        margin-bottom: 0;
    }

    article > :not(header) {
        background-color: var(--pico-secondary-background);
    }
    .grid-skills {
        display: grid;
        grid-gap: var(--pico-spacing);
        grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
        width: 90%;
    }
    .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: var(--pico-spacing);
    }

    .page-title {
        text-align: center;
    }
</style>
