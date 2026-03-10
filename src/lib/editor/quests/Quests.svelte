<script>
	import * as Settings from "../../utils/settings.js";
	import acts from "./actquests.json";
	let { save = $bindable() } = $props();

	let showPrologue = $state(Settings.get(Settings.Key.QuestsShowPrologue));
	let advancedFlags = $state(Settings.get(Settings.Key.QuestsAdvancedFlags));
	let advancedAllQuests = $state(Settings.get(Settings.Key.QuestsAdvancedAllQuests));
	let activeDifficultyId = $state("normal");

	const difficulties = [
		{ id: "normal", display: "Normal" },
		{ id: "nightmare", display: "Nightmare" },
		{ id: "hell", display: "Hell" },
	];

	const unused_act_quests = {
		act1: [],
		act2: [],
		act3: [],
		act4: [
			{ id: "unused_1", display: "Unused Quest 1" },
			{ id: "unused_2", display: "Unused Quest 2" },
			{ id: "unused_3", display: "Unused Quest 3" },
		],
		act5: [
			{ id: "unused_1", display: "Unused Quest 1" },
			{ id: "unused_2", display: "Unused Quest 2" },
		],
	};

	const questFlags = [
		{ id: "RewardGranted", display: "Reward Granted" },
		{ id: "RewardPending", display: "Reward Pending" },
		{ id: "Started", display: "Started" },
		{ id: "LeaveTown", display: "Leave Town" },
		{ id: "EnterArea", display: "Enter Area" },
		{ id: "Custom1", display: "Custom 1" },
		{ id: "Custom2", display: "Custom 2" },
		{ id: "Custom3", display: "Custom 3" },
		{ id: "Custom4", display: "Custom 4" },
		{ id: "Custom5", display: "Custom 5" },
		{ id: "Custom6", display: "Custom 6" },
		{ id: "Custom7", display: "Custom 7" },
		{ id: "UpdateQuestLog", display: "Update Quest Log" },
		{ id: "PrimaryGoalDone", display: "Primary Goal Done" },
		{ id: "CompletedNow", display: "Completed Now" },
		{ id: "CompletedBefore", display: "Completed Before" },
	];

	const questRewards = [
		{ act: "act1", quest: "q1", attribute: "newskills", value: 1 },
		{ act: "act2", quest: "q1", attribute: "newskills", value: 1 },
		{ act: "act4", quest: "q1", attribute: "newskills", value: 2 },
		{ act: "act3", quest: "q1", attribute: "statpts", value: 5 },
		{ act: "act3", quest: "q4", attribute: "maxhp", value: 20 * 256 },
		{ act: "act3", quest: "q4", attribute: "hitpoints", value: 20 * 256 },
	];

	function shouldShowQuest(quest) {
		return quest.id !== "prologue" || showPrologue;
	}

	function getStandardActQuests(act) {
		return act.quests.filter(shouldShowQuest);
	}

	function getRenderedActQuests(act) {
		const standardQuests = getStandardActQuests(act);
		if (!advancedFlags || !advancedAllQuests) {
			return standardQuests;
		}
		return [...standardQuests, ...unused_act_quests[act.id]];
	}

	function isQuestCompletedState(stateFlags) {
		if (!Array.isArray(stateFlags)) {
			return false;
		}
		return (
			stateFlags.includes("RewardGranted") ||
			stateFlags.includes("CompletedNow") ||
			stateFlags.includes("CompletedBefore") ||
			stateFlags.includes("PrimaryGoalDone")
		);
	}

	function isQuestCompleted(difficultyId, actId, questId) {
		const stateFlags = save?.quests?.[difficultyId]?.[actId]?.[questId]?.state ?? [];
		return isQuestCompletedState(stateFlags);
	}

	function countActProgress(difficultyId, act) {
		const visibleQuests = getStandardActQuests(act);
		let completed = 0;
		for (const quest of visibleQuests) {
			if (isQuestCompleted(difficultyId, act.id, quest.id)) {
				completed += 1;
			}
		}
		const total = visibleQuests.length;
		const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
		return { completed, total, percent };
	}

	const totalQuestProgress = $derived.by(() => {
		let completed = 0;
		let total = 0;
		for (const difficulty of difficulties) {
			for (const act of acts) {
				const actProgress = countActProgress(difficulty.id, act);
				completed += actProgress.completed;
				total += actProgress.total;
			}
		}
		const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
		return { completed, total, percent };
	});

	const activeDifficulty = $derived.by(
		() => difficulties.find((difficulty) => difficulty.id === activeDifficultyId) ?? difficulties[0]
	);
	const actColumns = [acts.slice(0, 3), acts.slice(3)];

	function getQuestStateRef(difficultyId, actId, questId) {
		return save?.quests?.[difficultyId]?.[actId]?.[questId]?.state ?? null;
	}

	function handleRewards(actId, questId, flagId, add) {
		if (flagId !== "RewardGranted") {
			return;
		}

		questRewards
			.filter((rewardLine) => {
				return rewardLine.act === actId && rewardLine.quest === questId;
			})
			.forEach((rewardLine) => {
				if (add) {
					save.attributes[rewardLine.attribute].value = Math.min(
						save.attributes[rewardLine.attribute].value + rewardLine.value,
						Math.pow(2, save.attributes[rewardLine.attribute].bit_length) - 1
					);
				} else {
					save.attributes[rewardLine.attribute].value = Math.max(
						save.attributes[rewardLine.attribute].value - rewardLine.value,
						0
					);
				}
			});
	}

	function removeFlag(difficultyId, actId, questId, flagId) {
		const questState = getQuestStateRef(difficultyId, actId, questId);
		if (!Array.isArray(questState)) {
			return;
		}
		if (questState.includes(flagId)) {
			save.quests[difficultyId][actId][questId].state = save.quests[difficultyId][actId][
				questId
			].state.filter((item) => item !== flagId);
			handleRewards(actId, questId, flagId, false);
		}
	}

	function addFlag(difficultyId, actId, questId, flagId) {
		const questState = getQuestStateRef(difficultyId, actId, questId);
		if (!Array.isArray(questState)) {
			return;
		}
		if (!questState.includes(flagId)) {
			save.quests[difficultyId][actId][questId].state = [
				flagId,
				...save.quests[difficultyId][actId][questId].state,
			];
			handleRewards(actId, questId, flagId, true);
		}
	}

	function toggleFlag(difficultyId, actId, questId, flagId) {
		const questState = getQuestStateRef(difficultyId, actId, questId);
		if (!Array.isArray(questState)) {
			return;
		}
		let flagPresent = questState.includes(flagId);
		if (flagPresent) {
			removeFlag(difficultyId, actId, questId, flagId);
		} else {
			addFlag(difficultyId, actId, questId, flagId);
		}
	}

	function isStateIndetermined(difficultyId, actId, questId, questState) {
		const storedState = getQuestStateRef(difficultyId, actId, questId);
		if (!Array.isArray(storedState)) {
			return false;
		}
		let flagsPresent = 0;
		questState.flags.forEach((flag) => {
			flagsPresent += storedState.includes(flag) ? 1 : 0;
		});
		return flagsPresent !== 0 && flagsPresent !== questState.flags.length;
	}

	function isStatePresent(difficultyId, actId, questId, questState) {
		const storedState = getQuestStateRef(difficultyId, actId, questId);
		if (!Array.isArray(storedState)) {
			return false;
		}
		return questState.flags.every((flag) => {
			return storedState.includes(flag);
		});
	}

	function toggleState(difficultyId, actId, questId, questState) {
		let statePresent = isStatePresent(difficultyId, actId, questId, questState);
		if (statePresent) {
			questState.flags.forEach((flag) => {
				removeFlag(difficultyId, actId, questId, flag);
			});
		} else {
			questState.flags.forEach((flag) => {
				addFlag(difficultyId, actId, questId, flag);
			});
		}
	}

	function hasFlag(difficultyId, actId, questId, flagId) {
		const storedState = getQuestStateRef(difficultyId, actId, questId);
		if (!Array.isArray(storedState)) {
			return false;
		}
		return storedState.includes(flagId);
	}
