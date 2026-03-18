<script lang="ts">
	import names from "$lib/editor/mercenary/names.json";
	import variants from "$lib/editor/mercenary/variants.json";

	import { enforceMinMax } from "$lib/utils/actions";
	import {
		cancelFieldEdit,
		finishFieldEdit,
		initFieldEdit,
		setFieldError,
		setFieldInput,
		startFieldEdit,
		syncFieldFromValue,
	} from "$lib/utils/fieldEdit";
	import { clampInteger } from "$lib/utils/numbers";
	import { editorState } from "$lib/editor/editorState.svelte";
	import { DIFFICULTY_LABELS } from "$lib/editor/editorMetadata";

	import type { Difficulty } from "$lib/types/editor";

	type MercenaryType = "Rogue" | "Desert Mercenary" | "Iron Wolf" | "Barbarian";

	type MercenaryVariant = {
		id: number;
		type: MercenaryType;
		variant: string;
		difficulty: Difficulty;
		rate: number;
	};

	type MercenaryNamesByType = Record<string, string[]>;

	const mercenaryVariants = variants as MercenaryVariant[];
	const mercenaryNames = names as MercenaryNamesByType;

	const U32_MAX = 4294967295;
	const MERCENARY_LEVEL_MIN = 1;
	const MERCENARY_LEVEL_MAX = 98;

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mercenary = $derived(save.character.mercenary);

	const isHired = $derived(mercenary.id !== 0);

	const currentVariant = $derived.by(() => {
		return (
			mercenaryVariants.find((variant) => variant.id === mercenary.variantId) ??
			mercenaryVariants[0]
		);
	});

	const possibleVariants = $derived.by(() => {
		return mercenaryVariants.filter((variant) => {
			return (
				variant.type === currentVariant.type &&
				variant.difficulty === currentVariant.difficulty
			);
		});
	});

	const variantNames = $derived.by(() => {
		return mercenaryNames[currentVariant.type] ?? [];
	});

	const mercenaryLevelCap = $derived.by(() => {
		return clampInteger(save.character.level, MERCENARY_LEVEL_MIN, MERCENARY_LEVEL_MAX);
	});

	const mercenaryLevel = $derived.by(() => {
		return clampMercenaryLevel(
			getLevelFromExperience(mercenary.experience, currentVariant.rate),
		);
	});

	let levelEdit = $state(initFieldEdit(""));
	let experienceEdit = $state(initFieldEdit(""));

	function getExperienceForLevel(level: number, rate: number): number {
		return rate * (level + 1) * level * level;
	}

	function getLevelFromExperience(experience: number, rate: number): number {
		const scaledExperience = experience / rate;
		const guess = Math.floor(Math.pow(scaledExperience, 1 / 3));

		if (scaledExperience < guess * guess * guess + guess * guess) {
			return guess - 1;
		}

		return guess;
	}

	function clampMercenaryLevel(level: number): number {
		return clampInteger(level, MERCENARY_LEVEL_MIN, mercenaryLevelCap);
	}

	function randomMercenaryId(): number {
		return Math.floor(Math.random() * U32_MAX);
	}

	function setHired(nextHired: boolean): void {
		mercenary.id = nextHired ? randomMercenaryId() : 0;

		if (!nextHired) {
			mercenary.isDead = false;
		}
	}

	function setVariantById(nextVariantId: number): void {
		const nextVariant =
			mercenaryVariants.find((variant) => variant.id === nextVariantId) ?? null;

		if (nextVariant == null) {
			return;
		}

		mercenary.variantId = nextVariant.id;
		setExperience(mercenary.experience);
		clampNameId();
	}

	function setVariantType(nextType: MercenaryType): void {
		const nextVariant =
			possibleVariants.find((variant) => variant.type === nextType) ??
			mercenaryVariants.find((variant) => {
				return (
					variant.type === nextType && variant.difficulty === currentVariant.difficulty
				);
			}) ??
			mercenaryVariants.find((variant) => variant.type === nextType) ??
			mercenaryVariants[0];

		setVariantById(nextVariant.id);
	}

	function setVariantDifficulty(nextDifficulty: Difficulty): void {
		const nextVariant =
			possibleVariants.find((variant) => variant.difficulty === nextDifficulty) ??
			mercenaryVariants.find((variant) => {
				return (
					variant.type === currentVariant.type &&
					variant.difficulty === nextDifficulty &&
					variant.variant === currentVariant.variant
				);
			}) ??
			mercenaryVariants.find((variant) => {
				return (
					variant.type === currentVariant.type && variant.difficulty === nextDifficulty
				);
			}) ??
			mercenaryVariants[0];

		setVariantById(nextVariant.id);
	}

	function setVariantName(nextVariantName: string): void {
		const nextVariant =
			possibleVariants.find((variant) => variant.variant === nextVariantName) ??
			possibleVariants[0];

		if (nextVariant == null) {
			return;
		}

		setVariantById(nextVariant.id);
	}

	function setRandomName(): void {
		if (variantNames.length < 1) {
			return;
		}

		mercenary.nameId = Math.floor(Math.random() * variantNames.length);
	}

	function clampNameId(): void {
		if (variantNames.length < 1) {
			mercenary.nameId = 0;
			return;
		}

		if (mercenary.nameId < 0) {
			mercenary.nameId = 0;
			return;
		}

		if (mercenary.nameId >= variantNames.length) {
			mercenary.nameId = variantNames.length - 1;
		}
	}

	function setLevel(nextLevel: number): void {
		const clampedLevel = clampMercenaryLevel(nextLevel);
		mercenary.experience = getExperienceForLevel(clampedLevel, currentVariant.rate);
	}

	function setExperience(nextExperience: number): void {
		const nextLevel = clampMercenaryLevel(
			getLevelFromExperience(nextExperience, currentVariant.rate),
		);
		mercenary.experience = getExperienceForLevel(nextLevel, currentVariant.rate);
	}

	function finishLevelEdit(): void {
		const parsedValue = Number(levelEdit.input);
		if (!Number.isFinite(parsedValue)) {
			setFieldError(levelEdit, "Enter a number.");
			cancelFieldEdit(levelEdit, String(mercenaryLevel));
			return;
		}

		setLevel(parsedValue);
		finishFieldEdit(levelEdit);
		syncFieldFromValue(levelEdit, String(mercenaryLevel));
	}

	function handleLevelKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			finishLevelEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(levelEdit, String(mercenaryLevel));
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	function finishExperienceEdit(): void {
		const parsedValue = Number(experienceEdit.input);
		if (!Number.isFinite(parsedValue)) {
			setFieldError(experienceEdit, "Enter a number.");
			cancelFieldEdit(experienceEdit, String(mercenary.experience));
			return;
		}

		setExperience(parsedValue);
		finishFieldEdit(experienceEdit);
		syncFieldFromValue(experienceEdit, String(mercenary.experience));
	}

	function handleExperienceKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			finishExperienceEdit();
			(event.currentTarget as HTMLInputElement).blur();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelFieldEdit(experienceEdit, String(mercenary.experience));
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	$effect(() => {
		clampNameId();
	});

	$effect(() => {
		syncFieldFromValue(levelEdit, String(mercenaryLevel));
	});

	$effect(() => {
		syncFieldFromValue(experienceEdit, String(mercenary.experience));
	});
