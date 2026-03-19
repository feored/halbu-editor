<script lang="ts">
	import { clampInteger, getMaxValueForBitLength, RESOURCE_Q8_SCALE } from "$lib/utils/numbers";
	import { editorState } from "$lib/editor/editorState.svelte";
	import {
		cancelFieldEdit,
		finishFieldEdit,
		initFieldEdit,
		setFieldError,
		setFieldInput,
		startFieldEdit,
		syncFieldFromValue,
		type FieldEditState,
	} from "$lib/utils/fieldEdit";
	import { resolveResourceDisplayValue } from "$lib/editor/character/characterLogic";

	type ResourceAttributeId =
		| "hitpoints"
		| "maxhp"
		| "mana"
		| "maxmana"
		| "stamina"
		| "maxstamina";

	type ResourceFieldDescriptor = {
		label: string;
		currentId: string;
		currentAttr: ResourceAttributeId;
		baseId: string;
		baseAttr: ResourceAttributeId;
	};

	const RESOURCE_DISPLAY_MIN = 1;
	const RESOURCE_DISPLAY_MAX = 8181;

	const resourceFields: ReadonlyArray<ResourceFieldDescriptor> = [
		{
			label: "Life",
			currentId: "lifeCurrent",
			currentAttr: "hitpoints",
			baseId: "lifeBase",
			baseAttr: "maxhp",
		},
		{
			label: "Mana",
			currentId: "manaCurrent",
			currentAttr: "mana",
			baseId: "manaBase",
			baseAttr: "maxmana",
		},
		{
			label: "Stamina",
			currentId: "staminaCurrent",
			currentAttr: "stamina",
			baseId: "staminaBase",
			baseAttr: "maxstamina",
		},
	];

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mode = $derived(session.mode);
	const effectiveDerivedValues = $derived(editorState.gameRulesValues.values);

	const isGameRulesMode = $derived(mode === "game-rules");
	let showGameRulesHelp = $state(false);

	let resourceEditByField = $state<Record<string, FieldEditState>>({});

	function resolvedResourceValue(attributeId: ResourceAttributeId): number {
		if (isGameRulesMode && effectiveDerivedValues != null) {
			return effectiveDerivedValues[attributeId];
		}
		return save.attributes[attributeId].value;
	}

	function getResourceDisplayValue(attributeId: ResourceAttributeId): number {
		const attribute = save.attributes[attributeId];
		return resolveResourceDisplayValue(
			resolvedResourceValue(attributeId),
			attribute.bitLength,
			RESOURCE_Q8_SCALE,
		);
	}

	function getResourceCanonicalDisplayString(attributeId: ResourceAttributeId): string {
		return String(
			clampInteger(
				getResourceDisplayValue(attributeId),
				RESOURCE_DISPLAY_MIN,
				RESOURCE_DISPLAY_MAX,
			),
		);
	}

	function getOrCreateResourceEdit(
		fieldId: string,
		attributeId: ResourceAttributeId,
	): FieldEditState {
		const existingEdit = resourceEditByField[fieldId];
		if (existingEdit != null) {
			return existingEdit;
		}

		const nextEdit = initFieldEdit(getResourceCanonicalDisplayString(attributeId));
		resourceEditByField = { ...resourceEditByField, [fieldId]: nextEdit };
		return nextEdit;
	}

	function dropResourceEdit(fieldId: string): void {
		if (!(fieldId in resourceEditByField)) {
			return;
		}

		const nextEdits = { ...resourceEditByField };
		delete nextEdits[fieldId];
		resourceEditByField = nextEdits;
	}

	function getResourceInputValue(fieldId: string, attributeId: ResourceAttributeId): string {
		const resourceEdit = resourceEditByField[fieldId];
		if (resourceEdit != null) {
			return resourceEdit.input;
		}

		return getResourceCanonicalDisplayString(attributeId);
	}

	function finishResourceEdit(fieldId: string, attributeId: ResourceAttributeId): void {
		if (isGameRulesMode) {
			return;
		}

		const resourceEdit = resourceEditByField[fieldId];
		if (resourceEdit == null) {
			return;
		}

		const parsedValue = Number.parseFloat(resourceEdit.input.trim());
		if (!Number.isFinite(parsedValue)) {
			setFieldError(resourceEdit, "Enter a number.");
			cancelFieldEdit(resourceEdit, getResourceCanonicalDisplayString(attributeId));
			dropResourceEdit(fieldId);
			return;
		}

		const clampedDisplayValue = clampInteger(
			parsedValue,
			RESOURCE_DISPLAY_MIN,
			RESOURCE_DISPLAY_MAX,
		);

		const attribute = save.attributes[attributeId];
		const storedValue = clampInteger(
			Math.round(clampedDisplayValue * RESOURCE_Q8_SCALE),
			0,
			getMaxValueForBitLength(attribute.bitLength),
		);

		save.attributes[attributeId].value = storedValue;
		finishFieldEdit(resourceEdit);
		syncFieldFromValue(
			resourceEdit,
			String(
				resolveResourceDisplayValue(
					storedValue,
					save.attributes[attributeId].bitLength,
					RESOURCE_Q8_SCALE,
				),
			),
		);

		dropResourceEdit(fieldId);
	}

	function cancelResourceEdit(fieldId: string, attributeId: ResourceAttributeId): void {
		const resourceEdit = resourceEditByField[fieldId];
		if (resourceEdit != null) {
			cancelFieldEdit(resourceEdit, getResourceCanonicalDisplayString(attributeId));
		}
		dropResourceEdit(fieldId);
	}

	$effect(() => {
		if (!isGameRulesMode) {
			return;
		}

		if (Object.keys(resourceEditByField).length > 0) {
			resourceEditByField = {};
		}
	});

	$effect(() => {
		for (const resource of resourceFields) {
			const currentEdit = resourceEditByField[resource.currentId];
			if (currentEdit != null) {
				syncFieldFromValue(
					currentEdit,
					getResourceCanonicalDisplayString(resource.currentAttr),
				);
			}

			const baseEdit = resourceEditByField[resource.baseId];
			if (baseEdit != null) {
				syncFieldFromValue(baseEdit, getResourceCanonicalDisplayString(resource.baseAttr));
			}
		}
	});

	$effect(() => {
		if (!isGameRulesMode) {
			showGameRulesHelp = false;
		}
	});
