<script>
	import { invoke } from "@tauri-apps/api/tauri";
	import { InfoIcon } from "lucide-svelte";
	import { Message, buildMessage } from "../../utils/Message.svelte";
	import { createEventDispatcher } from "svelte";
	import { enforceMinMax, tooltip } from "../../utils/actions.js";
	import { calcTitle, calcDifficultyBeaten } from "../../utils/Utils.svelte";

	import experienceTable from "./experience.json";
	import { Class, Difficulty, Act } from "../../utils/Constants.svelte";

	const dispatch = createEventDispatcher();
	function dispatchMessage(id, data) {
		dispatch("message", buildMessage(id, data));
	}

	export let save;
	export let validSave;

	$: validSave = validName;

	const MAX_GOLD_PER_LEVEL = 10000;
	const MAX_XP = 3520485254;

	let nameRef;

	$: goldInventoryMax = MAX_GOLD_PER_LEVEL * save.character.level;

	let currentLife = save.attributes.hitpoints.value / 256;
	$: save.attributes.hitpoints.value = Math.round(currentLife * 256);

	let baseLife = save.attributes.maxhp.value / 256;
	$: save.attributes.maxhp.value = Math.round(baseLife * 256);

	let currentMana = save.attributes.mana.value / 256;
	$: save.attributes.mana.value = Math.round(currentMana * 256);

	let baseMana = save.attributes.maxmana.value / 256;
	$: save.attributes.maxmana.value = Math.round(baseMana * 256);

	let currentStamina = save.attributes.stamina.value / 256;
	$: save.attributes.stamina.value = Math.round(currentStamina * 256);

	let baseStamina = save.attributes.maxstamina.value / 256;
	$: save.attributes.maxstamina.value = Math.round(baseStamina * 256);

	// Title & Progression

	let difficultyBeatenRef;

	let difficultiesToBeat = ["None", "Normal", "Nightmare", "Hell"];
	let difficultyBeaten = calcDifficultyBeaten(save.character);

	let title = "";
	updateTitle();

	function updateTitle() {
		save.character.progression =
			(4 + (save.character.status.expansion ? 1 : 0)) *
			difficultiesToBeat.indexOf(difficultyBeaten);
		title = calcTitle(save.character);
	}

	// Level & XP

	async function changeLevel() {
		if (save.character.level == save.attributes.level.value) {
			return; // if we have changed to the same value, don't erase old xp
		}
		save.character.level = save.attributes.level.value;
		save.attributes.experience.value = experienceTable[save.attributes.level.value - 1];
	}

	async function changeExperience() {
		let new_level = 99;
		for (let i = 0; i < 99; i++) {
			if (experienceTable[i] > save.attributes.experience.value) {
				new_level = i;
				break;
			}
		}
		if (new_level != save.attributes.level.value) {
			save.attributes.level.value = new_level;
			save.character.level = new_level;
		}
	}

	// Name validation

	let validName = true;

	function validateName() {
		let nameByteSize = new Blob([nameRef.value]).size;
		let characterByteSize = new Blob([nameRef.value.charAt(0)]).size;
		let characters = nameByteSize / characterByteSize;
		if (characters < 2 || characters > 15) {
			validName = false;
			return;
		}
		if (!RegExp(/^\p{L}[\p{L},_,\-]/, "u").test(nameRef.value)) {
			// Check that string starts with a unicode letters
			// and only contains unicode letters or _ -
			validName = false;
			return;
		}
		let dashes = 0;
		let underscores = 0;
		let i = nameRef.value.length;
		while (i--) {
			if (nameRef.value.charAt(i) == "-") {
				dashes++;
			} else if (nameRef.value.charAt(i) === "_") {
				underscores++;
			}
		}
		if (dashes > 1 || underscores > 1) {
			validName = false;
			return;
		}
		validName = true;
		save.character.name = nameRef.value;
	}

	async function changeClass() {
		let newSave = await invoke("new_save", { class: save.character.class });
		save.skills = newSave.skills;
		newSave.attributes.statpts.value = save.attributes.statpts.value;
		newSave.attributes.newskills.value = save.attributes.newskills.value;
		newSave.attributes.experience.value = save.attributes.experience.value;
		newSave.attributes.level.value = save.attributes.level.value;
		newSave.attributes.gold.value = save.attributes.gold.value;
		newSave.attributes.goldbank.value = save.attributes.goldbank.value;
		save.attributes = newSave.attributes;
	}
</script>