</script>

<div class="grid max-w-3xl content-start gap-2.5">
	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Status</h3>

		<div class="grid gap-1 text-sm">
			<label class="inline-flex items-center gap-2">
				<input
					class="form-check-input mt-0"
					type="checkbox"
					id="hired"
					name="hired"
					checked={isHired}
					onchange={(event) => setHired(event.currentTarget.checked)}
				/>
				<span>Hired</span>
			</label>

			<label class="inline-flex items-center gap-2">
				<input
					class="form-check-input mt-0"
					type="checkbox"
					id="alive"
					name="alive"
					checked={!mercenary.isDead}
					onchange={(event) => {
						mercenary.isDead = !event.currentTarget.checked;
					}}
					disabled={!isHired}
				/>
				<span>Alive</span>
			</label>
		</div>

		{#if !isHired}
			<div class="form-text mt-1">
				Mercenary data is inactive until the mercenary is hired.
			</div>
		{/if}
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-1.5">Identity</h3>

		<div class="grid grid-cols-form-32 items-center gap-x-2 gap-y-1.5">
			<label class="form-label mb-0" for="mercenary-name">Name</label>
			<div class="flex items-center gap-1.5">
				<select
					class="form-select"
					bind:value={mercenary.nameId}
					name="mercenary-name"
					id="mercenary-name"
					disabled={!isHired}
				>
					{#each variantNames as name, index}
						<option value={index}>{name}</option>
					{/each}
				</select>

				<button
					type="button"
					class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1 text-xs font-medium text-halbu-text hover:bg-halbu-panel"
					onclick={setRandomName}
					disabled={!isHired || variantNames.length < 1}
				>
					Random
				</button>
			</div>

			<label class="form-label mb-0" for="mercenary-id">ID</label>
			<input
				class="form-control"
				type="number"
				name="mercenary-id"
				id="mercenary-id"
				min="0"
				max={U32_MAX}
				step="1"
				use:enforceMinMax
				bind:value={mercenary.id}
				disabled={!isHired}
			/>
		</div>
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-1.5">Type</h3>

		<div class="grid grid-cols-form-32 items-center gap-x-2 gap-y-1.5">
			<label class="form-label mb-0" for="mercenary-type">Class</label>
			<select
				class="form-select"
				value={currentVariant.type}
				name="mercenary-type"
				id="mercenary-type"
				onchange={(event) => setVariantType(event.currentTarget.value as MercenaryType)}
				disabled={!isHired}
			>
				<option value="Rogue">Rogue</option>
				<option value="Desert Mercenary">Desert Mercenary</option>
				<option value="Iron Wolf">Iron Wolf</option>
				<option value="Barbarian">Barbarian</option>
			</select>

			<label class="form-label mb-0" for="mercenary-variant">Variant</label>
			<select
				class="form-select"
				value={currentVariant.variant}
				name="mercenary-variant"
				id="mercenary-variant"
				onchange={(event) => setVariantName(event.currentTarget.value)}
				disabled={!isHired}
			>
				{#each possibleVariants as variant}
					<option value={variant.variant}>{variant.variant}</option>
				{/each}
			</select>

			<label class="form-label mb-0" for="mercenary-difficulty">Difficulty hired</label>
			<select
				class="form-select"
				value={currentVariant.difficulty}
				name="mercenary-difficulty"
				id="mercenary-difficulty"
				onchange={(event) => setVariantDifficulty(event.currentTarget.value as Difficulty)}
				disabled={!isHired}
			>
				<option value="Normal">{DIFFICULTY_LABELS.Normal}</option>
				<option value="Nightmare">{DIFFICULTY_LABELS.Nightmare}</option>
				<option value="Hell">{DIFFICULTY_LABELS.Hell}</option>
			</select>
		</div>
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!isHired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-1.5">Progression</h3>

		<div class="grid grid-cols-form-32 items-center gap-x-2 gap-y-1.5">
			<label class="form-label mb-0" for="mercenary-level">Level</label>
			<input
				class="form-control"
				use:enforceMinMax
				type="number"
				name="mercenary-level"
				id="mercenary-level"
				min="1"
				max={mercenaryLevelCap}
				step="1"
				value={levelEdit.input}
				onfocus={() => startFieldEdit(levelEdit, String(mercenaryLevel))}
				oninput={(event) => setFieldInput(levelEdit, event.currentTarget.value)}
				onblur={finishLevelEdit}
				onkeydown={handleLevelKeydown}
				disabled={!isHired}
			/>

			<label class="form-label mb-0" for="mercenary-experience">Experience</label>
			<input
				class="form-control"
				use:enforceMinMax
				type="number"
				name="mercenary-experience"
				id="mercenary-experience"
				min="0"
				max={U32_MAX}
				step="1"
				value={experienceEdit.input}
				onfocus={() => startFieldEdit(experienceEdit, String(mercenary.experience))}
				oninput={(event) => setFieldInput(experienceEdit, event.currentTarget.value)}
				onblur={finishExperienceEdit}
				onkeydown={handleExperienceKeydown}
				disabled={!isHired}
			/>
		</div>
	</section>
</div>
