<script>
	import { invoke } from "@tauri-apps/api/core";
	import SkillsHeader from "./SkillsHeader.svelte";
	import SkillTreeCanvas from "./SkillTreeCanvas.svelte";
	import SkillInspectorPanel from "./SkillInspectorPanel.svelte";
	import {
		addSkillPoints,
		getSkillPoints,
		normalizeSkillSlots,
		refundAllSkillPoints,
		skillsEquivalent,
	} from "./skillSlots.js";
	import {
		classLabel,
		getSkillPageNames,
		getSkillsDataset,
		skillIdToSaveId,
	} from "../../utils/GameSupport";
	import { buildSkillDetails } from "./skillDetails.js";

	let { save = $bindable() } = $props();
	let skillsContext = $state(null);
	let skillsContextError = $state("");
	let isSkillsContextLoading = $state(false);

	const skillSlotCount = $derived(skillsContext?.skill_slot_count ?? 30);

	$effect(() => {
		save.version;
		save.character.class;
		refreshSkillsContext();
	});

	async function refreshSkillsContext() {
		isSkillsContextLoading = true;
		skillsContextError = "";
		try {
			skillsContext = await invoke("get_skills_context", {
				version: Number(save.version),
				class: save.character.class,
			});
		} catch (error) {
			skillsContext = null;
			skillsContextError = String(error);
		} finally {
			isSkillsContextLoading = false;
		}
	}

	$effect(() => {
		const normalizedSkills = normalizeSkillSlots(save.skills, skillSlotCount);
		if (!skillsEquivalent(save.skills, normalizedSkills)) {
			save.skills = normalizedSkills;
		}
	});

	const skillsDataset = $derived(getSkillsDataset(save.version));
	const hasKnownVersionSkills = $derived(skillsDataset != null);

	const skillsData = $derived(
		hasKnownVersionSkills
			? skillsDataset
					.filter((skillData) => skillData.class == save.character.class)
					.map((skillData) => {
						if (Number(save.version) === 105 && save.character.class === "Warlock") {
							return {
								...skillData,
								page: 4 - Number(skillData.page),
							};
						}
						return skillData;
					})
			: []
	);
	const hasBackendClassSupport = $derived(
		skillsContext == null ? true : Boolean(skillsContext.class_supported_for_version)
	);
	const skillSlotsReady = $derived(Array.isArray(save.skills) && save.skills.length >= skillSlotCount);
	const hasClassSkills = $derived(skillsData.length > 0 && hasBackendClassSupport);
	const pageIndexes = $derived(
		Array.from(
			new Set(skillsData.map((skill) => Number(skill.page) - 1).filter((page) => page >= 0))
		).sort((a, b) => a - b)
	);
	const skillPageNames = $derived(getSkillPageNames(save.version, save.character.class, skillsData));
	const canRenderTrees = $derived(hasClassSkills && skillSlotsReady);
	const pageTitle = $derived(`${classLabel(save.character.class)} Skills`);
	const pageNotices = $derived.by(() => {
		const notices = [];
		if (skillsContextError.length > 0) {
			notices.push({
				level: "warning",
				text: `Failed to load skills context: ${skillsContextError}`,
			});
		}
		if (!hasKnownVersionSkills) {
			notices.push({
				level: "warning",
				text: `Skills editor is not available for unsupported save version ${save.version}.`,
			});
		} else if (!hasBackendClassSupport) {
			notices.push({
				level: "warning",
				text: `Skills editor is not available for class ${classLabel(save.character.class)} in save version ${save.version}. Supported classes: ${skillsContext.supported_classes.join(", ")}.`,
			});
		} else if (!hasClassSkills) {
			notices.push({
				level: "warning",
				text: `Skills editor has no data for class ${classLabel(save.character.class)} in save version ${save.version}.`,
			});
		} else if (!skillSlotsReady) {
			notices.push({
				level: "info",
				text: "Preparing skills data...",
			});
		}
		return notices;
	});

	let activePageIndex = $state(null);
	let selectedSkillId = $state(null);

	$effect(() => {
		if (!canRenderTrees || pageIndexes.length === 0) {
			activePageIndex = null;
			return;
		}
		if (activePageIndex != null && pageIndexes.includes(activePageIndex)) {
			return;
		}
		activePageIndex = pageIndexes[0];
	});

	$effect(() => {
		if (!canRenderTrees || skillsData.length === 0 || activePageIndex == null) {
			selectedSkillId = null;
			return;
		}
		const activePageSkills = skillsData.filter(
			(skill) => Number(skill.page) === Number(activePageIndex) + 1
		);
		if (
			selectedSkillId != null &&
			activePageSkills.some((skill) => Number(skill.id) === Number(selectedSkillId))
		) {
			return;
		}
		const orderedSkills = [...activePageSkills].sort((left, right) => {
			const rowDelta = Number(left.row) - Number(right.row);
			if (rowDelta !== 0) {
				return rowDelta;
			}
			return Number(left.column) - Number(right.column);
		});
		selectedSkillId = orderedSkills.length > 0 ? orderedSkills[0].id : null;
	});

	function getSkillSlot(skillId) {
		return skillIdToSaveId(save.version, save.character.class, skillId);
	}

	function buildSkillState(skillData) {
		const reqLevel = Number(skillData.reqlevel);
		const levelRequirementMet = save.character.level >= reqLevel;
		const unmetPrerequisites = skillData.reqskills.filter((requiredSkillId) => {
			const requiredSaveId = getSkillSlot(requiredSkillId);
			return requiredSaveId < 0 || getSkillPoints(save.skills, requiredSaveId) < 1;
		});
		const prerequisitesMet = unmetPrerequisites.length === 0;
		const available = levelRequirementMet && prerequisitesMet;
		const saveId = Number(skillData.saveId);
		const points = getSkillPoints(save.skills, saveId);
		const canIncrement = points < 255 && available && save.attributes.newskills.value > 0;
		const canDecrement = points > 0;

		let state = "available";
		if (points > 0) {
			state = "invested";
		} else if (!levelRequirementMet) {
			state = "locked-level";
		} else if (!prerequisitesMet) {
			state = "locked-prereq";
		}

		return {
			id: Number(skillData.id),
			saveId,
			points,
			available,
			levelRequirementMet,
			prerequisitesMet,
			state,
			canIncrement,
			canDecrement,
		};
	}

	const skillStatesById = $derived.by(() => {
		if (!skillSlotsReady) {
			return {};
		}

		const states = {};
		for (const skill of skillsData) {
			states[Number(skill.id)] = buildSkillState(skill);
		}
		return states;
	});

	function skillStateFor(skillId) {
		return skillStatesById[Number(skillId)];
	}

	function handleSkillPointChange(skillId, rawDelta) {
		const skillNum = getSkillSlot(skillId);
		const delta = Number(rawDelta);
		if (skillNum < 0 || !Number.isFinite(delta) || delta === 0) {
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
			if (addSkillPoints(save.skills, skillNum, delta)) {
				save.attributes.newskills.value -= delta;
				save.skills = [...save.skills];
			}
		} else {
			const pointsToRefund = Math.abs(delta);
			if (skillState.points < pointsToRefund) {
				return;
			}
			if (addSkillPoints(save.skills, skillNum, delta)) {
				save.attributes.newskills.value += pointsToRefund;
				save.skills = [...save.skills];
			}
		}
	}

	function refund() {
		save.attributes.newskills.value += refundAllSkillPoints(save.skills);
		// only so that svelte detects the change
		save.skills = [...save.skills];
	}

	const selectedSkill = $derived.by(() =>
		skillsData.find((skill) => Number(skill.id) === Number(selectedSkillId))
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
		selectedSkillId = Number(skillId);
	}

	function selectSkillPage(pageIndex) {
		activePageIndex = Number(pageIndex);
	}

	function setPointsLeft(value) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			save.attributes.newskills.value = Math.max(0, Math.min(255, Math.trunc(parsed)));
		}
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
		const parsed = Number(nextPoints);
		if (!Number.isFinite(parsed)) {
			return;
		}
		const current = getSkillPoints(save.skills, Number(selectedSkill.saveId));
		const clamped = Math.max(0, Math.min(255, Math.trunc(parsed)));
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

<div class="skills-page grid content-start gap-[0.6rem]">
	<SkillsHeader
		title={pageTitle}
		pointsLeft={save.attributes.newskills.value}
		disabled={!hasClassSkills || isSkillsContextLoading}
		onRefund={refund}
		onPointsLeftChange={setPointsLeft}
	/>

	{#if isSkillsContextLoading}
		<div class="rounded-sm border border-halbu-info bg-halbu-infoSoft px-[0.56rem] py-[0.38rem] text-[0.9rem] text-halbu-info">
			Loading skills context...
		</div>
	{/if}

	{#if pageNotices.length > 0}
		<div class="grid gap-[0.36rem]">
			{#each pageNotices as notice}
				<div
					class={`rounded-sm border px-[0.56rem] py-[0.38rem] text-[0.9rem] ${
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

	<div class="min-w-0 overflow-x-auto">
		<div class="flex w-max min-w-full items-start gap-[0.38rem] pr-[0.08rem]">
			<div class="min-w-0 shrink-0">
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
					<div class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem] text-[0.9rem] text-halbu-textMuted">
						Skill tree is unavailable for this save context.
					</div>
				{/if}
			</div>

			<div class="w-[19.5rem] shrink-0">
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
</div>
