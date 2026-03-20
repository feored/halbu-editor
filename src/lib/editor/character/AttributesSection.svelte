<script lang="ts">
	import { enforceMinMax } from "$lib/utils/actions";
	import { clampInteger, getMaxValueForBitLength } from "$lib/utils/numbers";
	import { getAttributeLabel } from "$lib/editor/editorMetadata";
	import { editorState } from "$lib/editor/editorState.svelte";
	import {
		getClassBaseAttributes,
		applyGameRules,
	} from "$lib/editor/character/gameRules";

	type PrimaryAttributeId = "strength" | "dexterity" | "vitality" | "energy";

	const QUICK_ADJUST_STEP = 5;

	const primaryAttributes: ReadonlyArray<PrimaryAttributeId> = [
		"strength",
		"dexterity",
		"vitality",
		"energy",
	];

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mode = $derived(session.mode);

	const isGameRulesMode = $derived(mode === "game-rules");
	let showHelp = $state(false);

	const baseAttributes = $derived.by(() => getClassBaseAttributes(save.character.className));

	function canDecreasePrimaryAttribute(attributeId: PrimaryAttributeId): boolean {
		const minimum = isGameRulesMode ? baseAttributes?.[attributeId] ?? 0 : 0;

		return save.attributes[attributeId].value > minimum;
	}

	function canIncreasePrimaryAttribute(attributeId: PrimaryAttributeId): boolean {
		const attribute = save.attributes[attributeId];
		const maxValue = getMaxValueForBitLength(attribute.bitLength);

		if (attribute.value >= maxValue) {
			return false;
		}

		if (isGameRulesMode && save.attributes.statpts.value < 1) {
			return false;
		}

		return true;
	}

	function adjustPrimaryAttribute(attributeId: PrimaryAttributeId, delta: number): void {
		const attribute = save.attributes[attributeId];
		const maxValue = getMaxValueForBitLength(attribute.bitLength);
		const nextValue = attribute.value + delta;

		if (isGameRulesMode) {
			const minimum = baseAttributes?.[attributeId] ?? 0;
			const clampedTargetValue = clampInteger(nextValue, minimum, maxValue);

			if (clampedTargetValue <= attribute.value) {
				attribute.value = clampedTargetValue;
			} else {
				const allowedIncrease = Math.max(0, save.attributes.statpts.value);
				attribute.value = Math.min(clampedTargetValue, attribute.value + allowedIncrease);
			}

			applyGameRules(save, session.gameRulesBaselineSave ?? null);
			return;
		}

		attribute.value = clampInteger(nextValue, 0, maxValue);
	}

	function setPrimaryAttributeFromInput(
		attributeId: PrimaryAttributeId,
		inputValue: string,
	): void {
		const parsedValue = Number(inputValue);
		if (!Number.isFinite(parsedValue)) {
			return;
		}

		const attribute = save.attributes[attributeId];
		const maxValue = getMaxValueForBitLength(attribute.bitLength);

		if (isGameRulesMode) {
			const minimum = baseAttributes?.[attributeId] ?? 0;
			const clampedTargetValue = clampInteger(parsedValue, minimum, maxValue);

			if (clampedTargetValue <= attribute.value) {
				attribute.value = clampedTargetValue;
			} else {
				const allowedIncrease = Math.max(0, save.attributes.statpts.value);
				attribute.value = Math.min(clampedTargetValue, attribute.value + allowedIncrease);
			}

			applyGameRules(save, session.gameRulesBaselineSave ?? null);
			return;
		}

		attribute.value = clampInteger(parsedValue, 0, maxValue);
	}

	$effect(() => {
		if (!isGameRulesMode) {
			showHelp = false;
		}
	});
</script>

<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
	<div class="mb-1.5 flex items-center justify-between gap-2">
		<h3 class="editor-card-title mb-0">Attributes</h3>
		{#if isGameRulesMode}
			<button
				type="button"
				class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-halbu-border bg-halbu-panel2 text-2xs font-semibold leading-none text-halbu-textMuted transition hover:bg-halbu-primarySoft hover:text-halbu-text"
				aria-label={showHelp
					? "Hide game rules explanation"
					: "Show game rules explanation"}
				aria-expanded={showHelp}
				onclick={() => {
					showHelp = !showHelp;
				}}
			>
				?
			</button>
		{/if}
	</div>
	{#if isGameRulesMode && showHelp}
		<div class="form-text mb-1 mt-0.5">
			Game rules mode: increasing attributes spends available stat points and decreasing
			attributes refunds points. Class base attributes are the minimum.
		</div>
	{/if}

	<div class="grid gap-y-1">
		{#each primaryAttributes as field}
			<div class="grid grid-cols-form-28 items-center gap-x-2.5">
				<label class="form-label mb-0" for={field}>{getAttributeLabel(field)}</label>

				<div class="flex items-center gap-1">
					<button
						type="button"
						class="editor-step-button h-8 min-w-9 rounded-xs px-1 text-xs font-semibold"
						onclick={() => adjustPrimaryAttribute(field, -QUICK_ADJUST_STEP)}
						disabled={!canDecreasePrimaryAttribute(field)}
						aria-label={`Decrease ${getAttributeLabel(field).toLowerCase()} by ${QUICK_ADJUST_STEP}`}
					>
						-{QUICK_ADJUST_STEP}
					</button>

					<input
						class="form-control max-w-20 text-center"
						type="number"
						name={field}
						id={field}
						autocomplete="off"
						min={isGameRulesMode ? baseAttributes?.[field] ?? 0 : 0}
						max={getMaxValueForBitLength(save.attributes[field].bitLength)}
						step="1"
						use:enforceMinMax
						value={save.attributes[field].value}
						oninput={(event) =>
							setPrimaryAttributeFromInput(field, event.currentTarget.value)}
					/>

					<button
						type="button"
						class="editor-step-button h-8 min-w-9 rounded-xs px-1 text-xs font-semibold"
						onclick={() => adjustPrimaryAttribute(field, QUICK_ADJUST_STEP)}
						disabled={!canIncreasePrimaryAttribute(field)}
						aria-label={`Increase ${getAttributeLabel(field).toLowerCase()} by ${QUICK_ADJUST_STEP}`}
					>
						+{QUICK_ADJUST_STEP}
					</button>
				</div>
			</div>
		{/each}
	</div>
</section>
