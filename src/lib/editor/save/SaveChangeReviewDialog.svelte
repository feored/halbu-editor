<script lang="ts">
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import type { ChangeGroup } from "$lib/editor/status/changes";

	type SaveChangeReviewDialogProps = {
		open?: boolean;
		changeCount?: number;
		changeGroups?: ChangeGroup[];
		onClose?: () => void;
		onUndoAllChanges?: () => void | Promise<void>;
	};

	let {
		open = false,
		changeCount = 0,
		changeGroups = [],
		onClose,
		onUndoAllChanges,
	}: SaveChangeReviewDialogProps = $props();

	let dialog: HTMLDialogElement | undefined;
	let undoConfirmOpen = $state(false);

	async function confirmUndoAllChanges() {
		undoConfirmOpen = false;
		await onUndoAllChanges?.();
	}

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
	class="w-[96vw] max-w-4xl rounded-sm border border-halbu-borderStrong bg-halbu-panel p-2.5 text-halbu-text shadow-lg backdrop:bg-black/45"
	aria-label="Review changes"
>
	<div class="flex items-start justify-between gap-2">
		<div class="grid gap-0.5">
			<h3 class="editor-card-title mb-0">Review Changes ({changeCount})</h3>
			<p class="form-text m-0">Compared against the state at open/last successful save.</p>
		</div>
		<div class="flex items-center gap-1.5">
			<Button
				variant="destructive"
				onclick={() => {
					if (changeCount > 0) {
						undoConfirmOpen = true;
					}
				}}
				disabled={changeCount < 1}
			>
				Undo All Changes
			</Button>
			<Button variant="secondary" onclick={() => onClose?.()}>Close</Button>
		</div>
	</div>

	<div
		class="mt-2 max-h-[68vh] overflow-auto rounded-xs border border-halbu-border bg-halbu-panel2 p-2"
	>
		{#if changeGroups.length < 1}
			<div class="form-text">No changes.</div>
		{:else}
			<div class="grid gap-2">
				{#each changeGroups as group}
					<section class="rounded-xs border border-halbu-border bg-halbu-panel px-2 py-1.5">
						<h4 class="editor-card-title mb-1">
							{group.section} ({group.changes.length})
						</h4>
						<div class="grid gap-0.5">
							{#each group.changes as change}
								<div
									class="grid gap-0.5 border-b border-halbu-border pb-0.5 last:border-b-0 last:pb-0"
								>
									<div class="text-sm font-semibold text-halbu-text">{change.label}</div>
									<div class="text-sm text-halbu-textMuted">
										{change.before} -> {change.after}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</div>
</dialog>

<ConfirmDialog
	open={undoConfirmOpen}
	title="Undo All Changes"
	message="Discard all unsaved changes?\n\nThis will restore the character to the state at the last open/save point."
	confirmLabel="Discard Changes"
	cancelLabel="Cancel"
	confirmVariant="destructive"
	onConfirm={confirmUndoAllChanges}
	onCancel={() => {
		undoConfirmOpen = false;
	}}
/>
