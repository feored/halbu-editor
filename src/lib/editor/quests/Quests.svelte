<script>
	import * as Settings from "../../utils/settings.js";
	import { onDestroy } from "svelte";
	import acts from "./actquests.json";
	import {
		applyQuestRewards,
		countActProgress,
		getQuestFlagsForBulkToggle,
		getRenderedActQuests,
		getStandardActQuests,
	} from "./questsLogic";
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

	const REWARD_FEEDBACK_INFO_TIMEOUT_MS = 3500;
	const REWARD_FEEDBACK_WARNING_TIMEOUT_MS = 6000;
	let rewardFeedbackByQuest = $state({});
	const rewardFeedbackTimeouts = new Map();
	onDestroy(() => {
		for (const timeoutId of rewardFeedbackTimeouts.values()) {
			clearTimeout(timeoutId);
		}
		rewardFeedbackTimeouts.clear();
	});

	const totalQuestProgress = $derived.by(() => {
		let completed = 0;
		let total = 0;
		for (const difficulty of difficulties) {
			for (const act of acts) {
				const actProgress = countActProgress(
					difficulty.id,
					act,
					save.quests,
					showPrologue,
				);
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
		return save.quests[difficultyId][actId][questId].state;
	}

	function rewardFeedbackKey(difficultyId, actId, questId) {
		return `${difficultyId}:${actId}:${questId}`;
	}

	function setRewardFeedback(difficultyId, actId, questId, kind, text) {
		const key = rewardFeedbackKey(difficultyId, actId, questId);
		rewardFeedbackByQuest = {
			...rewardFeedbackByQuest,
			[key]: { kind, text },
		};
		if (rewardFeedbackTimeouts.has(key)) {
			clearTimeout(rewardFeedbackTimeouts.get(key));
			rewardFeedbackTimeouts.delete(key);
		}
		const timeoutMs =
			kind === "warning"
				? REWARD_FEEDBACK_WARNING_TIMEOUT_MS
				: REWARD_FEEDBACK_INFO_TIMEOUT_MS;
		const timeoutId = setTimeout(() => {
			clearRewardFeedbackByKey(key);
		}, timeoutMs);
		rewardFeedbackTimeouts.set(key, timeoutId);
	}

	function clearRewardFeedbackByKey(key) {
		if (!(key in rewardFeedbackByQuest)) {
			return;
		}
		if (rewardFeedbackTimeouts.has(key)) {
			clearTimeout(rewardFeedbackTimeouts.get(key));
			rewardFeedbackTimeouts.delete(key);
		}
		const nextFeedback = { ...rewardFeedbackByQuest };
		delete nextFeedback[key];
		rewardFeedbackByQuest = nextFeedback;
	}

	function clearRewardFeedback(difficultyId, actId, questId) {
		const key = rewardFeedbackKey(difficultyId, actId, questId);
		clearRewardFeedbackByKey(key);
	}

	function getRewardFeedback(difficultyId, actId, questId) {
		const key = rewardFeedbackKey(difficultyId, actId, questId);
		return rewardFeedbackByQuest[key] ?? null;
	}

	function handleRewards(difficultyId, actId, questId, flagId, add) {
		if (flagId !== "RewardGranted") {
			return;
		}
		const rewardFeedback = applyQuestRewards(save.attributes, actId, questId, add);
		if (rewardFeedback == null) {
			clearRewardFeedback(difficultyId, actId, questId);
			return;
		}
		setRewardFeedback(
			difficultyId,
			actId,
			questId,
			rewardFeedback.kind,
			rewardFeedback.text,
		);
	}

	function removeFlag(difficultyId, actId, questId, flagId) {
		const questState = getQuestStateRef(difficultyId, actId, questId);
		if (questState.includes(flagId)) {
			save.quests[difficultyId][actId][questId].state = save.quests[difficultyId][actId][
				questId
			].state.filter((item) => item !== flagId);
			handleRewards(difficultyId, actId, questId, flagId, false);
		}
	}

	function addFlag(difficultyId, actId, questId, flagId) {
		const questState = getQuestStateRef(difficultyId, actId, questId);
		if (!questState.includes(flagId)) {
			save.quests[difficultyId][actId][questId].state = [
				flagId,
				...save.quests[difficultyId][actId][questId].state,
			];
			handleRewards(difficultyId, actId, questId, flagId, true);
		}
	}

	function toggleFlag(difficultyId, actId, questId, flagId) {
		const questState = getQuestStateRef(difficultyId, actId, questId);
		const flagPresent = questState.includes(flagId);
		if (flagPresent) {
			removeFlag(difficultyId, actId, questId, flagId);
		} else {
			addFlag(difficultyId, actId, questId, flagId);
		}
	}

	function isStateIndetermined(difficultyId, actId, questId, questState) {
		const storedState = getQuestStateRef(difficultyId, actId, questId);
		let flagsPresent = 0;
		questState.flags.forEach((flag) => {
			flagsPresent += storedState.includes(flag) ? 1 : 0;
		});
		return flagsPresent !== 0 && flagsPresent !== questState.flags.length;
	}

	function isStatePresent(difficultyId, actId, questId, questState) {
		const storedState = getQuestStateRef(difficultyId, actId, questId);
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
		return storedState.includes(flagId);
	}

	function setActQuests(difficultyId, act, advancedMode, value) {
		const quests = advancedMode
			? getRenderedActQuests(act, showPrologue, advancedAllQuests, unused_act_quests)
			: getStandardActQuests(act, showPrologue);
		for (const quest of quests) {
			const flags = getQuestFlagsForBulkToggle(quest, advancedMode, questFlags);
			for (const flagId of flags) {
				if (value) {
					addFlag(difficultyId, act.id, quest.id, flagId);
				} else {
					removeFlag(difficultyId, act.id, quest.id, flagId);
				}
			}
		}
	}
</script>

<div class="grid gap-2.5">
	<div class="flex flex-wrap items-stretch justify-between gap-2">
		<div class="flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-halbu-border bg-halbu-panel px-1.5 py-1.5">
			{#each difficulties as difficulty}
				<button
					type="button"
					class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
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

		<div class="flex min-h-10 min-w-56 flex-1 flex-col justify-center rounded-sm border border-halbu-border bg-halbu-panel px-2 py-1.5">
			<div class="mb-1 flex items-center justify-between gap-2 text-sm">
				<span class="text-halbu-textMuted">Total quest progress</span>
				<span class="text-halbu-text">
					{totalQuestProgress.completed}/{totalQuestProgress.total} ({totalQuestProgress.percent}%)
				</span>
			</div>
			<div class="h-1 overflow-hidden rounded-xs bg-halbu-border">
				<div
					class="h-full bg-halbu-info transition-[width] duration-200"
					style={`width: ${totalQuestProgress.percent}%`}
				></div>
			</div>
		</div>
	</div>

	{#if activeDifficulty}
		<div class="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
			{#each actColumns as actColumn}
				<div class="grid content-start gap-2.5">
					{#each actColumn as act}
						{@const actProgress = countActProgress(activeDifficulty.id, act, save.quests, showPrologue)}
						<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
							<div class="mb-1.5 flex items-start justify-between gap-2">
								<div class="min-w-0">
									<h3 class="editor-card-title">{act.display}</h3>
									<p class="m-0 mt-0.5 text-xs text-halbu-textMuted">
										{actProgress.completed}/{actProgress.total} completed
									</p>
								</div>
								<div class="inline-flex shrink-0 items-center gap-1">
									<button
										type="button"
										class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-xs font-medium text-halbu-text hover:bg-halbu-panel"
										onclick={() => setActQuests(activeDifficulty.id, act, advancedFlags, true)}
									>
										All
									</button>
									<button
										type="button"
										class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-xs font-medium text-halbu-textMuted hover:bg-halbu-panel hover:text-halbu-text"
										onclick={() => setActQuests(activeDifficulty.id, act, advancedFlags, false)}
									>
										None
									</button>
									<span class="ml-0.5 text-sm text-halbu-textMuted">{actProgress.percent}%</span>
								</div>
							</div>
							<div class="mb-1.5 h-1 overflow-hidden rounded-xs bg-halbu-border">
								<div
									class="h-full bg-halbu-info transition-[width] duration-200"
									style={`width: ${actProgress.percent}%`}
								></div>
							</div>

							<div class="grid gap-1.5">
								{#if advancedFlags}
									{#each getRenderedActQuests(act, showPrologue, advancedAllQuests, unused_act_quests) as quest}
										{@const isCompletionQuest = quest.id === "completion"}
										{@const rewardFeedback = getRewardFeedback(activeDifficulty.id, act.id, quest.id)}
										<article
											class={`rounded-xs border border-halbu-border px-2 py-1.5 ${
												isCompletionQuest ? "bg-halbu-panel" : "bg-halbu-panel2"
											}`}
										>
											<h4 class="editor-card-title">{isCompletionQuest ? "Act Completion" : quest.display}</h4>
											<div class="mt-1 grid gap-0.5">
												{#each questFlags as flag}
													<label
														class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs px-0.5 py-px text-sm text-halbu-text"
														for={activeDifficulty.id + "-" + act.id + "-" + quest.id + "-" + flag.id}
													>
														<input
															class="form-check-input mt-0"
															type="checkbox"
															id={activeDifficulty.id + "-" + act.id + "-" + quest.id + "-" + flag.id}
															checked={hasFlag(activeDifficulty.id, act.id, quest.id, flag.id)}
															onchange={() => toggleFlag(activeDifficulty.id, act.id, quest.id, flag.id)}
														/>
														<span class="leading-[1.2]">{flag.display}</span>
													</label>
												{/each}
											</div>
											{#if rewardFeedback != null}
												<div
													class={`mt-1 rounded-xs border px-1.5 py-1 text-xs ${
														rewardFeedback.kind === "warning"
															? "border-halbu-warning bg-halbu-warningSoft text-halbu-warning"
															: "border-halbu-border bg-halbu-panel text-halbu-textMuted"
													}`}
												>
													{rewardFeedback.text}
												</div>
											{/if}
										</article>
									{/each}
								{:else}
									{#each getStandardActQuests(act, showPrologue) as quest}
										{@const isCompletionQuest = quest.id === "completion"}
										{@const rewardFeedback = getRewardFeedback(activeDifficulty.id, act.id, quest.id)}
										<article
											class={`rounded-xs border border-halbu-border px-2 py-1.5 ${
												isCompletionQuest ? "bg-halbu-panel" : "bg-halbu-panel2"
											}`}
										>
											<h4 class="editor-card-title">{isCompletionQuest ? "Act Completion" : quest.display}</h4>
											<div class="mt-1 grid gap-0.5">
												{#each quest.states as state}
													<label
														class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs px-0.5 py-px text-sm text-halbu-text"
														for={activeDifficulty.id + "-" + act.id + "-" + quest.id + "-" + state.display}
													>
														<input
															class="form-check-input mt-0"
															type="checkbox"
															id={activeDifficulty.id + "-" + act.id + "-" + quest.id + "-" + state.display}
															checked={isStatePresent(activeDifficulty.id, act.id, quest.id, state)}
															indeterminate={isStateIndetermined(activeDifficulty.id, act.id, quest.id, state)}
															onchange={() => toggleState(activeDifficulty.id, act.id, quest.id, state)}
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
															{#if (quest.id === "completion" && act.id !== "act4" && act.id !== "act5") || (quest.id === "q2" && act.id === "act4")}
																<span class="form-text m-0">Required to use the waypoint to the next act.</span>
															{:else if act.id === "act5" && quest.id === "completion" && state.display !== "Completed"}
																<span class="form-text m-0">Only takes effect if Den of Evil has been completed.</span>
															{/if}
														</span>
													</label>
												{/each}
											</div>
											{#if rewardFeedback != null}
												<div
													class={`mt-1 rounded-xs border px-1.5 py-1 text-xs ${
														rewardFeedback.kind === "warning"
															? "border-halbu-warning bg-halbu-warningSoft text-halbu-warning"
															: "border-halbu-border bg-halbu-panel text-halbu-textMuted"
													}`}
												>
													{rewardFeedback.text}
												</div>
											{/if}
										</article>
									{/each}
								{/if}
							</div>
							</section>
						{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
