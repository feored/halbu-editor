<script>
	import {
		getSaveEditionLabel,
		getSaveExpansionType,
		isUnknownSaveFormat,
	} from "../utils/GameSupport";

	let {
		save,
	} = $props();

	const fileName = $derived(save.character.name);
	const levelLabel = $derived(`Level ${save.attributes.level.value}`);
	const versionLabel = $derived.by(() => {
		if (isUnknownSaveFormat(save)) {
			return `Unknown (v${save.version})`;
		}
		return `${getSaveEditionLabel(save)} (v${save.version})`;
	});
	const expansionLabel = $derived(getSaveExpansionType(save));
	const coreLabel = $derived(save.character.status.hardcore ? "Hardcore" : "Softcore");
</script>

<div class="session-bar flex w-full min-w-0 items-center gap-3">
	<div class="session-bar__name-wrap shrink-0">
		<h2 class="session-bar__name m-0 text-xl font-[680] leading-[1.12]">{fileName}</h2>
	</div>

	<p class="session-bar__meta-line m-0 min-w-0 flex-1 truncate text-base text-halbu-textMuted">
		<span>{save.character.class}</span>
		<span aria-hidden="true">·</span>
		<span>{levelLabel}</span>
		<span aria-hidden="true">·</span>
		<span>{versionLabel}</span>
		<span aria-hidden="true">·</span>
		<span>{expansionLabel} / {coreLabel}</span>
	</p>

</div>
