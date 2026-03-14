<script>
	import { invoke } from "@tauri-apps/api/core";
	import SkillsHeader from "./SkillsHeader.svelte";
	import SkillTreeCanvas from "./SkillTreeCanvas.svelte";
	import SkillInspectorPanel from "./SkillInspectorPanel.svelte";
	import {
		clampSkillPoints,
		getSkillPoints,
		resizeSkillSlots,
		withAddedSkillPoints,
		withAllSkillPointsRefunded,
	} from "./skillSlots";
	import {
		buildPageNotices,
		buildSkillStatesById,
		derivePageIndexes,
		deriveSkillsData,
		resolveActivePageIndex,
		resolveSelectedSkillId,
	} from "./skillsLogic";
	import {
		classLabel,
		getSkillPageNames,
		getSkillsDataset,
		skillIdToSaveId,
	} from "../../utils/GameSupport";
	import { getErrorMessage } from "../../utils/errorMessage.js";
	import { buildSkillDetails } from "./skillDetails";

	let { save = $bindable() } = $props();
	let skillsContext = $state(null);
	let skillsContextError = $state("");
	let isSkillsContextLoading = $state(false);
	let skillsContextRequestToken = 0;

	const skillSlotCount = $derived(
		skillsContext == null ? 30 : skillsContext.skill_slot_count
	);

	$effect(() => {
		save.version;
		save.character.class;
		refreshSkillsContext();
	});

	async function refreshSkillsContext() {
		const requestToken = ++skillsContextRequestToken;
		isSkillsContextLoading = true;
		skillsContextError = "";
		try {
			/** @type {import("../../types/editor").SkillsContext} */
			const nextSkillsContext = await invoke("get_skills_context", {
				version: save.version,
				class: save.character.class,
			});
			if (requestToken !== skillsContextRequestToken) {
				return;
			}
			save.skills = resizeSkillSlots(save.skills, nextSkillsContext.skill_slot_count);
			skillsContext = nextSkillsContext;
		} catch (error) {
			if (requestToken !== skillsContextRequestToken) {
				return;
			}
			skillsContext = null;
			skillsContextError = getErrorMessage(error, "Failed to load skills context.");
		} finally {
			if (requestToken === skillsContextRequestToken) {
				isSkillsContextLoading = false;
			}
		}
	}

	const skillsDataset = $derived(getSkillsDataset(save.version));
	const hasKnownVersionSkills = $derived(skillsDataset != null);

	const skillsData = $derived(deriveSkillsData(skillsDataset, save.version, save.character.class));
	const hasBackendClassSupport = $derived(
		skillsContext == null ? true : skillsContext.class_supported_for_version
	);
	const skillSlotsReady = $derived(save.skills.length === skillSlotCount);
	const hasClassSkills = $derived(skillsData.length > 0 && hasBackendClassSupport);
	const pageIndexes = $derived(derivePageIndexes(skillsData));
	const skillPageNames = $derived(getSkillPageNames(save.version, save.character.class, skillsData));
	const canRenderTrees = $derived(hasClassSkills && skillSlotsReady);
	const pageNotices = $derived(
		buildPageNotices({
			skillsContextError,
			hasKnownVersionSkills,
			hasBackendClassSupport,
			hasClassSkills,
			skillSlotsReady,
			version: save.version,
			classLabel: classLabel(save.character.class),
			supportedClasses: skillsContext == null ? [] : skillsContext.supported_classes,
		})
	);

	let activePageIndex = $state(null);
	let selectedSkillId = $state(null);

	$effect(() => {
		activePageIndex = resolveActivePageIndex(canRenderTrees, pageIndexes, activePageIndex);
	});

	$effect(() => {
		selectedSkillId = resolveSelectedSkillId(
			canRenderTrees,
			skillsData,
			activePageIndex,
			selectedSkillId
		);
	});

	function getSkillSlot(skillId) {
		return skillIdToSaveId(save.version, save.character.class, skillId);
	}

	const skillStatesById = $derived(
		buildSkillStatesById(skillsData, {
			skillSlotsReady,
			saveSkills: save.skills,
			characterLevel: save.character.level,
			availableSkillPoints: save.attributes.newskills.value,
			getSkillSlot,
		})
	);

	function skillStateFor(skillId) {
		return skillStatesById[skillId];
	}

	function handleSkillPointChange(skillId, delta) {
		const skillNum = getSkillSlot(skillId);
		if (skillNum < 0 || delta === 0) {
			return;
		}

		const skillState = skillStateFor(skillId);
		if (skillState == null) {
			return;
		}

		if (delta > 0) {
			if (!skillState.available) {
				return;
			}
			if (save.attributes.newskills.value < delta) {
				return;
			}
			const nextSkills = withAddedSkillPoints(save.skills, skillNum, delta);
			if (nextSkills !== save.skills) {
				save.attributes.newskills.value -= delta;
				save.skills = nextSkills;
			}
		} else {
			const pointsToRefund = Math.abs(delta);
			if (skillState.points < pointsToRefund) {
				return;
			}
			const nextSkills = withAddedSkillPoints(save.skills, skillNum, delta);
			if (nextSkills !== save.skills) {
				save.attributes.newskills.value += pointsToRefund;
				save.skills = nextSkills;
			}
		}
	}

	function refund() {
		const { skills: nextSkills, refundedPoints } = withAllSkillPointsRefunded(save.skills);
		if (refundedPoints < 1) {
			return;
		}
		save.attributes.newskills.value += refundedPoints;
		save.skills = nextSkills;
	}

	const selectedSkill = $derived.by(() =>
		skillsData.find((skill) => skill.id === selectedSkillId)
	);
	const selectedSkillDetails = $derived.by(() =>
		selectedSkill == null
			? null
			: buildSkillDetails({
					skillData: selectedSkill,
					skillsData,
					skills: save.skills,
					character: save.character,
					version: save.version,
				})
	);
	const selectedSkillState = $derived.by(() =>
		selectedSkill == null ? null : skillStateFor(selectedSkill.id)
	);

	function selectSkill(skillId) {
		selectedSkillId = skillId;
	}

	function selectSkillPage(pageIndex) {
		activePageIndex = pageIndex;
	}

	function setPointsLeft(value) {
		save.attributes.newskills.value = clampSkillPoints(value);
	}

	function incrementSelectedSkill() {
		if (selectedSkill == null) {
			return;
		}
		handleSkillPointChange(selectedSkill.id, 1);
	}

	function decrementSelectedSkill() {
		if (selectedSkill == null) {
			return;
		}
		handleSkillPointChange(selectedSkill.id, -1);
	}

	function setSelectedSkillPoints(nextPoints) {
		if (selectedSkill == null) {
			return;
		}
		const current = getSkillPoints(save.skills, selectedSkill.saveId);
		const clamped = clampSkillPoints(nextPoints);
		const delta = clamped - current;
		if (delta !== 0) {
			handleSkillPointChange(selectedSkill.id, delta);
		}
	}

	function incrementSkill(skillId) {
		handleSkillPointChange(skillId, 1);
	}

	function decrementSkill(skillId) {
		handleSkillPointChange(skillId, -1);
	}
