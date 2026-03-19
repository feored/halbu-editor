<script lang="ts">
	import Tabs from "$lib/components/ui/Tabs.svelte";
	import { getSaveEditionLabel, isUnknownSaveFormat } from "$lib/utils/gameData";
	import { editorState } from "$lib/editor/editorState.svelte";

	import type { EditorMode } from "$lib/types/editor";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);

	const mode = $derived(session.mode);
	const fileName = $derived(save.character.name);
	const levelLabel = $derived(`Level ${save.attributes.level.value}`);
	const versionLabel = $derived.by(() => {
		if (isUnknownSaveFormat(save)) {
			return `Unknown (v${save.version})`;
		}
		return `${getSaveEditionLabel(save)} (v${save.version})`;
	});
	const expansionLabel = $derived(save.expansionType);
	const coreLabel = $derived(save.character.status.hardcore ? "Hardcore" : "Softcore");
	const rawModeTooltipText = "Edit values directly.";
	const gameRulesModeTooltipText =
		"Values like life, mana or available skill points are calculated from class, level, attributes, skills, and completed quests and not directly editable.";
	const modeTabs = [
		{ value: "raw" as const, label: "Raw", title: rawModeTooltipText },
		{ value: "game-rules" as const, label: "Game rules", title: gameRulesModeTooltipText },
	];

	function handleEditorModeChange(nextMode: EditorMode): void {
		if (nextMode === mode) {
			return;
		}

		editorState.setMode(nextMode);
	}
</script>

<div class="session-bar flex w-full min-w-0 items-center gap-3">
	<div class="session-bar__name-wrap shrink-0">
		<h2 class="session-bar__name m-0 text-xl font-[680] leading-[1.12]">{fileName}</h2>
	</div>

	<p class="session-bar__meta-line m-0 min-w-0 flex-1 truncate text-base text-halbu-textMuted">
		<span>{save.character.className}</span>
		<span aria-hidden="true">·</span>
		<span>{levelLabel}</span>
		<span aria-hidden="true">·</span>
		<span>{versionLabel}</span>
		<span aria-hidden="true">·</span>
		<span>{expansionLabel} / {coreLabel}</span>
	</p>

	<div class="session-bar__mode-control flex items-center gap-2">
		<Tabs tabs={modeTabs} active={mode} onSelect={handleEditorModeChange} />
	</div>
</div>
