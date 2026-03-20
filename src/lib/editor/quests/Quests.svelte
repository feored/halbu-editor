<script lang="ts">
	import { onDestroy } from "svelte";
	import Tabs from "$lib/components/ui/Tabs.svelte";
	import * as settings from "$lib/utils/settings";
	import { editorState } from "$lib/editor/editorState.svelte";
	import { applyGameRulesValues, getGameRules } from "$lib/editor/character/gameRules";
	import {
		ACTS,
		QUEST_FLAGS,
		applyRewardGrantedChange,
		countActProgress,
		getRenderedActQuests,
		getStandardActQuests,
		hasQuestFlag,
		isQuestStatePartial,
		isQuestStatePresent,
		removeQuestFlag,
		addQuestFlag,
		setAllActQuestFlags,
		toggleQuestState,
		type QuestState,
		type RewardFeedback,
	} from "$lib/editor/quests/quests";
	import { DIFFICULTY_NAMES, type Act, type Difficulty, type QuestFlag, type QuestId } from "$lib/types/editor";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);

	let showPrologue = $state(settings.get(settings.Key.QuestsShowPrologue));
	let advancedFlags = $state(settings.get(settings.Key.QuestsAdvancedFlags));
	let showAllQuests = $state(settings.get(settings.Key.QuestsAdvancedAllQuests));
	let activeDifficulty = $state<Difficulty>("Normal");

	const questFlags = QUEST_FLAGS;

	const rewardInfoTimeoutMs = 3500;
	const rewardWarningTimeoutMs = 6000;

	let rewardFeedback = $state<Record<string, RewardFeedback>>({});

	const feedbackTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

	onDestroy(() => {
		for (const timeoutId of feedbackTimeouts.values()) {
			clearTimeout(timeoutId);
		}
		feedbackTimeouts.clear();
	});

	const totalProgress = $derived.by(() => {
		let completed = 0;
		let total = 0;

		for (const difficulty of DIFFICULTY_NAMES) {
			for (const act of ACTS) {
				const progress = countActProgress(difficulty, act, save.quests, showPrologue);
				completed += progress.completed;
				total += progress.total;
			}
		}

		return {
			completed,
			total,
			percent: total > 0 ? Math.round((completed / total) * 100) : 0,
		};
	});

	const actColumns = $derived([ACTS.slice(0, 3), ACTS.slice(3)]);

	function indeterminate(node: HTMLInputElement, value: boolean) {
		node.indeterminate = value;

		return {
			update(nextValue: boolean) {
				node.indeterminate = nextValue;
			},
		};
	}

	function getFeedbackKey(difficulty: Difficulty, act: Act, questId: QuestId): string {
		return `${difficulty}:${act}:${questId}`;
	}

	function setFeedback(
		difficulty: Difficulty,
		act: Act,
		questId: QuestId,
		kind: RewardFeedback["kind"],
		text: string,
	): void {
		const key = getFeedbackKey(difficulty, act, questId);

		rewardFeedback = {
			...rewardFeedback,
			[key]: { kind, text },
		};

		const existingTimeout = feedbackTimeouts.get(key);
		if (existingTimeout != null) {
			clearTimeout(existingTimeout);
			feedbackTimeouts.delete(key);
		}

		const timeoutMs = kind === "warning" ? rewardWarningTimeoutMs : rewardInfoTimeoutMs;
		const timeoutId = setTimeout(() => {
			clearFeedbackKey(key);
		}, timeoutMs);

		feedbackTimeouts.set(key, timeoutId);
	}

	function clearFeedbackKey(key: string): void {
		if (!(key in rewardFeedback)) {
			return;
		}

		const timeoutId = feedbackTimeouts.get(key);
		if (timeoutId != null) {
			clearTimeout(timeoutId);
			feedbackTimeouts.delete(key);
		}

		const nextFeedback = { ...rewardFeedback };
		delete nextFeedback[key];
		rewardFeedback = nextFeedback;
	}

	function clearFeedback(difficulty: Difficulty, act: Act, questId: QuestId): void {
		clearFeedbackKey(getFeedbackKey(difficulty, act, questId));
	}

	function getFeedback(difficulty: Difficulty, act: Act, questId: QuestId): RewardFeedback | null {
		return rewardFeedback[getFeedbackKey(difficulty, act, questId)] ?? null;
	}

	function updateRewardFeedback(
		difficulty: Difficulty,
		act: Act,
		questId: QuestId,
		flag: QuestFlag,
		add: boolean,
	): void {
		const feedback = applyRewardGrantedChange(save, difficulty, act, questId, flag, add);

		if (feedback == null) {
			clearFeedback(difficulty, act, questId);
			return;
		}

		setFeedback(difficulty, act, questId, feedback.kind, feedback.text);
	}

	function toggleFlag(difficulty: Difficulty, act: Act, questId: QuestId, flag: QuestFlag): void {
		const hadReward = hasQuestFlag(save.quests, difficulty, act, questId, "RewardGranted");

		if (hasQuestFlag(save.quests, difficulty, act, questId, flag)) {
			const removed = removeQuestFlag(save.quests, difficulty, act, questId, flag);
			if (!removed) {
				return;
			}
		} else {
			const added = addQuestFlag(save.quests, difficulty, act, questId, flag);
			if (!added) {
				return;
			}
		}

		if (session.mode === "game-rules") {
			applyGameRulesValues(
				save,
				getGameRules(save, session.gameRulesBaselineSave!).values,
			);
			clearFeedback(difficulty, act, questId);
			return;
		}

		const hasReward = hasQuestFlag(save.quests, difficulty, act, questId, "RewardGranted");
		if (hadReward !== hasReward) {
			updateRewardFeedback(difficulty, act, questId, "RewardGranted", hasReward);
			return;
		}

		clearFeedback(difficulty, act, questId);
	}

	function toggleAllActQuests(difficulty: Difficulty, act: (typeof ACTS)[number], value: boolean): void {
		const quests = advancedFlags
			? getRenderedActQuests(act, showPrologue, showAllQuests)
			: getStandardActQuests(act, showPrologue);
		const rewardStates = quests.map((quest) => ({
			questId: quest.id,
			hadReward: hasQuestFlag(save.quests, difficulty, act.id, quest.id, "RewardGranted"),
		}));

		setAllActQuestFlags(
			save.quests,
			difficulty,
			act,
			showPrologue,
			advancedFlags,
			showAllQuests,
			questFlags,
			value,
		);

		if (session.mode === "game-rules") {
			applyGameRulesValues(
				save,
				getGameRules(save, session.gameRulesBaselineSave!).values,
			);
			for (const quest of quests) {
				clearFeedback(difficulty, act.id, quest.id);
			}
			return;
		}

		for (const rewardState of rewardStates) {
			const hasReward = hasQuestFlag(
				save.quests,
				difficulty,
				act.id,
				rewardState.questId,
				"RewardGranted",
			);

			if (rewardState.hadReward !== hasReward) {
				updateRewardFeedback(
					difficulty,
					act.id,
					rewardState.questId,
					"RewardGranted",
					hasReward,
				);
				continue;
			}

			clearFeedback(difficulty, act.id, rewardState.questId);
		}
	}

	function toggleState(
		difficulty: Difficulty,
		act: Act,
		questId: QuestId,
		state: QuestState,
	): void {
		const hadReward = hasQuestFlag(save.quests, difficulty, act, questId, "RewardGranted");

		toggleQuestState(save.quests, difficulty, act, questId, state);

		if (session.mode === "game-rules") {
			applyGameRulesValues(
				save,
				getGameRules(save, session.gameRulesBaselineSave!).values,
			);
			clearFeedback(difficulty, act, questId);
			return;
		}

		const hasReward = hasQuestFlag(save.quests, difficulty, act, questId, "RewardGranted");
		if (hadReward !== hasReward) {
			updateRewardFeedback(difficulty, act, questId, "RewardGranted", hasReward);
			return;
		}

		clearFeedback(difficulty, act, questId);
	}
