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
		{ act: "act3", quest: "q4", attribute: "maxhp", value: 20 },
		{ act: "act3", quest: "q4", attribute: "hitpoints", value: 20 },
	];
	const rewardAttributeScaleById = Object.freeze({
		hitpoints: 256,
		maxhp: 256,
		mana: 256,
		maxmana: 256,
		stamina: 256,
		maxstamina: 256,
	});
	const rewardAttributeLabels = Object.freeze({
		newskills: "Skill Points",
		statpts: "Stat Points",
		maxhp: "Base Life",
		hitpoints: "Current Life",
	});
	const REWARD_FEEDBACK_INFO_TIMEOUT_MS = 3500;
	const REWARD_FEEDBACK_WARNING_TIMEOUT_MS = 6000;
	let rewardFeedbackByQuest = $state({});
	const rewardFeedbackTimeouts = new Map();

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

	function formatSignedDelta(value) {
		const parsed = Number(value);
		if (!Number.isFinite(parsed) || parsed === 0) {
			return "0";
		}
		const absValue = Math.abs(parsed);
		const formattedValue = Number.isInteger(absValue)
			? `${absValue}`
			: absValue.toFixed(2).replace(/\.?0+$/, "");
		return parsed > 0 ? `+${formattedValue}` : `-${formattedValue}`;
	}

	function getRewardStorageScale(attributeId) {
		return rewardAttributeScaleById[attributeId] ?? 1;
	}

	function toStoredRewardValue(attributeId, gameValue) {
		return Number(gameValue) * getRewardStorageScale(attributeId);
	}

	function toDisplayedRewardDelta(attributeId, storedDelta) {
		return Number(storedDelta) / getRewardStorageScale(attributeId);
	}

	function handleRewards(difficultyId, actId, questId, flagId, add) {
		if (flagId !== "RewardGranted") {
			return;
		}

		const rewardLines = questRewards.filter((rewardLine) => {
			return rewardLine.act === actId && rewardLine.quest === questId;
		});
		if (rewardLines.length < 1) {
			clearRewardFeedback(difficultyId, actId, questId);
			return;
		}

		let hasClampedChange = false;
		const rewardChanges = [];
		const clampedChanges = [];
		for (const rewardLine of rewardLines) {
			const attribute = save.attributes?.[rewardLine.attribute];
			if (attribute == null) {
				continue;
			}
			const previousValue = Number(attribute.value) || 0;
			const maxValue = Math.pow(2, attribute.bit_length) - 1;
			const rewardStoredValue = toStoredRewardValue(rewardLine.attribute, rewardLine.value);
			const targetValue = add
				? previousValue + rewardStoredValue
				: previousValue - rewardStoredValue;
			const nextValue = Math.max(0, Math.min(targetValue, maxValue));
			attribute.value = nextValue;

			const effectiveDelta = nextValue - previousValue;
			if (add && effectiveDelta !== rewardStoredValue) {
				hasClampedChange = true;
			}
			if (!add && effectiveDelta !== -rewardStoredValue) {
				hasClampedChange = true;
			}

			const attributeLabel =
				rewardAttributeLabels[rewardLine.attribute] ?? rewardLine.attribute;
			const expectedDelta = add ? rewardStoredValue : -rewardStoredValue;
			const displayedDelta = toDisplayedRewardDelta(rewardLine.attribute, effectiveDelta);
			if (hasClampedChange && effectiveDelta !== expectedDelta) {
				clampedChanges.push(`${formatSignedDelta(displayedDelta)} ${attributeLabel} (at limit)`);
			}

			if (effectiveDelta !== 0) {
				rewardChanges.push(`${formatSignedDelta(displayedDelta)} ${attributeLabel}`);
			}
		}

		const feedbackPrefix = add ? "Reward applied:" : "Reward removed:";
		const feedbackBody =
			rewardChanges.length > 0 ? rewardChanges.join(", ") : "no effective stat change.";
		const warningSummary = add
			? "Reward was only partially applied because this stat reached its limit."
			: "Reward was only partially removed because this stat is already at its minimum.";
		const warningDetails =
			clampedChanges.length > 0 ? ` ${add ? "Applied" : "Removed"}: ${clampedChanges.join(", ")}.` : "";
		setRewardFeedback(
			difficultyId,
			actId,
			questId,
			hasClampedChange ? "warning" : "info",
			hasClampedChange
				? `${warningSummary}${warningDetails}`
				: `${feedbackPrefix} ${feedbackBody}`
		);
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
			handleRewards(difficultyId, actId, questId, flagId, false);
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
			handleRewards(difficultyId, actId, questId, flagId, true);
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

	function getQuestFlagsForBulkToggle(quest, advancedMode) {
		if (advancedMode) {
			return questFlags.map((flag) => flag.id);
		}
		const flags = new Set();
		for (const state of quest.states ?? []) {
			for (const flag of state.flags ?? []) {
				flags.add(flag);
			}
		}
		return Array.from(flags);
	}

	function setActQuests(difficultyId, act, advancedMode, value) {
		const quests = advancedMode ? getRenderedActQuests(act) : getStandardActQuests(act);
		for (const quest of quests) {
			const flags = getQuestFlagsForBulkToggle(quest, advancedMode);
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
					class={`rounded-xs border px-3 py-1.5 text-[0.92rem] font-medium leading-none transition ${
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
			<div class="mb-1 flex items-center justify-between gap-2 text-[0.84rem]">
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
						{@const actProgress = countActProgress(activeDifficulty.id, act)}
						<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
							<div class="mb-1.5 flex items-start justify-between gap-2">
								<div class="min-w-0">
									<h3 class="editor-card-title">{act.display}</h3>
									<p class="m-0 mt-0.5 text-[0.8rem] text-halbu-textMuted">
										{actProgress.completed}/{actProgress.total} completed
									</p>
								</div>
								<div class="inline-flex shrink-0 items-center gap-1">
									<button
										type="button"
										class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-[0.8rem] font-medium text-halbu-text hover:bg-halbu-panel"
										onclick={() => setActQuests(activeDifficulty.id, act, advancedFlags, true)}
									>
										All
									</button>
									<button
										type="button"
										class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-[0.8rem] font-medium text-halbu-textMuted hover:bg-halbu-panel hover:text-halbu-text"
										onclick={() => setActQuests(activeDifficulty.id, act, advancedFlags, false)}
									>
										None
									</button>
									<span class="ml-0.5 text-[0.82rem] text-halbu-textMuted">{actProgress.percent}%</span>
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
									{#each getRenderedActQuests(act) as quest}
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
														class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs px-0.5 py-px text-[0.86rem] text-halbu-text"
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
													class={`mt-1 rounded-xs border px-1.5 py-1 text-[0.8rem] ${
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
									{#each getStandardActQuests(act) as quest}
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
														class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs px-0.5 py-px text-[0.86rem] text-halbu-text"
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
													class={`mt-1 rounded-xs border px-1.5 py-1 text-[0.8rem] ${
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
