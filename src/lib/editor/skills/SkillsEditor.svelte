<script lang="ts">
	import SkillsHeader from "$lib/editor/skills/components/SkillsHeader.svelte";
	import SkillsTree from "$lib/editor/skills/components/SkillsTree.svelte";
	import SkillsInspector from "$lib/editor/skills/components/SkillsInspector.svelte";
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
	import {
		getSkillPageNames,
		getSkillsDataset,
		skillIdToSaveId,
		getSupportedClassNames,
		isClassSupportedForVersion,
	} from "$lib/utils/gameData";
	import { buildSkillDetails } from "$lib/editor/skills/skillsDescriptions";
	import { editorState } from "$lib/editor/editorState.svelte";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mode = $derived(session.mode);
	const effectiveDerivedValues = $derived(editorState.gameRulesValues.values);
	const effectiveDerivedValuesError = $derived(editorState.gameRulesValues.error);
	const editingVersion = $derived(editorState.targetVersion ?? editorState.layoutVersion ?? save.version);

	const supportedClasses = $derived(getSupportedClassNames(editingVersion));
	const classSupportedForVersion = $derived(
		isClassSupportedForVersion(editingVersion, save.character.className),
	);

	const isGameRulesMode = $derived(mode === "game-rules");
	const effectiveSkillPointsLeft = $derived.by(() => {
		if (isGameRulesMode && effectiveDerivedValues != null) {
			return effectiveDerivedValues.newskills;
		}
		return save.attributes.newskills.value;
	});

	const skillsDataset = $derived(getSkillsDataset(editingVersion));
	const hasKnownVersionSkills = $derived(skillsDataset != null);

	const skillsData = $derived(
		getSkillsData(skillsDataset, editingVersion, save.character.className),
	);
	const skillSlotCount = $derived.by(() => {
		if (skillsData.length < 1) {
			return save.skills.length;
		}

		const maxSaveId = skillsData.reduce((max, skill) => Math.max(max, skill.saveId), -1);
		return maxSaveId + 1;
	});
	const skillSlotsReady = $derived(save.skills.length === skillSlotCount);
	const hasClassSkills = $derived(skillsData.length > 0 && classSupportedForVersion);
	const pageIndexes = $derived(getPageIndexes(skillsData));
	const skillPageNames = $derived(
		getSkillPageNames(editingVersion, save.character.className, skillsData),
	);
	const canRenderTrees = $derived(hasClassSkills && skillSlotsReady);
	const headerDisabled = $derived(!hasClassSkills);
	const pointsInputDisabled = $derived(headerDisabled || isGameRulesMode);
	const inspectorDisabled = $derived(!canRenderTrees);
	const pageNotices = $derived(
		buildPageNotices({
			hasKnownVersionSkills,
			hasBackendClassSupport: classSupportedForVersion,
			hasClassSkills,
			skillSlotsReady,
			version: editingVersion,
			className: save.character.className,
			supportedClasses: [...supportedClasses],
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
		return skillIdToSaveId(editingVersion, save.character.className, skillId);
	}

	const skillStatesById = $derived(
		buildSkillStatesById(skillsData, {
			skillSlotsReady,
			saveSkills: save.skills,
			characterLevel: save.character.level,
			availableSkillPoints: effectiveSkillPointsLeft,
			isGameRulesMode,
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
		refundAllSkillPointsInSave(save);
	}

	const selectedSkill = $derived.by(() =>
		skillsData.find((skill) => skill.id === selectedSkillId),
	);
	const selectedSkillState = $derived.by(() =>
		selectedSkill == null ? null : skillStatesById[selectedSkill.id],
	);
	const activePageSkills = $derived.by(() => {
		if (activePageIndex == null) {
			return [];
		}
		return skillsData.filter((skill) => skill.page === activePageIndex + 1);
	});
	const selectedSkillDetails = $derived.by(() =>
		selectedSkill == null
			? null
			: buildSkillDetails({
					skillData: selectedSkill,
					skillsData,
					skills: save.skills,
					character: save.character,
					version: editingVersion,
					skillState: selectedSkillState,
				}),
	);
	const selectedCanIncrement = $derived(selectedSkillState?.canIncrement ?? false);
	const selectedCanDecrement = $derived(selectedSkillState?.canDecrement ?? false);

	function pageTitle(pageIndex: number): string {
		return skillPageNames[pageIndex] ?? `Skill Page ${pageIndex + 1}`;
	}

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
				<section
					class="w-full min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
				>
					{#if pageIndexes.length > 1}
						<div
							class="mb-1.5 flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-halbu-border bg-halbu-panel px-1.5 py-1.5"
						>
							{#each pageIndexes as pageIndex}
								<button
									type="button"
									class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
										activePageIndex === pageIndex
											? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
											: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
									}`}
									onclick={() => selectSkillPage(pageIndex)}
								>
									{pageTitle(pageIndex)}
								</button>
							{/each}
						</div>
					{/if}

					{#if activePageIndex != null}
						<SkillsTree
							skills={activePageSkills}
							{skillStatesById}
							{selectedSkillId}
							onSelect={selectSkill}
							onIncrement={incrementSkill}
							onDecrement={decrementSkill}
						/>
					{/if}
				</section>
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
