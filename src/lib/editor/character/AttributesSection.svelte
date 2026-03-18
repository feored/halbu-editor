<script lang="ts">
	import { enforceMinMax } from "$lib/utils/actions";
	import { getMaxValueForBitLength } from "$lib/utils/numbers";
	import { getAttributeLabel } from "$lib/editor/editorMetadata";
	import { editorState } from "$lib/editor/editorState.svelte";
	import {
		setClampedAttributeValue,
		setPrimaryAttributeValueInGameRulesMode,
	} from "$lib/editor/character/characterActions";
	import { getGameRulesClassPrimaryAttributes } from "$lib/editor/character/gameRules";

	type PrimaryAttributeId = "strength" | "dexterity" | "vitality" | "energy";

	const QUICK_ADJUST_STEP = 10;

	const primaryAttributes: ReadonlyArray<PrimaryAttributeId> = [
		"strength",
		"dexterity",
		"vitality",
		"energy",
	];

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mode = $derived(session.mode);
	const effectiveDerivedValues = $derived(editorState.gameRulesValues.values);

	const isGameRulesMode = $derived(mode === "game-rules");

	const gameRulesClassPrimaryAttributes = $derived.by(() =>
		getGameRulesClassPrimaryAttributes(save.character.className),
	);

	function getAvailableStatPoints(): number {
		if (!isGameRulesMode) {
			return save.attributes.statpts.value;
		}

		if (effectiveDerivedValues == null || !("statpts" in effectiveDerivedValues)) {
			return 0;
		}

		return Math.max(0, effectiveDerivedValues.statpts);
	}

	function getPrimaryAttributeMinimum(attributeId: PrimaryAttributeId): number {
		if (!isGameRulesMode || gameRulesClassPrimaryAttributes == null) {
			return 0;
		}

		return gameRulesClassPrimaryAttributes[attributeId] ?? 0;
	}

	function canDecreasePrimaryAttribute(attributeId: PrimaryAttributeId): boolean {
		return save.attributes[attributeId].value > getPrimaryAttributeMinimum(attributeId);
	}

	function canIncreasePrimaryAttribute(attributeId: PrimaryAttributeId): boolean {
		const attribute = save.attributes[attributeId];
		const maxValue = getMaxValueForBitLength(attribute.bitLength);

		if (attribute.value >= maxValue) {
			return false;
		}

		if (isGameRulesMode && getAvailableStatPoints() < 1) {
			return false;
		}

		return true;
	}

	function adjustPrimaryAttribute(attributeId: PrimaryAttributeId, delta: number): void {
		const nextValue = save.attributes[attributeId].value + delta;

		if (isGameRulesMode) {
			setPrimaryAttributeValueInGameRulesMode(
				save,
				attributeId,
				nextValue,
				getAvailableStatPoints(),
				getPrimaryAttributeMinimum(attributeId),
			);
			return;
		}

		setClampedAttributeValue(save, attributeId, nextValue);
	}

	function setPrimaryAttributeFromInput(
		attributeId: PrimaryAttributeId,
		inputValue: string,
	): void {
		const parsedValue = Number(inputValue);
		if (!Number.isFinite(parsedValue)) {
			return;
		}

		if (isGameRulesMode) {
			setPrimaryAttributeValueInGameRulesMode(
				save,
				attributeId,
				parsedValue,
				getAvailableStatPoints(),
				getPrimaryAttributeMinimum(attributeId),
			);
			return;
		}

		setClampedAttributeValue(save, attributeId, parsedValue);
	}
</script>

<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
	<h3 class="editor-card-title mb-1.5">Attributes</h3>

	{#if isGameRulesMode}
		<div class="form-text mb-1">
			Game rules mode: increasing attributes spends recalculated stat points; decreasing
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
						class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
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
						min={getPrimaryAttributeMinimum(field)}
						max={getMaxValueForBitLength(save.attributes[field].bitLength)}
						step="1"
						use:enforceMinMax
						value={save.attributes[field].value}
						onchange={(event) =>
							setPrimaryAttributeFromInput(field, event.currentTarget.value)}
					/>

					<button
						type="button"
						class="h-8 min-w-9 rounded-xs border border-halbu-borderStrong bg-halbu-panel2 px-1 text-xs font-semibold text-halbu-text transition hover:bg-halbu-primarySoft disabled:cursor-not-allowed disabled:opacity-45"
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