</script>

<div class="grid gap-2.5">
	<div class="flex flex-wrap items-stretch justify-between gap-2">
		<Tabs
			tabs={["Normal", "Nightmare", "Hell"].map((d) => ({ value: d, label: d }))}
			active={activeDifficulty}
			onSelect={(d) => (activeDifficulty = d)}
		/>

		<div
			class="flex min-h-10 min-w-56 flex-1 flex-col justify-center rounded-sm border border-halbu-border bg-halbu-panel px-2 py-1.5"
		>
			<div class="mb-1 flex items-center justify-between gap-2 text-sm">
				<span class="text-halbu-textMuted">Total quest progress</span>
				<span class="text-halbu-text">
					{totalProgress.completed}/{totalProgress.total} ({totalProgress.percent}%)
				</span>
			</div>
			<div class="h-1 overflow-hidden rounded-xs bg-halbu-border">
				<div
					class="h-full bg-halbu-info transition-[width] duration-200"
					style={`width: ${totalProgress.percent}%`}
				></div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
		{#each actColumns as actColumn}
			<div class="grid content-start gap-2.5">
				{#each actColumn as act}
					{@const actProgress = countActProgress(
						activeDifficulty,
						act,
						save.quests,
						showPrologue,
					)}
					<section
						class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2"
					>
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
									onclick={() => toggleAllActQuests(activeDifficulty, act, true)}
								>
									All
								</button>
								<button
									type="button"
									class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-0.5 text-xs font-medium text-halbu-textMuted hover:bg-halbu-panel hover:text-halbu-text"
									onclick={() => toggleAllActQuests(activeDifficulty, act, false)}
								>
									None
								</button>
								<span class="ml-0.5 text-sm text-halbu-textMuted">
									{actProgress.percent}%
								</span>
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
								{#each getRenderedActQuests(act, showPrologue, showAllQuests) as quest}
									{@const isCompletionQuest = quest.id === "completion"}
									{@const rewardFeedback = getFeedback(
										activeDifficulty,
										act.id,
										quest.id,
									)}
									<article
										class={`rounded-xs border border-halbu-border px-2 py-1.5 ${
											isCompletionQuest ? "bg-halbu-panel" : "bg-halbu-panel2"
										}`}
									>
										<h4 class="editor-card-title mb-1.5">
											{isCompletionQuest ? "Act Completion" : quest.display}
										</h4>

										<div class="grid gap-0.5">
											{#each questFlags as flag}
												<label
													class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs px-0.5 py-px text-sm text-halbu-text"
													for={`${activeDifficulty}-${act.id}-${quest.id}-${flag.id}`}
												>
													<input
														class="form-check-input mt-0"
														type="checkbox"
														id={`${activeDifficulty}-${act.id}-${quest.id}-${flag.id}`}
														checked={hasQuestFlag(
															save.quests,
															activeDifficulty,
															act.id,
															quest.id,
															flag.id,
														)}
														onchange={() =>
															toggleFlag(
																activeDifficulty,
																act.id,
																quest.id,
																flag.id,
															)}
													/>
													<span class="leading-compact"
														>{flag.display}</span
													>
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
									{@const rewardFeedback = getFeedback(
										activeDifficulty,
										act.id,
										quest.id,
									)}
									<article
										class={`rounded-xs border border-halbu-border px-2 py-1.5 ${
											isCompletionQuest ? "bg-halbu-panel" : "bg-halbu-panel2"
										}`}
									>
										<h4 class="editor-card-title mb-1.5">
											{isCompletionQuest ? "Act Completion" : quest.display}
										</h4>

										<div class="grid gap-0.5">
											{#each quest.states ?? [] as state}
												{@const checked = isQuestStatePresent(
													save.quests,
													activeDifficulty,
													act.id,
													quest.id,
													state,
												)}
												{@const partial = isQuestStatePartial(
													save.quests,
													activeDifficulty,
													act.id,
													quest.id,
													state,
												)}
												<label
													class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs px-0.5 py-px text-sm text-halbu-text"
													for={`${activeDifficulty}-${act.id}-${quest.id}-${state.display}`}
												>
													<input
														class="form-check-input mt-0"
														type="checkbox"
														id={`${activeDifficulty}-${act.id}-${quest.id}-${state.display}`}
														checked={checked}
														aria-checked={partial
															? "mixed"
															: checked
																? "true"
																: "false"}
														use:indeterminate={partial}
														onchange={() =>
															toggleState(
																activeDifficulty,
																act.id,
																quest.id,
																state,
															)}
													/>
													<span class="min-w-0">
														<span
															class={`block leading-compact ${
																state.display === "Completed"
																	? "text-halbu-text"
																	: "text-halbu-textMuted"
															}`}
														>
															{state.display}
														</span>

														{#if (quest.id === "completion" && act.id !== "Act4" && act.id !== "Act5") || (quest.id === "q2" && act.id === "Act4")}
															<span class="form-text m-0">
																Required to use the waypoint to the
																next act.
															</span>
														{:else if act.id === "Act5" && quest.id === "completion" && state.display !== "Completed"}
															<span class="form-text m-0">
																Only takes effect if Den of Evil has
																been completed.
															</span>
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
</div>
