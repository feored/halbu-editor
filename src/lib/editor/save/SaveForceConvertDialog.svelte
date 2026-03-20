<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";

	type SaveForceConvertDialogProps = {
		open?: boolean;
		targetVersion: number;
		issues?: string[];
		canForceSave?: boolean;
		saving?: boolean;
		onClose?: () => void;
		onConfirm?: () => void | Promise<void>;
	};

	let {
		open = false,
		targetVersion,
		issues = [],
		canForceSave = false,
		saving = false,
		onClose,
		onConfirm,
	}: SaveForceConvertDialogProps = $props();

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
	aria-label="Force save warning"
>
	<div class="grid gap-2">
		<div class="grid gap-0.5">
			<h3 class="editor-card-title mb-0">Bypass compatibility checks?</h3>
			<p class="form-text m-0">This save has blocking compatibility issues for v{targetVersion}.</p>
			<p class="form-text m-0">
				You can still write a converted file, but that may result in a broken save state.
			</p>
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
			<Button variant="secondary" onclick={() => onClose?.()} disabled={saving}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={onConfirm}
				disabled={!canForceSave || saving}
			>
				Force Save As...
			</Button>
		</div>
	</div>
</dialog>
