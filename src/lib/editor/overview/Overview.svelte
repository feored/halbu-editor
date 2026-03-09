<script>
	import { calcTitle } from "../../utils/Utils.svelte";
	import { classLabel, getSaveEditionLabel } from "../../utils/GameSupport";
	import mercenaryVariants from "../mercenary/variants.json";

	let { save, warningCount = 0 } = $props();

	const ACT_LABELS = Object.freeze({
		Act1: "Act I",
		Act2: "Act II",
		Act3: "Act III",
		Act4: "Act IV",
		Act5: "Act V",
	});

	const DIFFICULTY_LABELS = Object.freeze({
		Normal: "Normal",
		Nightmare: "Nightmare",
		Hell: "Hell",
	});

	const MERC_VARIANTS_BY_ID = new Map(
		mercenaryVariants.map((entry) => [Number(entry.id), entry])
	);

	function toNumber(value, fallback = 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function levelFromXp(experience, rate) {
		const safeRate = Math.max(1, toNumber(rate, 1));
		const xpConstant = toNumber(experience, 0) / safeRate;
		const s = Math.floor(Math.pow(xpConstant, 1 / 3));
		if (xpConstant < Math.pow(s, 3) + Math.pow(s, 2)) {
			return Math.max(1, s - 1);
		}
		return Math.max(1, s);
	}

	function labelFromMap(labels, value, fallback = "Unknown") {
		if (typeof value === "string" && labels[value] != null) {
			return labels[value];
		}
		if (value == null) {
			return fallback;
		}
		return String(value);
	}

	function formatCount(completed, total) {
		if (total <= 0) {
			return "0/0";
		}
		const percent = Math.round((completed / total) * 100);
		return `${completed}/${total} (${percent}%)`;
	}

	function questStateIsCompleted(stateFlags) {
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

	function clampPercent(value) {
		const numeric = toNumber(value, 0);
		return Math.max(0, Math.min(100, Math.round(numeric)));
	}

	function ratioPercent(numerator, denominator) {
		const safeDenominator = Math.max(0, toNumber(denominator, 0));
		if (safeDenominator <= 0) {
			return 0;
		}
		return clampPercent((toNumber(numerator, 0) / safeDenominator) * 100);
	}

	function formatInteger(value) {
		return toNumber(value, 0).toLocaleString();
	}

	const characterTitle = $derived(calcTitle(save?.character));
	const expansionLabel = $derived(save?.character?.status?.expansion ? "Expansion" : "Classic");
	const coreLabel = $derived(save?.character?.status?.hardcore ? "Hardcore" : "Softcore");
	const locationLabel = $derived.by(() => {
		const difficulty = labelFromMap(DIFFICULTY_LABELS, save?.character?.difficulty);
		const act = labelFromMap(ACT_LABELS, save?.character?.act);
		return `${difficulty} / ${act}`;
	});

	const skillSummary = $derived.by(() => {
		const slots = Array.isArray(save?.skills) ? save.skills : [];
		let investedPoints = 0;
		let learnedSkills = 0;
		for (const slot of slots) {
			const points = Math.max(0, toNumber(slot?.points, 0));
			investedPoints += points;
			if (points > 0) {
				learnedSkills += 1;
			}
		}
		const availablePoints = Math.max(0, toNumber(save?.attributes?.newskills?.value, 0));
		return {
			investedPoints,
			learnedSkills,
			availablePoints,
			totalPoints: investedPoints + availablePoints,
		};
	});

	const questSummary = $derived.by(() => {
		let completed = 0;
		let total = 0;

		for (const difficultyData of Object.values(save?.quests ?? {})) {
			if (difficultyData == null || typeof difficultyData !== "object") {
				continue;
			}
			for (const actData of Object.values(difficultyData)) {
				if (actData == null || typeof actData !== "object") {
					continue;
				}
				for (const questData of Object.values(actData)) {
					const stateFlags = questData?.state;
					if (!Array.isArray(stateFlags)) {
						continue;
					}
					total += 1;
					if (questStateIsCompleted(stateFlags)) {
						completed += 1;
					}
				}
			}
		}

		return {
			completed,
			total,
			label: formatCount(completed, total),
		};
	});

	const waypointSummary = $derived.by(() => {
		let acquired = 0;
		let total = 0;

		for (const difficultyData of Object.values(save?.waypoints ?? {})) {
			if (difficultyData == null || typeof difficultyData !== "object") {
				continue;
			}
			for (const actData of Object.values(difficultyData)) {
				if (!Array.isArray(actData)) {
					continue;
				}
				for (const waypoint of actData) {
					if (waypoint?.id === "RogueEncampment") {
						continue;
					}
					total += 1;
					if (waypoint?.acquired === true) {
						acquired += 1;
					}
				}
			}
		}

		return {
			acquired,
			total,
			label: formatCount(acquired, total),
		};
	});

	const resourcesSummary = $derived.by(() => {
		const goldInventory = Math.max(0, toNumber(save?.attributes?.gold?.value, 0));
		const goldStash = Math.max(0, toNumber(save?.attributes?.goldbank?.value, 0));
		return {
			goldInventory,
			goldStash,
			totalGold: goldInventory + goldStash,
			statPointsLeft: Math.max(0, toNumber(save?.attributes?.statpts?.value, 0)),
			mapSeed: toNumber(save?.character?.map_seed, 0),
		};
	});

	const mercenarySummary = $derived.by(() => {
		const mercenary = save?.character?.mercenary;
		const mercenaryId = toNumber(mercenary?.id, 0);
		const hired = mercenaryId !== 0;
		const variantId = toNumber(mercenary?.variant_id, -1);
		const variantInfo = MERC_VARIANTS_BY_ID.get(variantId) ?? null;

		return {
			hired,
			statusLabel: hired ? "Hired" : "Not hired",
			conditionLabel: mercenary?.dead === true ? "Dead" : "Alive",
			name:
				typeof mercenary?.name === "string" && mercenary.name.length > 0
					? mercenary.name
					: "-",
			type: variantInfo?.type ?? "-",
			variant: variantInfo?.variant ?? "-",
			difficulty: variantInfo?.difficulty ?? "-",
			level:
				hired && variantInfo != null
					? levelFromXp(mercenary?.experience, variantInfo.rate)
					: "-",
		};
	});

	const overviewProgress = $derived.by(() => {
		const questPercent = ratioPercent(questSummary.completed, questSummary.total);
		const waypointPercent = ratioPercent(waypointSummary.acquired, waypointSummary.total);
		return {
			level: ratioPercent(save?.character?.level, 99),
			skillPoints: ratioPercent(skillSummary.learnedSkills, 30),
			quests: questPercent,
			gold: ratioPercent(resourcesSummary.totalGold, 3500000),
			panelProgress: clampPercent((questPercent + waypointPercent) / 2),
		};
	});

	const KV_LABEL_CLASS = "text-[0.87rem] font-semibold leading-[1.25] text-halbu-textMuted";
	const KV_VALUE_CLASS =
		"min-w-0 truncate text-[0.87rem] leading-[1.25] text-halbu-text";
</script>

<section class="overview-page flex flex-col gap-[0.36rem]">
	<div class="overview-strip grid grid-cols-4 gap-[0.28rem] max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
		<div class="overview-strip__item flex min-w-0 flex-col gap-[0.12rem] rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2 py-1.5">
			<span class="overview-strip__label text-[0.82rem] text-halbu-textMuted">Level</span>
			<span class="overview-strip__value truncate text-[2.02rem] font-semibold leading-none text-halbu-text">
				{formatInteger(save?.character?.level)}
			</span>
			<div class="overview-strip__meter mt-0.5 h-[0.22rem] overflow-hidden rounded-sm bg-halbu-border">
				<span
					class="overview-strip__meter-fill block h-full bg-halbu-primary"
					style={`width: ${overviewProgress.level}%`}
				></span>
			</div>
		</div>

		<div class="overview-strip__item flex min-w-0 flex-col gap-[0.12rem] rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2 py-1.5">
			<span class="overview-strip__label text-[0.82rem] text-halbu-textMuted">Skill Points</span>
			<span class="overview-strip__value truncate text-[2.02rem] font-semibold leading-none text-halbu-text">
				{formatInteger(skillSummary.availablePoints)}
			</span>
			<div class="overview-strip__meter mt-0.5 h-[0.22rem] overflow-hidden rounded-sm bg-halbu-border">
				<span
					class="overview-strip__meter-fill block h-full bg-halbu-primary"
					style={`width: ${overviewProgress.skillPoints}%`}
				></span>
			</div>
		</div>

		<div class="overview-strip__item flex min-w-0 flex-col gap-[0.12rem] rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2 py-1.5">
			<span class="overview-strip__label text-[0.82rem] text-halbu-textMuted">Quest Progress</span>
			<span class="overview-strip__value truncate text-[2.02rem] font-semibold leading-none text-halbu-text">
				{questSummary.completed}/{questSummary.total}
			</span>
			<span class="overview-strip__subvalue text-[0.84rem] leading-none text-halbu-textMuted">
				({overviewProgress.quests}%)
			</span>
			<div class="overview-strip__meter mt-0.5 h-[0.22rem] overflow-hidden rounded-sm bg-halbu-border">
				<span
					class="overview-strip__meter-fill block h-full bg-halbu-primary"
					style={`width: ${overviewProgress.quests}%`}
				></span>
			</div>
		</div>

		<div class="overview-strip__item flex min-w-0 flex-col gap-[0.12rem] rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2 py-1.5">
			<span class="overview-strip__label text-[0.82rem] text-halbu-textMuted">Total Gold</span>
			<span class="overview-strip__value truncate text-[2.02rem] font-semibold leading-none text-halbu-text">
				{formatInteger(resourcesSummary.totalGold)}
			</span>
			<div class="overview-strip__meter mt-0.5 h-[0.22rem] overflow-hidden rounded-sm bg-halbu-border">
				<span
					class="overview-strip__meter-fill block h-full bg-halbu-primary"
					style={`width: ${overviewProgress.gold}%`}
				></span>
			</div>
		</div>
	</div>

	<div class="overview-workbench grid grid-cols-3 gap-[0.32rem] max-[960px]:grid-cols-2 max-[760px]:grid-cols-1">
		<div class="overview-column grid min-w-0 content-start gap-[0.32rem]">
			<section class="overview-panel min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-[0.46rem] py-[0.36rem]">
				<h4 class="editor-card-title overview-card-title mb-[0.22rem] border-b border-halbu-border pb-[0.18rem]">
					Character
				</h4>
				<dl class="overview-kv m-0 grid grid-cols-[auto_1fr] items-baseline gap-y-[0.14rem] gap-x-[0.54rem]">
					<dt class={KV_LABEL_CLASS}>Name</dt>
					<dd class={KV_VALUE_CLASS}>{save?.character?.name ?? "Unnamed"}</dd>
					<dt class={KV_LABEL_CLASS}>Title</dt>
					<dd class={KV_VALUE_CLASS}>{characterTitle}</dd>
					<dt class={KV_LABEL_CLASS}>Class</dt>
					<dd class={KV_VALUE_CLASS}>{classLabel(save?.character?.class)}</dd>
					<dt class={KV_LABEL_CLASS}>Mode</dt>
					<dd class={KV_VALUE_CLASS}>{expansionLabel} / {coreLabel}</dd>
					<dt class={KV_LABEL_CLASS}>Location</dt>
					<dd class={KV_VALUE_CLASS}>{locationLabel}</dd>
				</dl>
			</section>

			<section class="overview-panel min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-[0.46rem] py-[0.36rem]">
				<h4 class="editor-card-title overview-card-title mb-[0.22rem] border-b border-halbu-border pb-[0.18rem]">
					Session
				</h4>
				<dl class="overview-kv m-0 grid grid-cols-[auto_1fr] items-baseline gap-y-[0.14rem] gap-x-[0.54rem]">
					<dt class={KV_LABEL_CLASS}>Edition</dt>
					<dd class={KV_VALUE_CLASS}>{getSaveEditionLabel(save)}</dd>
					<dt class={KV_LABEL_CLASS}>Version</dt>
					<dd class={KV_VALUE_CLASS}>{save?.version ?? "?"}</dd>
					<dt class={KV_LABEL_CLASS}>Warnings</dt>
					<dd
						class={`${KV_VALUE_CLASS} ${warningCount > 0 ? "font-[650] text-halbu-warning" : ""}`}
					>
						{warningCount}
					</dd>
					<dt class={KV_LABEL_CLASS}>State</dt>
					<dd class={KV_VALUE_CLASS}>{warningCount > 0 ? "Needs attention" : "Healthy"}</dd>
				</dl>
			</section>
		</div>

		<div class="overview-column grid min-w-0 content-start gap-[0.32rem]">
			<section class="overview-panel min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-[0.46rem] py-[0.36rem]">
				<h4 class="editor-card-title overview-card-title mb-[0.22rem] border-b border-halbu-border pb-[0.18rem]">
					Progress
				</h4>
				<dl class="overview-kv m-0 grid grid-cols-[auto_1fr] items-baseline gap-y-[0.14rem] gap-x-[0.54rem]">
					<dt class={KV_LABEL_CLASS}>Quests</dt>
					<dd class={KV_VALUE_CLASS}>{questSummary.label}</dd>
					<dt class={KV_LABEL_CLASS}>Waypoints</dt>
					<dd class={KV_VALUE_CLASS}>{waypointSummary.label}</dd>
					<dt class={KV_LABEL_CLASS}>Completed Quests</dt>
					<dd class={KV_VALUE_CLASS}>{questSummary.completed}</dd>
				</dl>
				<div class="overview-panel__meter mt-[0.32rem] h-[0.2rem] overflow-hidden rounded-sm bg-halbu-border">
					<span
						class="overview-panel__meter-fill block h-full bg-halbu-primary"
						style={`width: ${overviewProgress.panelProgress}%`}
					></span>
				</div>
			</section>

			<section class="overview-panel min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-[0.46rem] py-[0.36rem]">
				<h4 class="editor-card-title overview-card-title mb-[0.22rem] border-b border-halbu-border pb-[0.18rem]">
					Skills
				</h4>
				<dl class="overview-kv m-0 grid grid-cols-[auto_1fr] items-baseline gap-y-[0.14rem] gap-x-[0.54rem]">
					<dt class={KV_LABEL_CLASS}>Available</dt>
					<dd class={KV_VALUE_CLASS}>{skillSummary.availablePoints}</dd>
					<dt class={KV_LABEL_CLASS}>Invested</dt>
					<dd class={KV_VALUE_CLASS}>{skillSummary.investedPoints}</dd>
					<dt class={KV_LABEL_CLASS}>Learned</dt>
					<dd class={KV_VALUE_CLASS}>{skillSummary.learnedSkills}</dd>
					<dt class={KV_LABEL_CLASS}>Total</dt>
					<dd class={KV_VALUE_CLASS}>{skillSummary.totalPoints}</dd>
				</dl>
			</section>
		</div>

		<div class="overview-column grid min-w-0 content-start gap-[0.32rem]">
			<section class="overview-panel min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-[0.46rem] py-[0.36rem]">
				<h4 class="editor-card-title overview-card-title mb-[0.22rem] border-b border-halbu-border pb-[0.18rem]">
					Mercenary
				</h4>
				<dl class="overview-kv m-0 grid grid-cols-[auto_1fr] items-baseline gap-y-[0.14rem] gap-x-[0.54rem]">
					<dt class={KV_LABEL_CLASS}>Status</dt>
					<dd class={KV_VALUE_CLASS}>{mercenarySummary.statusLabel}</dd>
					{#if mercenarySummary.hired}
						<dt class={KV_LABEL_CLASS}>Condition</dt>
						<dd class={KV_VALUE_CLASS}>{mercenarySummary.conditionLabel}</dd>
						<dt class={KV_LABEL_CLASS}>Type</dt>
						<dd class={KV_VALUE_CLASS}>{mercenarySummary.type}</dd>
						<dt class={KV_LABEL_CLASS}>Variant</dt>
						<dd class={KV_VALUE_CLASS}>{mercenarySummary.variant}</dd>
						<dt class={KV_LABEL_CLASS}>Level</dt>
						<dd class={KV_VALUE_CLASS}>{mercenarySummary.level}</dd>
					{/if}
				</dl>
			</section>

			<section class="overview-panel min-w-0 rounded-sm border border-halbu-border bg-halbu-panel px-[0.46rem] py-[0.36rem]">
				<h4 class="editor-card-title overview-card-title mb-[0.22rem] border-b border-halbu-border pb-[0.18rem]">
					Resources
				</h4>
				<dl class="overview-kv m-0 grid grid-cols-[auto_1fr] items-baseline gap-y-[0.14rem] gap-x-[0.54rem]">
					<dt class={KV_LABEL_CLASS}>Inventory Gold</dt>
					<dd class={KV_VALUE_CLASS}>{resourcesSummary.goldInventory}</dd>
					<dt class={KV_LABEL_CLASS}>Stash Gold</dt>
					<dd class={KV_VALUE_CLASS}>{resourcesSummary.goldStash}</dd>
					<dt class={KV_LABEL_CLASS}>Stat Points</dt>
					<dd class={KV_VALUE_CLASS}>{resourcesSummary.statPointsLeft}</dd>
					<dt class={KV_LABEL_CLASS}>Map Seed</dt>
					<dd class={KV_VALUE_CLASS}>{resourcesSummary.mapSeed}</dd>
				</dl>
			</section>
		</div>
	</div>
</section>
