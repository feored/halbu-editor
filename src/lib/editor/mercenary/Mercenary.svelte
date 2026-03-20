<script lang="ts">
	import namesJson from "$lib/editor/mercenary/names.json";
	import variantsJson from "$lib/editor/mercenary/variants.json";

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
	import { DIFFICULTY_LABELS } from "$lib/editor/editorMetadata";
	import { editorState } from "$lib/editor/editorState.svelte";

	import type { Difficulty } from "$lib/types/editor";

	type MercenaryType = "Rogue" | "Desert Mercenary" | "Iron Wolf" | "Barbarian";

	type MercenaryVariant = {
		id: number;
		type: MercenaryType;
		variant: string;
		difficulty: Difficulty;
		rate: number;
	};

	type MercenaryNames = Record<string, string[]>;

	const variants = variantsJson as MercenaryVariant[];
	const namesByType = namesJson as MercenaryNames;
	const types: MercenaryType[] = ["Rogue", "Desert Mercenary", "Iron Wolf", "Barbarian"];

	const U32_MAX = 4294967295;
	const MIN_LEVEL = 1;
	const MAX_LEVEL = 98;

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const mercenary = $derived(save.character.mercenary);

	const hired = $derived(mercenary.id !== 0);
	const variant = $derived(
		variants.find((current) => current.id === mercenary.variantId) ?? variants[0],
	);
	const variantOptions = $derived(
		variants.filter((current) => {
			return current.type === variant.type && current.difficulty === variant.difficulty;
		}),
	);
	const nameOptions = $derived(namesByType[variant.type] ?? []);
	const maxLevel = $derived(clampInteger(save.character.level, MIN_LEVEL, MAX_LEVEL));
	const level = $derived(clampLevel(levelFromExperience(mercenary.experience, variant.rate)));

	let levelEdit = $state(initFieldEdit(""));
	let experienceEdit = $state(initFieldEdit(""));

	function experienceForLevel(level: number, rate: number): number {
		return rate * (level + 1) * level * level;
	}

	function levelFromExperience(experience: number, rate: number): number {
		const scaledExperience = experience / rate;
		const guess = Math.floor(Math.pow(scaledExperience, 1 / 3));

		if (scaledExperience < guess * guess * guess + guess * guess) {
			return guess - 1;
		}

		return guess;
	}

	function clampLevel(level: number): number {
		return clampInteger(level, MIN_LEVEL, maxLevel);
	}

	function randomId(): number {
		return Math.floor(Math.random() * U32_MAX);
	}

	function syncNameId(): void {
		if (nameOptions.length < 1) {
			mercenary.nameId = 0;
			return;
		}

		mercenary.nameId = clampInteger(mercenary.nameId, 0, nameOptions.length - 1);
	}

	function setHired(hired: boolean): void {
		mercenary.id = hired ? randomId() : 0;

		if (!hired) {
			mercenary.isDead = false;
			return;
		}

		if (levelFromExperience(mercenary.experience, variant.rate) < MIN_LEVEL) {
			mercenary.experience = experienceForLevel(MIN_LEVEL, variant.rate);
		}
	}

	function setVariant(variantId: number): void {
		const nextVariant = variants.find((current) => current.id === variantId) ?? variants[0];
		const currentLevel = clampLevel(levelFromExperience(mercenary.experience, variant.rate));

		mercenary.variantId = nextVariant.id;
		mercenary.experience = experienceForLevel(currentLevel, nextVariant.rate);
		syncNameId();
	}

	function setType(type: MercenaryType): void {
		const nextVariant =
			variants.find((current) => {
				return (
					current.type === type &&
					current.difficulty === variant.difficulty &&
					current.variant === variant.variant
				);
			}) ??
			variants.find((current) => {
				return current.type === type && current.difficulty === variant.difficulty;
			}) ??
			variants.find((current) => current.type === type) ??
			variants[0];

		setVariant(nextVariant.id);
	}

	function setDifficulty(difficulty: Difficulty): void {
		const nextVariant =
			variants.find((current) => {
				return (
					current.type === variant.type &&
					current.difficulty === difficulty &&
					current.variant === variant.variant
				);
			}) ??
			variants.find((current) => {
				return current.type === variant.type && current.difficulty === difficulty;
			}) ??
			variants[0];

		setVariant(nextVariant.id);
	}

	function setVariantName(name: string): void {
		const nextVariant = variantOptions.find((current) => current.variant === name) ?? variant;
		setVariant(nextVariant.id);
	}

	function setRandomName(): void {
		if (nameOptions.length < 1) {
			return;
		}

		mercenary.nameId = Math.floor(Math.random() * nameOptions.length);
	}

	function setLevel(level: number): void {
		mercenary.experience = experienceForLevel(clampLevel(level), variant.rate);
	}

	function setExperience(experience: number): void {
		mercenary.experience = clampInteger(experience, 0, U32_MAX);
	}

	function finishLevelEdit(): void {
		const value = Number(levelEdit.input);
		if (!Number.isFinite(value)) {
			setFieldError(levelEdit, "Enter a number.");
			cancelFieldEdit(levelEdit, String(level));
			return;
		}

		setLevel(value);
		finishFieldEdit(levelEdit);
		syncFieldFromValue(levelEdit, String(level));
	}

	function finishExperienceEdit(): void {
		const value = Number(experienceEdit.input);
		if (!Number.isFinite(value)) {
			setFieldError(experienceEdit, "Enter a number.");
			cancelFieldEdit(experienceEdit, String(mercenary.experience));
			return;
		}

		setExperience(value);
		finishFieldEdit(experienceEdit);
		syncFieldFromValue(experienceEdit, String(mercenary.experience));
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
			cancelFieldEdit(levelEdit, String(level));
			(event.currentTarget as HTMLInputElement).blur();
		}
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
		syncNameId();
	});

	$effect(() => {
		syncFieldFromValue(levelEdit, String(level));
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
					checked={hired}
					onchange={(event) => setHired((event.currentTarget as HTMLInputElement).checked)}
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
						mercenary.isDead = !(event.currentTarget as HTMLInputElement).checked;
					}}
					disabled={!hired}
				/>
				<span>Alive</span>
			</label>
		</div>

		{#if !hired}
			<div class="form-text mt-1">Mercenary data is inactive until the mercenary is hired.</div>
		{/if}
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!hired ? "opacity-60" : ""
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
					disabled={!hired}
				>
					{#each nameOptions as name, index}
						<option value={index}>{name}</option>
					{/each}
				</select>

				<button
					type="button"
					class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1 text-xs font-medium text-halbu-text hover:bg-halbu-panel"
					onclick={setRandomName}
					disabled={!hired || nameOptions.length < 1}
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
				disabled={!hired}
			/>
		</div>
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!hired ? "opacity-60" : ""
		}`}
	>
		<h3 class="editor-card-title mb-1.5">Type</h3>

		<div class="grid grid-cols-form-32 items-center gap-x-2 gap-y-1.5">
			<label class="form-label mb-0" for="mercenary-type">Class</label>
			<select
				class="form-select"
				value={variant.type}
				name="mercenary-type"
				id="mercenary-type"
				onchange={(event) => {
					setType((event.currentTarget as HTMLSelectElement).value as MercenaryType);
				}}
				disabled={!hired}
			>
				{#each types as type}
					<option value={type}>{type}</option>
				{/each}
			</select>

			<label class="form-label mb-0" for="mercenary-variant">Variant</label>
			<select
				class="form-select"
				value={variant.variant}
				name="mercenary-variant"
				id="mercenary-variant"
				onchange={(event) => {
					setVariantName((event.currentTarget as HTMLSelectElement).value);
				}}
				disabled={!hired}
			>
				{#each variantOptions as current}
					<option value={current.variant}>{current.variant}</option>
				{/each}
			</select>

			<label class="form-label mb-0" for="mercenary-difficulty">Difficulty hired</label>
			<select
				class="form-select"
				value={variant.difficulty}
				name="mercenary-difficulty"
				id="mercenary-difficulty"
				onchange={(event) => {
					setDifficulty((event.currentTarget as HTMLSelectElement).value as Difficulty);
				}}
				disabled={!hired}
			>
				<option value="Normal">{DIFFICULTY_LABELS.Normal}</option>
				<option value="Nightmare">{DIFFICULTY_LABELS.Nightmare}</option>
				<option value="Hell">{DIFFICULTY_LABELS.Hell}</option>
			</select>
		</div>
	</section>

	<section
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!hired ? "opacity-60" : ""
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
				max={maxLevel}
				step="1"
				value={levelEdit.input}
				onfocus={() => startFieldEdit(levelEdit, String(level))}
				oninput={(event) => {
					setFieldInput(levelEdit, (event.currentTarget as HTMLInputElement).value);
				}}
				onblur={finishLevelEdit}
				onkeydown={handleLevelKeydown}
				disabled={!hired}
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
				oninput={(event) => {
					setFieldInput(experienceEdit, (event.currentTarget as HTMLInputElement).value);
				}}
				onblur={finishExperienceEdit}
				onkeydown={handleExperienceKeydown}
				disabled={!hired}
			/>
		</div>
	</section>
</div>