</script>

<div class="skills-page grid content-start gap-2.5">
	<SkillsHeader
		pointsLeft={save.attributes.newskills.value}
		disabled={!hasClassSkills || isSkillsContextLoading}
		onRefund={refund}
		onPointsLeftChange={setPointsLeft}
	/>

	{#if isSkillsContextLoading}
		<div class="rounded-sm border border-halbu-info bg-halbu-infoSoft px-2 py-1.5 text-sm text-halbu-info">
			Loading skills context...
		</div>
	{/if}

	{#if pageNotices.length > 0}
		<div class="grid gap-1.5">
			{#each pageNotices as notice}
				<div
					class={`rounded-sm border px-2 py-1.5 text-sm ${
						notice.level === "warning"
							? "border-halbu-warning bg-halbu-warningSoft text-halbu-warning"
							: "border-halbu-info bg-halbu-infoSoft text-halbu-info"
					}`}
				>
					{notice.text}
				</div>
			{/each}
		</div>
	{/if}

		<div class="grid min-w-0 gap-2 xl:grid-cols-skills">
		<div class="min-w-0">
			{#if canRenderTrees}
				<SkillTreeCanvas
					pageIndexes={pageIndexes}
					skillPageNames={skillPageNames}
					skillsData={skillsData}
					skillStatesById={skillStatesById}
					activePageIndex={activePageIndex}
					selectedSkillId={selectedSkillId}
					onPageSelect={selectSkillPage}
					onSelect={selectSkill}
					onIncrement={incrementSkill}
					onDecrement={decrementSkill}
				/>
			{:else}
				<div class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 text-sm text-halbu-textMuted">
					Skill tree is unavailable for this save context.
				</div>
			{/if}
		</div>

		<div class="min-w-0 xl:max-w-xl">
			<SkillInspectorPanel
				skillDetails={selectedSkillDetails}
				disabled={!canRenderTrees || isSkillsContextLoading}
				canIncrement={selectedSkillState != null && selectedSkillState.canIncrement}
				canDecrement={selectedSkillState != null && selectedSkillState.canDecrement}
				onIncrement={incrementSelectedSkill}
				onDecrement={decrementSelectedSkill}
				onSetPoints={setSelectedSkillPoints}
			/>
		</div>
	</div>
</div>
