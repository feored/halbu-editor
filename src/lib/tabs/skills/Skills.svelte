<script>
	import skillpages from "./skillpages.json";
	import Skill from "./Skill.svelte";
	import { Message } from "../../utils/Message.svelte";
	import { Rows } from "lucide-svelte";
	import { skillIdToSaveId } from "../../utils/Utils.svelte";
	import allSkillsData from "../../../../static/skills_complete.json";
	import { onMount } from "svelte";
	import { enforceMinMax } from "../../utils/actions.js";

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
					"Skills page received a message that was not handled properly: " +
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
		// only so that svelte detects the change
		save.skills = [...save.skills];
	}
</script>

<div class="container m-0">
	<div class="col-3">
		<label class="form-text" for="pointsLeft">Skillpoints left</label>
		<div class="input-group">
			<input
				class="form-control"
				type="number"
				id="pointsLeft"
				min="0"
				max="255"
				use:enforceMinMax
				step="1"
				bind:value={save.attributes.newskills.value}
			/>
			<button class="btn btn-primary" on:click={refund}>Refund All Points</button>
		</div>
	</div>

	<div class="row">
		{#each [2, 1, 0] as skillPageIndex}
			<div class="col">
				<div class="container">
					<header>
						<h4 class="page-title my-3">
							{skillpages[save.character.class][skillPageIndex]}
						</h4>
					</header>
					<div class="grid-skills bg-custom-light rounded p-3">
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
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.grid-skills {
		display: grid;
		grid-gap: 1rem;
	}
	.page-title {
		text-align: center;
	}
</style>
