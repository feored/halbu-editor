<script lang="ts">
	import Tabs from "$lib/components/ui/Tabs.svelte";
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
		getPageNotices,
		getSkillStates,
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
	const gameRulesError = $derived(editorState.gameRules.error);
	const editingVersion = $derived(
		editorState.targetVersion ?? editorState.layoutVersion ?? save.version,
	);

	const supportedClasses = $derived(getSupportedClassNames(editingVersion));
	const classSupportedForVersion = $derived(
		isClassSupportedForVersion(editingVersion, save.character.className),
	);

	const isGameRulesMode = $derived(mode === "game-rules");
	const skillPointsLeft = $derived(save.attributes.newskills.value);

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
	const pageNotices = $derived(
		getPageNotices(
			hasKnownVersionSkills,
			classSupportedForVersion,
			hasClassSkills,
			skillSlotsReady,
			editingVersion,
			save.character.className,
			supportedClasses,
		),
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
		getSkillStates(
			skillsData,
			save.skills,
			save.character.level,
			skillPointsLeft,
			isGameRulesMode,
			getSkillSlot,
			skillSlotsReady,
		),
	);

	function handleSkillPointChange(skillId: number, delta: number) {
		const skillSlot = getSkillSlot(skillId);
		const skillState = skillStatesById[skillId];
		applySkillPointDelta({
			save,
			skillSlot,
			delta,
			skillState,
			availableSkillPoints: skillPointsLeft,
			isGameRulesMode,
		});
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
			availableSkillPoints: skillPointsLeft,
			isGameRulesMode,
		});
	}
</script>

<div class="skills-page grid content-start gap-2.5">
	{#if isGameRulesMode}
		<SkillsHeader
			pointsLeft={skillPointsLeft}
			disabled={!hasClassSkills}
			onRefund={() => {
				refundAllSkillPointsInSave(save);
			}}
			onPointsLeftChange={(value) => {
				setRawModePointsLeft(save, isGameRulesMode, value);
			}}
		/>
	{/if}
	{#if isGameRulesMode && gameRulesError.length > 0}
		<div
			class="rounded-sm border border-halbu-warning bg-halbu-warningSoft px-2 py-1.5 text-sm text-halbu-warning"
		>
			{gameRulesError}
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
						<div class="mb-1.5 flex justify-center">
							<Tabs
								tabs={pageIndexes.map((pageIndex) => ({
									value: pageIndex,
									label: skillPageNames[pageIndex] ?? `Skill Page ${pageIndex + 1}`,
								}))}
								active={activePageIndex}
								onSelect={(pageIndex) => {
									activePageIndex = pageIndex;
								}}
							/>
						</div>
					{/if}

					{#if activePageIndex != null}
						<SkillsTree
							skills={activePageSkills}
							{skillStatesById}
							{selectedSkillId}
							onSelect={(skillId) => {
								selectedSkillId = skillId;
							}}
							onIncrement={(skillId) => {
								handleSkillPointChange(skillId, 1);
							}}
							onDecrement={(skillId) => {
								handleSkillPointChange(skillId, -1);
							}}
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
				disabled={!canRenderTrees}
				canIncrement={selectedSkillState?.canIncrement ?? false}
				canDecrement={selectedSkillState?.canDecrement ?? false}
				onIncrement={incrementSelectedSkill}
				onDecrement={decrementSelectedSkill}
				onSetPoints={setSelectedSkillPoints}
			/>
		</div>
	</div>
</div>
