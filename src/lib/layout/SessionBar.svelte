<script>
	import {
		getSaveEditionLabel,
		getSaveExpansionType,
		isUnknownSaveFormat,
	} from "../utils/GameSupport";

	let {
		save,
		editorDocumentMode = "raw",
		onEditorDocumentModeChange,
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
	const currentModeExplanation = $derived(
		editorDocumentMode === "raw"
			? "Raw mode: edit values directly."
			: "Game rules mode: recalculated values follow class rules, level, attributes, skills, and completed quests.",
	);
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

	<div class="session-bar__mode-control flex items-center gap-2">
		<p class="m-0 text-xs leading-tight text-halbu-textMuted">{currentModeExplanation}</p>
			<div
				class="inline-flex items-center rounded-xs border border-halbu-border bg-halbu-panel p-0.5"
				role="group"
				aria-label="Document mode"
			>
			<button
				type="button"
				class={`rounded-xs px-2 py-1 text-sm font-medium leading-none transition ${
					editorDocumentMode === "raw"
						? "border border-halbu-primary bg-halbu-primarySoft text-halbu-primary"
						: "border border-transparent text-halbu-text hover:border-halbu-border hover:bg-halbu-panel2"
				}`}
					title="Raw mode: edit values directly."
				aria-pressed={editorDocumentMode === "raw"}
				onclick={() =>
					editorDocumentMode !== "raw" && onEditorDocumentModeChange?.("raw")}
			>
				Raw
			</button>
			<button
				type="button"
				class={`rounded-xs px-2 py-1 text-sm font-medium leading-none transition ${
					editorDocumentMode === "game-rules"
						? "border border-halbu-primary bg-halbu-primarySoft text-halbu-primary"
						: "border border-transparent text-halbu-text hover:border-halbu-border hover:bg-halbu-panel2"
				}`}
					title="Game rules mode: recalculated values follow class rules, level, attributes, skills, and completed quests."
				aria-pressed={editorDocumentMode === "game-rules"}
				onclick={() =>
					editorDocumentMode !== "game-rules" &&
					onEditorDocumentModeChange?.("game-rules")}
			>
				Game rules
			</button>
		</div>
	</div>

</div>
