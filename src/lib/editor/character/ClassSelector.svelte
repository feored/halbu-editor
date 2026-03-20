<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";

	import { editorState } from "$lib/editor/editorState.svelte";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { getSupportedClass, getSupportedClassNames } from "$lib/utils/gameData";
	import { setClass } from "$lib/editor/character/character";
	import { resizeSkillSlots } from "$lib/editor/skills/skillsSlots";
	import { toEditorSave } from "$lib/types/saveConverter";
	import type { BackendEditorSave } from "$lib/types/backend";
	import type { ClassName } from "$lib/types/editor";

	let {
		editingVersion,
		classSupportWarning,
	}: { editingVersion: number; classSupportWarning: string } = $props();

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const supportedClasses = $derived(getSupportedClassNames(editingVersion));

	let classChangeError = $state("");
	let selectedClass = $state<string | null>(null);

	async function applyClassTemplate(nextClassName: string | null): Promise<void> {
		if (nextClassName == null) {
			return;
		}

		classChangeError = "";

		try {
			const response = await invoke<BackendEditorSave>("new_save", {
				version: editingVersion,
				class: nextClassName,
			});

			const templateSave = toEditorSave(response);
			setClass(save, nextClassName as ClassName);

			const slotCount = Math.max(templateSave.skills.length, save.skills.length);
			save.skills = resizeSkillSlots(templateSave.skills, slotCount);
		} catch (error) {
			classChangeError = getErrorMessage(error, "Failed to apply class template.");
			selectedClass = getSupportedClass(editingVersion, save.character.className);
		}
	}

	$effect(() => {
		selectedClass = getSupportedClass(editingVersion, save.character.className);
	});
</script>

<div class="grid grid-cols-form-32 items-center gap-x-2.5">
	<label class="form-label mb-0" for="class">Class</label>

	{#if selectedClass != null}
		<select
			class="form-select"
			bind:value={selectedClass}
			name="class"
			id="class"
			onchange={() => applyClassTemplate(selectedClass)}
		>
			{#each supportedClasses as className}
				<option value={className}>{className}</option>
			{/each}
		</select>
	{:else}
		<input
			class="form-control"
			type="text"
			name="class"
			id="class"
			autocomplete="off"
			value={save.character.className}
			readonly
		/>
	{/if}
</div>

{#if classSupportWarning.length > 0}
	<div class="form-text mt-1 text-halbu-warning sm:pl-32">
		{classSupportWarning}
	</div>
{/if}

{#if classChangeError.length > 0}
	<div class="form-text mt-1 text-halbu-warning sm:pl-32">{classChangeError}</div>
{/if}