</script>

<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
	<div class="mb-1.5 flex items-center justify-between gap-2">
		<h3 class="editor-card-title mb-0">Resources</h3>
		{#if isGameRulesMode}
			<button
				type="button"
				class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-halbu-borderStrong bg-halbu-panel2 text-2xs font-semibold leading-none text-halbu-textMuted transition hover:bg-halbu-primarySoft hover:text-halbu-text"
				aria-label={showGameRulesHelp
					? "Hide game rules explanation"
					: "Show game rules explanation"}
				aria-expanded={showGameRulesHelp}
				onclick={() => {
					showGameRulesHelp = !showGameRulesHelp;
				}}
			>
				?
			</button>
		{/if}
	</div>
	{#if isGameRulesMode && showGameRulesHelp}
		<div class="form-text mb-1 mt-0.5">
			Game rules mode: resources are recalculated. Edit level or attributes to change them.
		</div>
	{/if}

	<div class="grid grid-cols-form-28-2 items-center gap-x-2.5 gap-y-1">
		<div></div>
		<div class="text-sm text-halbu-textMuted">Current</div>
		<div class="text-sm text-halbu-textMuted">Base</div>

		{#each resourceFields as resource}
			<div class="text-sm text-halbu-text">{resource.label}</div>

			{#each [{ id: resource.currentId, attributeId: resource.currentAttr }, { id: resource.baseId, attributeId: resource.baseAttr }] as field}
				<input
					class={`form-control${isGameRulesMode ? " form-control-readonly" : ""}`}
					type="number"
					name={field.id}
					id={field.id}
					min={RESOURCE_DISPLAY_MIN}
					max={RESOURCE_DISPLAY_MAX}
					step="1"
					value={getResourceInputValue(field.id, field.attributeId)}
					disabled={isGameRulesMode}
					onfocus={() => {
						const resourceEdit = getOrCreateResourceEdit(field.id, field.attributeId);
						startFieldEdit(
							resourceEdit,
							getResourceCanonicalDisplayString(field.attributeId),
						);
					}}
					oninput={(event) => {
						const resourceEdit = getOrCreateResourceEdit(field.id, field.attributeId);
						setFieldInput(resourceEdit, event.currentTarget.value);
					}}
					onblur={() => finishResourceEdit(field.id, field.attributeId)}
					onkeydown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							finishResourceEdit(field.id, field.attributeId);
							event.currentTarget.blur();
							return;
						}

						if (event.key === "Escape") {
							event.preventDefault();
							cancelResourceEdit(field.id, field.attributeId);
							event.currentTarget.blur();
						}
					}}
				/>
			{/each}
		{/each}
	</div>
</section>