<div class="container m-0">
	<h6>General</h6>
	<div class="row">
		<div class="col was-validated">
			<label class="form-label" for="name">
				Name &nbsp;
				<span
					use:tooltip={{
						content:
							"<h6>Naming Restrictions</h6><ul style='text-align:left;'><li>2-15 characters</li><li>Only 1 _ and - allowed</li><li>Must begin with a letter</li><li>No numbers</li><li>No mixing languages</li></ul>",
						allowHTML: true,
						placement: "bottom",
						theme: "halbu",
						arrow: true,
						animation: "shift-toward",
						hideOnClick: false,
					}}
				>
					<InfoIcon size={18} /></span
				>
			</label>
			<input
				class="form-control {!validName ? 'valid' : 'invalid'}"
				on:keydown={validateName}
				on:input={validateName}
				on:change={validateName}
				title="2-15 characters"
				bind:this={nameRef}
				type="text"
				id="name"
				placeholder="default"
				name="name"
				required
				minlength="2"
				maxlength="15"
				size="15"
				value={save.character.name}
			/>
		</div>
		<div class="col">
			<label class="form-label" for="class">Class</label>
			<select
				class="form-select"
				bind:value={save.character.class}
				name="class"
				id="class"
				on:change={() => {
					changeClass();
					updateTitle();
				}}
			>
				<option value={Class.Amazon}>Amazon</option>
				<option value={Class.Assassin}>Assassin</option>
				<option value={Class.Barbarian}>Barbarian</option>
				<option value={Class.Druid}>Druid</option>
				<option value={Class.Necromancer}>Necromancer</option>
				<option value={Class.Paladin}>Paladin</option>
				<option value={Class.Sorceress}>Sorceress</option>
			</select>
		</div>
	</div>
	<div class="row">
		<div class="col-lg-2">
			<div id="level">
				<label class="form-label" for="level">Level</label>
				<input
					class="form-control"
					type="number"
					name="level"
					min="1"
					max="99"
					step="1"
					use:enforceMinMax
					bind:value={save.attributes.level.value}
					on:input={changeLevel}
				/>
			</div>
		</div>
		<div class="col-lg-2">
			<div id="level">
				<label class="form-label" for="experience">Experience</label>
				<input
					class="form-control"
					type="number"
					name="experience"
					min="0"
					max={MAX_XP}
					step="1"
					use:enforceMinMax
					bind:value={save.attributes.experience.value}
					on:input={changeExperience}
				/>
			</div>
		</div>
		<div class="col-lg-2">
			<div id="level">
				<label class="form-label" for="mapSeed">Map Seed</label>
				<input
					class="form-control"
					type="number"
					name="mapSeed"
					min="0"
					max="4294967295"
					step="1"
					use:enforceMinMax
					bind:value={save.character.map_seed}
				/>
			</div>
		</div>
		<div class="col-lg-6 text-center" style="margin-top:auto;">
			<div class="form-check form-check-inline">
				<input
					class="form-check-input"
					type="checkbox"
					id="expansion"
					name="expansion"
					bind:checked={save.character.status.expansion}
					disabled={save.character.class === "Druid" ||
						save.character.class === "Assassin"}
					on:change={updateTitle}
				/>
				<label class="form-check-label" for="expansion">Expansion</label>
			</div>
			<div class="form-check form-check-inline">
				<input
					class="form-check-input"
					type="checkbox"
					id="hardcore"
					name="hardcore"
					bind:checked={save.character.status.hardcore}
					on:change={updateTitle}
				/>
				<label class="form-check-label" for="hardcore">Hardcore</label>
			</div>

			<div class="form-check form-check-inline">
				<input
					class="form-check-input"
					type="checkbox"
					id="died"
					name="died"
					bind:checked={save.character.status.died}
				/>
				<label class="form-check-label" for="died"
					>Died <span
						use:tooltip={{
							content:
								"Controls whether the character has died once. Does not matter in Softcore.",
							allowHTML: true,
							placement: "bottom",
							theme: "halbu",
							arrow: true,
							animation: "shift-toward",
							hideOnClick: false,
						}}
					>
						<InfoIcon size={18} /></span
					></label
				>
			</div>

			<div class="form-check form-check-inline">
				<input
					class="form-check-input"
					type="checkbox"
					id="ladder"
					name="ladder"
					bind:checked={save.character.status.ladder}
				/>
				<label class="form-check-label" for="ladder">Ladder</label>
			</div>
		</div>
	</div>
	<hr />
	<h6>Difficulty</h6>
	<div class="row">
		<div class="col">
			<label class="form-label" for="difficultyBeaten">Difficulty Beaten</label>
			<select
				class="form-select"
				bind:value={difficultyBeaten}
				on:change={updateTitle}
				name="currentDifficulty"
			>
				<option value="None" selected={difficultyBeaten === "None"}>None</option>
				<option value="Normal" selected={difficultyBeaten === "Normal"}>Normal</option>
				<option value="Nightmare" selected={difficultyBeaten === "Nightmare"}
					>Nightmare</option
				>
				<option value="Hell" selected={difficultyBeaten === "Hell"}>Hell</option>
			</select>
		</div>
		<div class="col">
			<label class="form-label" for="title">Title</label>
			<input
				class="form-control"
				type="text"
				name="title"
				size="10"
				bind:value={title}
				readonly
			/>
		</div>
	</div>
	<div class="row">
		<div class="col">
			<label class="form-label" for="currentDifficulty">Current Difficulty</label>
			<select
				class="form-select"
				bind:value={save.character.difficulty}
				name="currentDifficulty"
			>
				<option value={Difficulty.Normal}>Normal</option>
				<option value={Difficulty.Nightmare}>Nightmare</option>
				<option value={Difficulty.Hell}>Hell</option>
			</select>
		</div>
		<div class="col">
			<label class="form-label" for="currentAct">Current Act</label>
			<select class="form-select" bind:value={save.character.act} name="currentAct">
				<option value={Act.Act1}>Act I</option>
				<option value={Act.Act2}>Act II</option>
				<option value={Act.Act3}>Act III</option>
				<option value={Act.Act4}>Act IV</option>
				<option value={Act.Act5}>Act V</option>
			</select>
		</div>
	</div>
	<hr />
	<h6>Stats</h6>
	<div class="row">
		<div class="col">
			<label class="form-label" for="strength">Strength</label>
			<input
				class="form-control"
				type="number"
				name="strength"
				min="0"
				max="1023"
				step="1"
				use:enforceMinMax
				bind:value={save.attributes.strength.value}
			/>
			<label class="form-label" for="dexterity">Dexterity</label>
			<input
				class="form-control"
				type="number"
				name="dexterity"
				min="0"
				max="1023"
				step="1"
				use:enforceMinMax
				bind:value={save.attributes.dexterity.value}
			/>
			<label class="form-label" for="vitality">Vitality</label>
			<input
				class="form-control"
				type="number"
				name="vitality"
				min="0"
				max="1023"
				step="1"
				use:enforceMinMax
				bind:value={save.attributes.vitality.value}
			/>
			<label class="form-label" for="energy">Energy</label>
			<input
				class="form-control"
				type="number"
				name="energy"
				min="0"
				max="1023"
				step="1"
				use:enforceMinMax
				bind:value={save.attributes.energy.value}
			/>
		</div>

		<div class="col">
			<div class="row">
				<div class="col">
					<label class="form-label" for="lifeCurrent">Current Life</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="lifeCurrent"
						min="1"
						max="8181"
						step="0.001"
						bind:value={currentLife}
					/>
				</div>
				<div class="col">
					<label class="form-label" for="lifeBase">Base Life</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="lifeBase"
						min="1"
						max="8181"
						step="0.001"
						bind:value={baseLife}
					/>
				</div>
			</div>
			<div class="row">
				<div class="col">
					<label class="form-label" for="manaCurrent">Current Mana</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="manaCurrent"
						min="1"
						max="8181"
						step="0.001"
						bind:value={currentMana}
					/>
				</div>
				<div class="col">
					<label class="form-label" for="manaBase">Base Mana</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="manaBase"
						min="1"
						max="8181"
						step="0.001"
						bind:value={baseMana}
					/>
				</div>
			</div>
			<div class="row">
				<div class="col">
					<label class="form-label" for="staminaCurrent">Current Stamina</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="staminaCurrent"
						min="1"
						max="8181"
						step="0.001"
						bind:value={currentStamina}
					/>
				</div>
				<div class="col">
					<label class="form-label" for="staminaBase">Base Stamina</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="staminaBase"
						min="1"
						max="8181"
						step="0.001"
						bind:value={baseStamina}
					/>
				</div>
			</div>
			<div class="row">
				<div class="col">
					<div class="col">
						<label class="form-label" for="statPointsLeft">Stat Points Left</label>
						<input
							class="form-control"
							use:enforceMinMax
							type="number"
							name="statPointsLeft"
							min="0"
							max="1023"
							step="1"
							bind:value={save.attributes.statpts.value}
						/>
					</div>
				</div>
				<div class="col">
					<label class="form-label" for="skillPointsLeft">Skill Points Left</label>
					<input
						class="form-control"
						use:enforceMinMax
						type="number"
						name="skillPointsLeft"
						min="0"
						max="255"
						step="1"
						bind:value={save.attributes.newskills.value}
					/>
				</div>
			</div>
		</div>
	</div>
	<hr />
	<h6>Gold</h6>
	<div class="row">
		<div class="col">
			<label class="form-label" for="goldInventory">Inventory</label>
			<input
				class="form-control"
				use:enforceMinMax
				type="number"
				name="goldInventory"
				min="0"
				max={goldInventoryMax}
				step="1"
				bind:value={save.attributes.gold.value}
			/>
		</div>
		<div class="col">
			<label class="form-label" for="goldStash">Stash</label>
			<input
				class="form-control"
				use:enforceMinMax
				type="number"
				name="goldStash"
				min="0"
				max="2500000"
				step="1"
				bind:value={save.attributes.goldbank.value}
			/>
		</div>
	</div>
</div>
