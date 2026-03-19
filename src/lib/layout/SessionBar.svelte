<script lang="ts">
import { message } from "@tauri-apps/plugin-dialog";
import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
import Tabs from "$lib/components/ui/Tabs.svelte";
import { getSaveEditionLabel, isUnknownSaveFormat } from "$lib/utils/gameData";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import {
		applyProjectedGameRulesValues,
		projectGameRulesDerivedValues,
	} from "$lib/editor/character/gameRules";
	import { editorState } from "$lib/editor/editorState.svelte";

	import type { EditorMode } from "$lib/types/editor";

	let gameRulesConfirmOpen = $state(false);
	let gameRulesConfirmDetailItems = $state<string[]>([]);
	let gameRulesConfirmResolve = $state<((confirmed: boolean) => void) | null>(null);

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

	function openGameRulesConfirm(detailItems: string[]): Promise<boolean> {
		gameRulesConfirmDetailItems = detailItems;
		gameRulesConfirmOpen = true;

		return new Promise((resolve) => {
			gameRulesConfirmResolve = resolve;
		});
	}

	function closeGameRulesConfirm(confirmed: boolean): void {
		gameRulesConfirmOpen = false;

		if (gameRulesConfirmResolve != null) {
			gameRulesConfirmResolve(confirmed);
			gameRulesConfirmResolve = null;
		}
	}

	async function handleEditorModeChange(nextMode: EditorMode): Promise<void> {
		if (nextMode === mode) {
			return;
		}

		if (nextMode === "raw") {
			editorState.setMode("raw");
			return;
		}

		let projection: ReturnType<typeof projectGameRulesDerivedValues>;
		try {
			projection = projectGameRulesDerivedValues(save);
		} catch (error) {
			await message(getErrorMessage(error, "Unable to recalculate game rules values."), {
				title: "Mode switch blocked",
				kind: "warning",
			});
			return;
		}

		const detailItems = projection.changes.map(
			(change) => `${change.label}: ${change.fromDisplay} -> ${change.toDisplay}`,
		);

		if (detailItems.length > 0) {
			const confirmed = await openGameRulesConfirm(detailItems);
			if (!confirmed) {
				return;
			}
		}

		applyProjectedGameRulesValues(save, projection.values);
		editorState.setMode("game-rules");
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

<ConfirmDialog
	open={gameRulesConfirmOpen}
	title="Switch to Game rules mode?"
	message="Game rules mode recalculates life, mana, stamina, and remaining stat/skill points."
	detailItems={gameRulesConfirmDetailItems}
	confirmLabel="Switch mode"
	cancelLabel="Cancel"
	onConfirm={() => closeGameRulesConfirm(true)}
	onCancel={() => closeGameRulesConfirm(false)}
/>
