<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";

	type ConfirmDialogVariant = "default" | "destructive";

	let {
		open = false,
		title = "Confirm",
		message = "",
		detailItems = [],
		confirmLabel = "Confirm",
		cancelLabel = "Cancel",
		confirmVariant = "default",
		onCancel,
		onConfirm,
	} = $props<{
		open?: boolean;
		title?: string;
		message?: string;
		detailItems?: string[];
		confirmLabel?: string;
		cancelLabel?: string;
		confirmVariant?: ConfirmDialogVariant;
		onCancel?: () => void | Promise<void>;
		onConfirm?: () => void | Promise<void>;
	}>();

	let dialogElement = $state<HTMLDialogElement | null>(null);
	let closeReason = $state<"confirm" | "cancel" | null>(null);

	function handleCancelAction() {
		closeReason = "cancel";
		onCancel?.();
	}

	function handleConfirmAction() {
		closeReason = "confirm";
		onConfirm?.();
	}

	function handleDialogClose() {
		if (closeReason == null) {
			onCancel?.();
		}
		closeReason = null;
	}

	$effect(() => {
		const dialog = dialogElement;
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
	bind:this={dialogElement}
	onclose={handleDialogClose}
	class="w-[96vw] max-w-2xl rounded-sm border border-halbu-borderStrong bg-halbu-panel p-2.5 text-halbu-text shadow-lg backdrop:bg-black/45"
	aria-label={title}
>
	<div class="grid gap-2">
		<div class="grid gap-0.5">
			<h3 class="editor-card-title mb-0">{title}</h3>
			{#if message.length > 0}
				<p class="form-text m-0 whitespace-pre-line">{message}</p>
			{/if}
		</div>
		{#if detailItems.length > 0}
			<div class="rounded-xs border border-halbu-border bg-halbu-panel2 p-2">
				<ul class="mb-0 mt-0 pl-4 text-sm text-halbu-textMuted">
					{#each detailItems as detailItem}
						<li>{detailItem}</li>
					{/each}
				</ul>
			</div>
		{/if}
		<div class="flex items-center justify-end gap-1.5">
			<Button variant="secondary" onclick={handleCancelAction}>
				{cancelLabel}
			</Button>
			<Button variant={confirmVariant} onclick={handleConfirmAction}>
				{confirmLabel}
			</Button>
		</div>
	</div>
</dialog>
