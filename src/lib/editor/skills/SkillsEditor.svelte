<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import SkillsHeader from "$lib/editor/skills/components/SkillsHeader.svelte";
	import SkillsTreeCanvas from "$lib/editor/skills/components/SkillsTreeCanvas.svelte";
	import SkillsInspector from "$lib/editor/skills/components/SkillsInspector.svelte";
	import { resizeSkillSlots } from "$lib/editor/skills/skillsSlots";
	import {
		applySkillPointsTarget,
		applySkillPointDelta,
		refundAllSkillPointsInSave,
		setRawModePointsLeft,
	} from "$lib/editor/skills/skillsActions";
	import {
		buildPageNotices,
		buildSkillStatesById,
		getPageIndexes,
		getSkillsData,
		getActivePageIndex,
		getSelectedSkillId,
	} from "$lib/editor/skills/skillsState";
	import { getSkillPageNames, getSkillsDataset, skillIdToSaveId } from "$lib/utils/GameSupport";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { buildSkillDetails } from "$lib/editor/skills/skillsDescriptions";
	import { editorState } from "$lib/editor/editorState.svelte";
	import type { SkillsContext } from "$lib/types/skills";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mode = $derived(session.mode);
	const effectiveDerivedValues = $derived(editorState.gameRulesValues.values);
	const effectiveDerivedValuesError = $derived(editorState.gameRulesValues.error);
	const parserLayoutVersion = $derived(editorState.layoutVersion);
	let skillsContext = $state<SkillsContext | null>(null);
	let skillsContextError = $state("");
	let isSkillsContextLoading = $state(false);
	let skillsContextRequestToken = 0;

	const effectiveVersion = $derived(
		parserLayoutVersion == null ? save.version : parserLayoutVersion,
	);

	const skillSlotCount = $derived(skillsContext == null ? 30 : skillsContext.skillSlotCount);
	const isGameRulesMode = $derived(mode === "game-rules");
	const effectiveSkillPointsLeft = $derived.by(() => {
		if (isGameRulesMode && effectiveDerivedValues != null) {
			return effectiveDerivedValues.newskills;
		}
		return save.attributes.newskills.value;
	});

	$effect(() => {
		effectiveVersion;
		save.character.className;
		refreshSkillsContext();
	});

	async function refreshSkillsContext() {
		const requestToken = ++skillsContextRequestToken;
		isSkillsContextLoading = true;
		skillsContextError = "";
		try {
			const nextSkillsContext = await invoke<SkillsContext>("get_skills_context", {
				version: effectiveVersion,
				class: save.character.className,
			});
			if (requestToken !== skillsContextRequestToken) {
				return;
			}
			save.skills = resizeSkillSlots(save.skills, nextSkillsContext.skillSlotCount);
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

	const skillsDataset = $derived(getSkillsDataset(effectiveVersion));
	const hasKnownVersionSkills = $derived(skillsDataset != null);

	const skillsData = $derived(
		getSkillsData(skillsDataset, effectiveVersion, save.character.className),
	);
	const hasBackendClassSupport = $derived(
		skillsContext == null ? true : skillsContext.classSupportedForVersion,
	);
	const skillSlotsReady = $derived(save.skills.length === skillSlotCount);
	const hasClassSkills = $derived(skillsData.length > 0 && hasBackendClassSupport);
	const pageIndexes = $derived(getPageIndexes(skillsData));
	const skillPageNames = $derived(
		getSkillPageNames(effectiveVersion, save.character.className, skillsData),
	);
	const canRenderTrees = $derived(hasClassSkills && skillSlotsReady);
	const headerDisabled = $derived(!hasClassSkills || isSkillsContextLoading);
	const pointsInputDisabled = $derived(headerDisabled || isGameRulesMode);
	const inspectorDisabled = $derived(!canRenderTrees || isSkillsContextLoading);
	const pageNotices = $derived(
		buildPageNotices({
			skillsContextError,
			hasKnownVersionSkills,
			hasBackendClassSupport,
			hasClassSkills,
			skillSlotsReady,
			version: effectiveVersion,
			className: save.character.className,
			supportedClasses: skillsContext == null ? [] : skillsContext.supportedClasses,
		}),
	);

	let activePageIndex = $state<number | null>(null);
	let selectedSkillId = $state<number | null>(null);

	$effect(() => {
		activePageIndex = getActivePageIndex(canRenderTrees, pageIndexes, activePageIndex);
	});

	$effect(() => {
		selectedSkillId = getSelectedSkillId(
			canRenderTrees,
			skillsData,
			activePageIndex,
			selectedSkillId,
		);
	});

	function getSkillSlot(skillId: number): number {
		return skillIdToSaveId(effectiveVersion, save.character.className, skillId);
	}

	const skillStatesById = $derived(
		buildSkillStatesById(skillsData, {
			skillSlotsReady,
			saveSkills: save.skills,
			characterLevel: save.character.level,
			availableSkillPoints: effectiveSkillPointsLeft,
			getSkillSlot,
		}),
	);

	function handleSkillPointChange(skillId: number, delta: number) {
		const skillNum = getSkillSlot(skillId);
		const skillState = skillStatesById[skillId];
		applySkillPointDelta({
			save,
			skillSlot: skillNum,
			delta,
			skillState,
			availableSkillPoints: effectiveSkillPointsLeft,
			isGameRulesMode,
		});
	}

	function refund() {
		refundAllSkillPointsInSave(save, isGameRulesMode);
	}

	const selectedSkill = $derived.by(() =>
		skillsData.find((skill) => skill.id === selectedSkillId),
	);
	const selectedSkillDetails = $derived.by(() =>
		selectedSkill == null
			? null
			: buildSkillDetails({
					skillData: selectedSkill,
					skillsData,
					skills: save.skills,
					character: save.character,
					version: effectiveVersion,
				}),
	);
	const selectedSkillState = $derived.by(() =>
		selectedSkill == null ? null : skillStatesById[selectedSkill.id],
	);
	const selectedCanIncrement = $derived(selectedSkillState?.canIncrement ?? false);
	const selectedCanDecrement = $derived(selectedSkillState?.canDecrement ?? false);

	function selectSkill(skillId: number) {
		selectedSkillId = skillId;
	}

	function selectSkillPage(pageIndex: number) {
		activePageIndex = pageIndex;
	}

	function setPointsLeft(value: number) {
		setRawModePointsLeft(save, isGameRulesMode, value);
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

	function setSelectedSkillPoints(nextPoints: number) {
		if (selectedSkill == null) {
			return;
		}
		applySkillPointsTarget({
			save,
			skillSlot: getSkillSlot(selectedSkill.id),
			nextPoints,
			currentPoints: save.skills[selectedSkill.saveId].points,
			skillState: selectedSkillState,
			availableSkillPoints: effectiveSkillPointsLeft,
			isGameRulesMode,
		});
	}

	function incrementSkill(skillId: number) {
		handleSkillPointChange(skillId, 1);
	}

	function decrementSkill(skillId: number) {
		handleSkillPointChange(skillId, -1);
	}
</script>

<div class="skills-page grid content-start gap-2.5">
	<SkillsHeader
		pointsLeft={effectiveSkillPointsLeft}
		disabled={headerDisabled}
		{pointsInputDisabled}
		onRefund={refund}
		onPointsLeftChange={setPointsLeft}
	/>
	{#if isGameRulesMode}
		<div class="form-text">
			Game rules mode: available points are recalculated from level, quests, and spent skill
			points.
		</div>
	{/if}
	{#if isGameRulesMode && effectiveDerivedValuesError.length > 0}
		<div
			class="rounded-sm border border-halbu-warning bg-halbu-warningSoft px-2 py-1.5 text-sm text-halbu-warning"
		>
			{effectiveDerivedValuesError}
		</div>
	{/if}

	{#if isSkillsContextLoading}
		<div
			class="rounded-sm border border-halbu-info bg-halbu-infoSoft px-2 py-1.5 text-sm text-halbu-info"
		>
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
				<SkillsTreeCanvas
					{pageIndexes}
					{skillPageNames}
					{skillsData}
					{skillStatesById}
					{activePageIndex}
					{selectedSkillId}
					onPageSelect={selectSkillPage}
					onSelect={selectSkill}
					onIncrement={incrementSkill}
					onDecrement={decrementSkill}
				/>
			{:else}
				<div
					class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 text-sm text-halbu-textMuted"
				>
					Skill tree is unavailable for this save context.
				</div>
			{/if}
		</div>

		<div class="min-w-0 xl:max-w-xl">
			<SkillsInspector
				skillDetails={selectedSkillDetails}
				disabled={inspectorDisabled}
				canIncrement={selectedCanIncrement}
				canDecrement={selectedCanDecrement}
				onIncrement={incrementSelectedSkill}
				onDecrement={decrementSelectedSkill}
				onSetPoints={setSelectedSkillPoints}
			/>
		</div>
	</div>
</div>