</script>

<div class="grid gap-[0.58rem]">
	<div class="flex flex-wrap items-stretch justify-between gap-[0.5rem]">
		<div class="flex min-h-[2.5rem] w-fit items-center gap-[0.38rem] rounded-sm border border-halbu-border bg-halbu-panel px-[0.34rem] py-[0.34rem]">
			{#each difficulties as difficulty}
				<button
					type="button"
					class={`rounded-xs border px-[0.72rem] py-[0.36rem] text-[0.92rem] font-medium leading-none transition ${
						activeDifficultyId === difficulty.id
							? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
							: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
					}`}
					onclick={() => {
						activeDifficultyId = difficulty.id;
					}}
				>
					{difficulty.display}
				</button>
			{/each}
		</div>

		<div class="flex min-h-[2.5rem] min-w-[14rem] flex-1 flex-col justify-center rounded-sm border border-halbu-border bg-halbu-panel px-[0.56rem] py-[0.34rem]">
			<div class="mb-[0.22rem] flex items-center justify-between gap-2 text-[0.84rem]">
				<span class="text-halbu-textMuted">Total quest progress</span>
				<span class="text-halbu-text">
					{totalQuestProgress.completed}/{totalQuestProgress.total} ({totalQuestProgress.percent}%)
				</span>
			</div>
			<div class="h-[0.24rem] overflow-hidden rounded-xs bg-halbu-border">
				<div
					class="h-full bg-halbu-info transition-[width] duration-200"
					style={`width: ${totalQuestProgress.percent}%`}
				></div>
			</div>
		</div>
	</div>

	{#if activeDifficulty}
		<div class="grid grid-cols-1 gap-[0.58rem] lg:grid-cols-2">
			{#each actColumns as actColumn}
				<div class="grid content-start gap-[0.58rem]">
					{#each actColumn as act}
						{@const actProgress = countActProgress(activeDifficulty.id, act)}
						<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.48rem]">
							<div class="mb-[0.34rem] flex items-start justify-between gap-[0.5rem]">
								<div class="min-w-0">
									<h3 class="editor-card-title">{act.display}</h3>
									<p class="m-0 mt-[0.12rem] text-[0.8rem] text-halbu-textMuted">
										{actProgress.completed}/{actProgress.total} completed
									</p>
								</div>
								<span class="text-[0.82rem] text-halbu-textMuted">{actProgress.percent}%</span>
							</div>
							<div class="mb-[0.38rem] h-[0.2rem] overflow-hidden rounded-xs bg-halbu-border">
								<div
									class="h-full bg-halbu-info transition-[width] duration-200"
									style={`width: ${actProgress.percent}%`}
								></div>
							</div>

								<div class="grid gap-[0.34rem]">
									{#snippet questCard(difficultyId, actId, quest, advancedMode)}
										{@const isCompletionQuest = quest.id === "completion"}
										<article
											class={`rounded-xs border border-halbu-border px-[0.46rem] py-[0.34rem] ${
												isCompletionQuest ? "bg-halbu-panel" : "bg-halbu-panel2"
											}`}
										>
											<h4 class="editor-card-title">{isCompletionQuest ? "Act Completion" : quest.display}</h4>
											<div class="mt-[0.24rem] grid gap-[0.12rem]">
												{#if advancedMode}
													{#each questFlags as flag}
														<label
															class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[0.4rem] rounded-xs px-[0.1rem] py-[0.06rem] text-[0.86rem] text-halbu-text"
															for={difficultyId + "-" + actId + "-" + quest.id + "-" + flag.id}
														>
															<input
																class="form-check-input mt-0"
																type="checkbox"
																id={difficultyId + "-" + actId + "-" + quest.id + "-" + flag.id}
																checked={hasFlag(difficultyId, actId, quest.id, flag.id)}
																onchange={() => toggleFlag(difficultyId, actId, quest.id, flag.id)}
															/>
															<span class="leading-[1.2]">{flag.display}</span>
														</label>
													{/each}
												{:else}
													{#each quest.states as state}
														<label
															class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[0.4rem] rounded-xs px-[0.1rem] py-[0.06rem] text-[0.86rem] text-halbu-text"
															for={difficultyId + "-" + actId + "-" + quest.id + "-" + state.display}
														>
															<input
																class="form-check-input mt-0"
																type="checkbox"
																id={difficultyId + "-" + actId + "-" + quest.id + "-" + state.display}
																checked={isStatePresent(difficultyId, actId, quest.id, state)}
																indeterminate={isStateIndetermined(difficultyId, actId, quest.id, state)}
																onchange={() => toggleState(difficultyId, actId, quest.id, state)}
															/>
															<span class="min-w-0">
																<span
																	class={`block leading-[1.2] ${
																		state.display === "Completed"
																			? "text-halbu-text"
																			: "text-halbu-textMuted"
																	}`}
																>
																	{state.display}
																</span>
																{#if (quest.id === "completion" && actId !== "act4" && actId !== "act5") || (quest.id === "q2" && actId === "act4")}
																	<span class="form-text m-0">Required to use the waypoint to the next act.</span>
																{:else if actId === "act5" && quest.id === "completion" && state.display !== "Completed"}
																	<span class="form-text m-0">Only takes effect if Den of Evil has been completed.</span>
																{/if}
															</span>
														</label>
													{/each}
												{/if}
											</div>
										</article>
									{/snippet}
									{#each (advancedFlags ? getRenderedActQuests(act) : getStandardActQuests(act)) as quest}
										{@render questCard(activeDifficulty.id, act.id, quest, advancedFlags)}
									{/each}
								</div>
							</section>
						{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
