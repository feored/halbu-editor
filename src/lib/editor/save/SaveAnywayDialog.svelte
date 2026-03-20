<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";

	type SaveAnywayDialogProps = {
		open?: boolean;
		targetVersion: number;
		issues?: string[];
		hasValidationIssues?: boolean;
		hasCompatibilityIssues?: boolean;
		canForceSave?: boolean;
		saving?: boolean;
		onClose?: () => void;
		onConfirm?: () => void | Promise<void>;
	};

	let {
		open = false,
		targetVersion,
		issues = [],
		hasValidationIssues = false,
		hasCompatibilityIssues = false,
		canForceSave = false,
		saving = false,
		onClose,
		onConfirm,
	}: SaveAnywayDialogProps = $props();

	let dialog: HTMLDialogElement | undefined;

	$effect(() => {
		if (dialog == null) {
			return;
		}

		if (open) {
			if (!dialog.open) {
				dialog.showModal();
			}
			return;
		}

		if (dialog.open) {
			dialog.close();
		}
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => onClose?.()}
	class="w-[96vw] max-w-2xl rounded-sm border border-halbu-borderStrong bg-halbu-panel p-2.5 text-halbu-text shadow-lg backdrop:bg-black/45"
	aria-label="Save anyway warning"
>
	<div class="grid gap-2">
		<div class="grid gap-0.5">
			<h3 class="editor-card-title mb-0">Save anyway?</h3>
			{#if hasValidationIssues && hasCompatibilityIssues}
				<p class="form-text m-0">
					This will bypass blocking validation and compatibility checks and write the file
					anyway.
				</p>
			{:else if hasValidationIssues}
				<p class="form-text m-0">
					This will bypass blocking validation checks and write the file anyway.
				</p>
			{:else}
				<p class="form-text m-0">
					This will bypass blocking compatibility checks for v{targetVersion} and write the
					file anyway.
				</p>
			{/if}
			{#if hasValidationIssues}
				<p class="form-text m-0">
					The written save may be broken and fail to load in-game.
				</p>
			{:else}
				<p class="form-text m-0">
					The written save may be incompatible with v{targetVersion} or lose data.
				</p>
			{/if}
		</div>

		{#if issues.length > 0}
			<div class="rounded-xs border border-halbu-border bg-halbu-panel2 p-2">
				<div class="text-sm font-semibold text-halbu-text">Blocking issues</div>
				<ul class="mb-0 mt-1 pl-4 text-sm text-halbu-textMuted">
					{#each issues as issue}
						<li class="text-halbu-danger">{issue}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex items-center justify-end gap-1.5">
			<Button variant="secondary" onclick={() => onClose?.()} disabled={saving}>Cancel</Button
			>
			<Button variant="destructive" onclick={onConfirm} disabled={!canForceSave || saving}>
				Save As Anyway...
			</Button>
		</div>
	</div>
</dialog>
