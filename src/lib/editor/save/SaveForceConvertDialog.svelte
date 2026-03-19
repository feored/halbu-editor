<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";

	type SaveForceConvertDialogProps = {
		open?: boolean;
		effectiveTargetVersion: number;
		blockingIssueMessages?: string[];
		canForceConvert?: boolean;
		saveInProgress?: boolean;
		onClose?: () => void;
		onConfirmForceSave?: () => void | Promise<void>;
	};

	let {
		open = false,
		effectiveTargetVersion,
		blockingIssueMessages = [],
		canForceConvert = false,
		saveInProgress = false,
		onClose,
		onConfirmForceSave,
	}: SaveForceConvertDialogProps = $props();

	let dialogRef: HTMLDialogElement | undefined;

	function closeDialog() {
		onClose?.();
	}

	$effect(() => {
		const dialog = dialogRef;
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
	bind:this={dialogRef}
	onclose={closeDialog}
	class="w-[96vw] max-w-2xl rounded-sm border border-halbu-borderStrong bg-halbu-panel p-2.5 text-halbu-text shadow-lg backdrop:bg-black/45"
	aria-label="Force save warning"
>
	<div class="grid gap-2">
		<div class="grid gap-0.5">
			<h3 class="editor-card-title mb-0">Bypass compatibility checks?</h3>
			<p class="form-text m-0">
				This save has blocking compatibility issues for v{effectiveTargetVersion}.
			</p>
			<p class="form-text m-0">
				You can choose to still write a converted file, but that may result in a broken save
				state.
			</p>
		</div>

		{#if blockingIssueMessages.length > 0}
			<div class="rounded-xs border border-halbu-border bg-halbu-panel2 p-2">
				<div class="text-sm font-semibold text-halbu-text">Blocking issues</div>
				<ul class="mb-0 mt-1 pl-4 text-sm text-halbu-textMuted">
					{#each blockingIssueMessages as message}
						<li class="text-halbu-danger">{message}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex items-center justify-end gap-1.5">
			<Button variant="secondary" onclick={closeDialog} disabled={saveInProgress}>
				Cancel
			</Button>
			<Button
				variant="destructive"
				onclick={onConfirmForceSave}
				disabled={!canForceConvert || saveInProgress}
			>
				Force Save As...
			</Button>
		</div>
	</div>
</dialog>
