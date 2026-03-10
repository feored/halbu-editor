<script>
	import { classLabel, getSaveEditionLabel } from "../utils/GameSupport";

	let {
		save,
	} = $props();

	const fileName = $derived(String(save?.character?.name ?? "Unnamed Save"));
	const levelValue = $derived(Number(save?.attributes?.level?.value ?? save?.character?.level ?? 0));
	const levelLabel = $derived(`Level ${Number.isFinite(levelValue) ? levelValue : "?"}`);
	const versionLabel = $derived(`${getSaveEditionLabel(save)} (${save?.version ?? "?"})`);
	const expansionLabel = $derived(save?.character?.status?.expansion ? "Expansion" : "Classic");
	const coreLabel = $derived(save?.character?.status?.hardcore ? "Hardcore" : "Softcore");
</script>

<div class="session-bar flex w-full min-w-0 items-center gap-[0.7rem]">
	<div class="session-bar__name-wrap shrink-0">
		<h2 class="session-bar__name m-0 text-[1.22rem] font-[680] leading-[1.12]">{fileName}</h2>
	</div>

		<p class="session-bar__meta-line m-0 min-w-0 flex-1 truncate text-[0.96rem] text-halbu-textMuted">
			<span>{classLabel(save?.character?.class)}</span>
			<span aria-hidden="true">·</span>
			<span>{levelLabel}</span>
			<span aria-hidden="true">·</span>
			<span>{versionLabel}</span>
			<span aria-hidden="true">·</span>
			<span>{expansionLabel} / {coreLabel}</span>
		</p>

</div>
