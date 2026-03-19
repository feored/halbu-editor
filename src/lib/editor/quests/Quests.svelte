<script lang="ts">
	import { onDestroy } from "svelte";
	import * as Settings from "$lib/utils/settings";
	import actsJson from "$lib/editor/quests/actquests.json";
	import { editorState } from "$lib/editor/editorState.svelte";
	import {
		applyRewardGrantedChange,
		countActProgress,
		getQuestFlagsForBulkToggle,
		getRenderedActQuests,
		getStandardActQuests,
		hasQuestFlag,
		isQuestStatePresent,
		removeQuestFlag,
		addQuestFlag,
		setAllActQuestFlags,
		toggleQuestState,
		type ActDisplay,
		type QuestDisplay,
		type QuestPreset,
		type RewardFeedback,
	} from "$lib/editor/quests/questsLogic";
	import { DIFFICULTY_NAMES } from "$lib/types/editor";

	import type { Act, Difficulty, QuestFlag } from "$lib/types/editor";

	type RawActDisplay = Omit<ActDisplay, "id"> & { id: Lowercase<Act> };

	const ACT_ID_BY_JSON_ID: Record<Lowercase<Act>, Act> = {
		act1: "Act1",
		act2: "Act2",
		act3: "Act3",
		act4: "Act4",
		act5: "Act5",
	};

	const acts = (actsJson as RawActDisplay[]).map((act) => ({
		...act,
		id: ACT_ID_BY_JSON_ID[act.id],
	})) as ActDisplay[];

	const session = $derived(editorState.session!);
	const save = $derived(session.save);

	let showPrologue = $state(Settings.get(Settings.Key.QuestsShowPrologue));
	let advancedFlags = $state(Settings.get(Settings.Key.QuestsAdvancedFlags));
	let showAllQuests = $state(Settings.get(Settings.Key.QuestsAdvancedAllQuests));
	let activeDifficulty = $state<Difficulty>("Normal");

	const unusedActQuests: Record<Act, QuestDisplay[]> = {
		Act1: [],
		Act2: [],
		Act3: [],
		Act4: [
			{ id: "unused_1", display: "Unused Quest 1" },
			{ id: "unused_2", display: "Unused Quest 2" },
			{ id: "unused_3", display: "Unused Quest 3" },
		],
		Act5: [
			{ id: "unused_1", display: "Unused Quest 1" },
			{ id: "unused_2", display: "Unused Quest 2" },
		],
	};

	const questFlags: Array<{ id: QuestFlag; display: string }> = [
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

	const rewardInfoTimeoutMs = 3500;
	const rewardWarningTimeoutMs = 6000;

	let rewardFeedbackByQuest = $state<Record<string, RewardFeedback>>({});

	const rewardFeedbackTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

	onDestroy(() => {
		for (const timeoutId of rewardFeedbackTimeouts.values()) {
			clearTimeout(timeoutId);
		}
		rewardFeedbackTimeouts.clear();
	});

	const totalProgress = $derived.by(() => {
		let completed = 0;
		let total = 0;

		for (const difficulty of DIFFICULTY_NAMES) {
			for (const act of acts) {
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

	const actColumns = $derived([acts.slice(0, 3), acts.slice(3)]);

	function getRewardFeedbackKey(difficulty: Difficulty, act: Act, questId: string): string {
		return `${difficulty}:${act}:${questId}`;
	}

	function setRewardFeedback(
		difficulty: Difficulty,
		act: Act,
		questId: string,
		kind: RewardFeedback["kind"],
		text: string,
	): void {
		const key = getRewardFeedbackKey(difficulty, act, questId);

		rewardFeedbackByQuest = {
			...rewardFeedbackByQuest,
			[key]: { kind, text },
		};

		const existingTimeout = rewardFeedbackTimeouts.get(key);
		if (existingTimeout != null) {
			clearTimeout(existingTimeout);
			rewardFeedbackTimeouts.delete(key);
		}

		const timeoutMs = kind === "warning" ? rewardWarningTimeoutMs : rewardInfoTimeoutMs;
		const timeoutId = setTimeout(() => {
			clearRewardFeedbackByKey(key);
		}, timeoutMs);

		rewardFeedbackTimeouts.set(key, timeoutId);
	}

	function clearRewardFeedbackByKey(key: string): void {
		if (!(key in rewardFeedbackByQuest)) {
			return;
		}

		const timeoutId = rewardFeedbackTimeouts.get(key);
		if (timeoutId != null) {
			clearTimeout(timeoutId);
			rewardFeedbackTimeouts.delete(key);
		}

		const nextRewardFeedbackByQuest = { ...rewardFeedbackByQuest };
		delete nextRewardFeedbackByQuest[key];
		rewardFeedbackByQuest = nextRewardFeedbackByQuest;
	}

	function clearRewardFeedback(difficulty: Difficulty, act: Act, questId: string): void {
		clearRewardFeedbackByKey(getRewardFeedbackKey(difficulty, act, questId));
	}

	function getRewardFeedback(
		difficulty: Difficulty,
		act: Act,
		questId: string,
	): RewardFeedback | null {
		return rewardFeedbackByQuest[getRewardFeedbackKey(difficulty, act, questId)] ?? null;
	}

	function applyRewardFeedback(
		difficulty: Difficulty,
		act: Act,
		questId: string,
		flag: QuestFlag,
		add: boolean,
	): void {
		const feedback = applyRewardGrantedChange(save, difficulty, act, questId, flag, add);

		if (feedback == null) {
			clearRewardFeedback(difficulty, act, questId);
			return;
		}

		setRewardFeedback(difficulty, act, questId, feedback.kind, feedback.text);
	}

	function toggleFlag(difficulty: Difficulty, act: Act, questId: string, flag: QuestFlag): void {
		if (hasQuestFlag(save.quests, difficulty, act, questId, flag)) {
			const removed = removeQuestFlag(save.quests, difficulty, act, questId, flag);
			if (removed) {
				applyRewardFeedback(difficulty, act, questId, flag, false);
			}
			return;
		}

		const added = addQuestFlag(save.quests, difficulty, act, questId, flag);
		if (added) {
			applyRewardFeedback(difficulty, act, questId, flag, true);
		}
	}

	function toggleAllActQuests(difficulty: Difficulty, act: ActDisplay, value: boolean): void {
		setAllActQuestFlags(
			save.quests,
			difficulty,
			act,
			showPrologue,
			advancedFlags,
			showAllQuests,
			unusedActQuests,
			questFlags,
			value,
		);
	}
</script>

<div class="grid gap-2.5">
	<div class="flex flex-wrap items-stretch justify-between gap-2">
		<div
			class="flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-halbu-border bg-halbu-panel px-1.5 py-1.5"
		>
			{#each ["Normal", "Nightmare", "Hell"] as difficulty}
				<button
					type="button"
					class={`rounded-xs border px-3 py-1.5 text-sm font-medium leading-none transition ${
						activeDifficulty === difficulty
							? "border-halbu-primary bg-halbu-panel2 text-halbu-text"
							: "border-halbu-border bg-halbu-panel text-halbu-textMuted hover:bg-halbu-panel2 hover:text-halbu-text"
					}`}
					onclick={() => {
						activeDifficulty = difficulty;
					}}
				>
					{difficulty}
				</button>
			{/each}
		</div>

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
								{#each getRenderedActQuests(act, showPrologue, showAllQuests, unusedActQuests) as quest}
									{@const isCompletionQuest = quest.id === "completion"}
									{@const rewardFeedback = getRewardFeedback(
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
									{@const rewardFeedback = getRewardFeedback(
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
												<label
													class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-xs px-0.5 py-px text-sm text-halbu-text"
													for={`${activeDifficulty}-${act.id}-${quest.id}-${state.display}`}
												>
													<input
														class="form-check-input mt-0"
														type="checkbox"
														id={`${activeDifficulty}-${act.id}-${quest.id}-${state.display}`}
														checked={isQuestStatePresent(
															save.quests,
															activeDifficulty,
															act.id,
															quest.id,
															state,
														)}
														onchange={() =>
															toggleQuestState(
																save.quests,
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
