<script>
	import { confirm } from "@tauri-apps/plugin-dialog";
	import Button from "../../components/ui/button/button.svelte";
	import { getErrorMessage } from "../../utils/errorMessage.js";
	import { buildChangeReview } from "../status/reviewChanges";

	let {
		save,
		baselineSave = null,
		editValidation = { errors: [], warnings: [] },
		saveDisabled = false,
		compatibilityIssues = [],
		compatibilityTargetVersion = null,
		compatibilityPending = false,
		compatibilityError = "",
		outputFormatOptions = [],
		advancedSaveOptionsEnabled = false,
		onToggleAdvancedSaveOptions,
		onSelectCompatibilityTargetVersion,
		onSave,
		onRestore,
	} = $props();

	let statusError = $state("");
	let saveInProgress = $state(false);
	let reviewModalOpen = $state(false);
	let validationDetailsOpen = $state(false);
	let advancedConversionDetailsOpen = $state(false);
	let reviewDialogRef;

	const editValidationErrors = $derived(editValidation.errors);
	const editValidationWarnings = $derived(editValidation.warnings);
	const editValidationErrorCount = $derived(editValidationErrors.length);
	const editValidationWarningCount = $derived(editValidationWarnings.length);
	const hasEditValidationErrors = $derived(editValidationErrorCount > 0);
	const hasEditValidationWarnings = $derived(editValidationWarningCount > 0);
	const compatibilityIssuesList = $derived(compatibilityIssues);
	const blockingCompatibilityIssues = $derived(
		compatibilityIssuesList.filter((issue) => issue.blocking),
	);
	const nonBlockingCompatibilityIssues = $derived(
		compatibilityIssuesList.filter((issue) => !issue.blocking),
	);
	const hasBlockingCompatibilityIssues = $derived(blockingCompatibilityIssues.length > 0);
	const hasCompatibilityIssues = $derived(compatibilityIssuesList.length > 0);
	const outputFormats = $derived(outputFormatOptions);
	const validationSummary = $derived.by(() => {
		if (hasEditValidationErrors || hasBlockingCompatibilityIssues) {
			return "Blocked";
		}
		if (
			hasEditValidationWarnings ||
			hasCompatibilityIssues ||
			compatibilityError.length > 0 ||
			compatibilityPending
		) {
			return "Ready with warnings";
		}
		return "Ready";
	});
	const validationSummaryClass = $derived.by(() => {
		if (hasEditValidationErrors || hasBlockingCompatibilityIssues) {
			return "text-halbu-danger";
		}
		if (
			hasEditValidationWarnings ||
			hasCompatibilityIssues ||
			compatibilityError.length > 0 ||
			compatibilityPending
		) {
			return "text-halbu-warning";
		}
		return "text-halbu-text";
	});
	const hasValidationIssues = $derived(
		hasEditValidationErrors ||
			hasEditValidationWarnings ||
			hasCompatibilityIssues ||
			compatibilityError.length > 0,
	);
	const formattedCompatibilityTargetVersion = $derived.by(() => {
		return compatibilityTargetVersion == null ? "unknown" : `v${compatibilityTargetVersion}`;
	});
	const currentVersion = $derived(save.version);
	const targetVersion = $derived(compatibilityTargetVersion);
	const changeReview = $derived(buildChangeReview(baselineSave, save));
	const reviewChangeCount = $derived(changeReview.totalChanges);
	const reviewChangeGroups = $derived(changeReview.groups);
	const COMPATIBILITY_CODE_LABELS = {
		WarlockRequiresRotw: "Warlock requires RotW edition target.",
		WarlockRequiresRotwExpansion: "Warlock requires Reign of the Warlock expansion mode.",
		RotwExpansionRequiresRotwEdition:
			"Reign of the Warlock expansion mode requires a RotW edition target.",
		ExpansionClassRequiresExpansionMode:
			"Druid and Assassin require Expansion or Reign of the Warlock mode.",
		UnknownClassRequiresKnownTarget:
			"Unknown classes cannot be safely converted to known target formats.",
	};

	function compatibilityMessage(issue) {
		const message = issue.message.trim();
		if (message.length > 0) {
			return message;
		}
		const code = issue.code;
		if (code.length > 0 && code in COMPATIBILITY_CODE_LABELS) {
			return COMPATIBILITY_CODE_LABELS[code];
		}
		return "Issue";
	}

	function handleAdvancedSaveOptionsToggle(event) {
		const isOpen = event.currentTarget.open === true;
		advancedConversionDetailsOpen = isOpen;
		onToggleAdvancedSaveOptions(isOpen);
	}

	function handleValidationDetailsToggle(event) {
		validationDetailsOpen = event.currentTarget.open === true;
	}

	function handleCompatibilityTargetVersionChange(event) {
		const selectedVersion = Number(event.currentTarget.value);
		if (!Number.isInteger(selectedVersion) || selectedVersion < 1) {
			return;
		}
		onSelectCompatibilityTargetVersion(selectedVersion);
	}

	async function saveCurrentVersion() {
		statusError = "";
		saveInProgress = true;
		try {
			await onSave();
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to save.");
		} finally {
			saveInProgress = false;
		}
	}

	async function saveAsCurrentVersion() {
		statusError = "";
		saveInProgress = true;
		try {
			await onSave({ saveAs: true });
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to save.");
		} finally {
			saveInProgress = false;
		}
	}

	function openReviewModal() {
		if (reviewChangeCount < 1) {
			return;
		}
		reviewModalOpen = true;
	}

	function closeReviewModal() {
		reviewModalOpen = false;
	}

	function handleReviewDialogClose() {
		reviewModalOpen = false;
	}

	async function undoAllChanges() {
		if (reviewChangeCount < 1) {
			return;
		}

		const confirmed = await confirm(
			"Discard all unsaved changes?\n\nThis will restore the character to the state at the last open/save point.",
			{
				title: "Undo All Changes",
				kind: "warning",
				okLabel: "Discard Changes",
				cancelLabel: "Cancel",
			},
		);
		if (!confirmed) {
			return;
		}

		try {
			await onRestore();
			closeReviewModal();
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to restore changes.");
		}
	}

	$effect(() => {
		if (hasValidationIssues) {
			validationDetailsOpen = true;
		}
	});

	$effect(() => {
		advancedConversionDetailsOpen = advancedSaveOptionsEnabled === true;
	});

	$effect(() => {
		const dialog = reviewDialogRef;
		if (dialog == null) {
			return;
		}
		if (reviewModalOpen) {
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

<div class="grid content-start gap-2.5">
	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Save</h3>
		<div class="grid gap-1">
			<details
				bind:open={validationDetailsOpen}
				ontoggle={handleValidationDetailsToggle}
				class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1.5"
			>
				<summary class="flex cursor-pointer list-none items-center justify-between gap-2">
					<span class="inline-flex items-center gap-1.5">
						<span aria-hidden="true" class="text-sm text-halbu-textMuted">
							{validationDetailsOpen ? "▾" : "▸"}
						</span>
						<span class="form-label mb-0">Validation</span>
					</span>
					<span class={`text-sm ${validationSummaryClass}`}
						>{validationSummary}</span
					>
				</summary>

				<div class="mt-1 grid gap-1">
					<div class="grid gap-0.5">
						<div class="form-label mb-0">Edit validation</div>
						<div
							class={`text-sm ${
								hasEditValidationErrors
									? "text-halbu-danger"
									: hasEditValidationWarnings
										? "text-halbu-warning"
										: "text-halbu-text"
							}`}
						>
							{#if hasEditValidationErrors}
								Blocked ({editValidationErrorCount} error(s))
							{:else if hasEditValidationWarnings}
								Ready with warnings ({editValidationWarningCount})
							{:else}
								Ready
							{/if}
						</div>
						{#if hasEditValidationErrors || hasEditValidationWarnings}
							<ul class="m-0 pl-4 text-sm text-halbu-textMuted">
								{#each editValidationErrors as issue}
									<li>{issue}</li>
								{/each}
								{#each editValidationWarnings as issue}
									<li>{issue}</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="grid gap-0.5">
						<div class="form-label mb-0">
							Compatibility preflight ({formattedCompatibilityTargetVersion})
						</div>
						{#if compatibilityPending}
							<div class="text-sm text-halbu-textMuted">
								Checking compatibility...
							</div>
						{:else if compatibilityError.length > 0}
							<div class="text-sm text-halbu-warning">
								Compatibility check failed: {compatibilityError}
							</div>
						{:else if hasBlockingCompatibilityIssues}
							<div class="text-sm text-halbu-danger">
								Blocked ({blockingCompatibilityIssues.length} blocking issue(s))
							</div>
						{:else if hasCompatibilityIssues}
							<div class="text-sm text-halbu-warning">
								Ready with warnings ({nonBlockingCompatibilityIssues.length})
							</div>
						{:else}
							<div class="text-sm text-halbu-text">Compatible</div>
						{/if}
						{#if hasCompatibilityIssues}
							<ul class="m-0 pl-4 text-sm text-halbu-textMuted">
								{#each compatibilityIssuesList as issue}
									<li class={issue.blocking ? "text-halbu-danger" : ""}>
										{issue.blocking ? "Blocking" : "Warning"}:
										{compatibilityMessage(issue)}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</details>

			<details
				bind:open={advancedConversionDetailsOpen}
				ontoggle={handleAdvancedSaveOptionsToggle}
				class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1.5"
			>
				<summary class="flex cursor-pointer list-none items-center justify-between gap-2">
					<span class="inline-flex items-center gap-1.5">
						<span aria-hidden="true" class="text-sm text-halbu-textMuted">
							{advancedConversionDetailsOpen ? "▾" : "▸"}
						</span>
						<span class="form-label mb-0">Conversion</span>
					</span>
					<span class="text-sm text-halbu-textMuted">
						{advancedConversionDetailsOpen ? "Enabled" : "Disabled"}
					</span>
				</summary>
				<div class="mt-1 grid gap-1">
					{#if advancedConversionDetailsOpen}
						<div class="grid grid-cols-form-32 items-center gap-x-2">
							<label class="form-label mb-0" for="save-target-format"
								>Output format</label
							>
							<select
								id="save-target-format"
								class="form-select"
								value={targetVersion == null ? "" : targetVersion}
								onchange={handleCompatibilityTargetVersionChange}
							>
								{#each outputFormats as format}
									<option value={format.version}>
										{format.formatId} (v{format.version}) - {format.gameEdition}
									</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
			</details>

			<div class="rounded-xs border border-halbu-border bg-halbu-panel2 px-2 py-1.5">
				<div class="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
					<div class="text-sm text-halbu-text">
						Current version: v{currentVersion}
						<span aria-hidden="true" class="mx-1 text-halbu-textMuted">·</span>
						Target version: v{targetVersion ?? currentVersion}
					</div>
					<div
						class="flex flex-wrap items-center gap-1.5 justify-self-start sm:justify-self-end"
					>
						<Button
							variant="secondary"
							onclick={openReviewModal}
							disabled={reviewChangeCount < 1}
						>
							Review Changes ({reviewChangeCount})
						</Button>
						<Button
							variant="secondary"
							onclick={saveAsCurrentVersion}
							disabled={saveDisabled || saveInProgress}
						>
							Save As...
						</Button>
							<Button
								onclick={saveCurrentVersion}
								disabled={saveDisabled || saveInProgress}
							>
								{saveInProgress ? "Saving..." : "Save"}
							</Button>
					</div>
				</div>
			</div>

			{#if statusError.length > 0}
				<div class="form-text text-halbu-warning">{statusError}</div>
			{/if}
		</div>
	</section>
</div>

<dialog
	bind:this={reviewDialogRef}
	onclose={handleReviewDialogClose}
	class="w-[96vw] max-w-4xl rounded-sm border border-halbu-borderStrong bg-halbu-panel p-2.5 text-halbu-text shadow-lg backdrop:bg-black/45"
	aria-label="Review changes"
>
	<div class="flex items-start justify-between gap-2">
		<div class="grid gap-0.5">
			<h3 class="editor-card-title mb-0">Review Changes ({reviewChangeCount})</h3>
			<p class="form-text m-0">Compared against the state at open/last successful save.</p>
		</div>
		<div class="flex items-center gap-1.5">
			<Button variant="destructive" onclick={undoAllChanges} disabled={reviewChangeCount < 1}>
				Undo All Changes
			</Button>
			<Button variant="secondary" onclick={closeReviewModal}>Close</Button>
		</div>
	</div>

	<div
		class="mt-2 max-h-[68vh] overflow-auto rounded-xs border border-halbu-border bg-halbu-panel2 p-2"
	>
		{#if reviewChangeGroups.length < 1}
			<div class="form-text">No changes.</div>
		{:else}
			<div class="grid gap-2">
				{#each reviewChangeGroups as group}
					<section class="rounded-xs border border-halbu-border bg-halbu-panel px-2 py-1.5">
						<h4 class="editor-card-title mb-1">
							{group.section} ({group.changes.length})
						</h4>
						<div class="grid gap-0.5">
							{#each group.changes as change}
								<div
									class="grid gap-0.5 border-b border-halbu-border pb-0.5 last:border-b-0 last:pb-0"
								>
									<div class="text-sm font-semibold text-halbu-text">
										{change.label}
									</div>
									<div class="text-sm text-halbu-textMuted">
										{change.before} → {change.after}
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
