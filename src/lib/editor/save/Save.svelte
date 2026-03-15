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
		unknownFormatSession = false,
		editionHint = null,
		suggestedTargetVersion = null,
		parserLayoutVersion = null,
		suggestedTargetAutoSelected = false,
		requiresTargetSelection = false,
		canForceConvert = false,
		lastSaveUsedForceConversion = false,
		advancedSaveOptionsEnabled = false,
		onToggleAdvancedSaveOptions,
		onSelectCompatibilityTargetVersion,
		onSave,
		onRestore,
	} = $props();

	let statusError = $state("");
	let saveInProgress = $state(false);
	let reviewModalOpen = $state(false);
	let forceSaveModalOpen = $state(false);
	let advancedConversionDetailsOpen = $state(false);
	let reviewDialogRef;
	let forceSaveDialogRef;

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
	const editionHintLabel = $derived.by(() => {
		if (editionHint === "D2RLegacy") {
			return "D2R Legacy";
		}
		if (editionHint === "RotW") {
			return "RotW";
		}
		return "Unknown";
	});
	const currentVersion = $derived(save.version);
	const targetVersion = $derived(compatibilityTargetVersion);
	const effectiveTargetVersion = $derived(targetVersion ?? currentVersion);
	const isSaveBlocked = $derived(
		requiresTargetSelection ||
			hasEditValidationErrors ||
			hasBlockingCompatibilityIssues ||
			compatibilityError.length > 0 ||
			saveDisabled,
	);
	const isConversionRelevant = $derived(effectiveTargetVersion !== currentVersion);
	const hasConversionWarnings = $derived(
		compatibilityPending || compatibilityError.length > 0 || hasCompatibilityIssues,
	);
	const saveReadinessLabel = $derived.by(() => {
		if (isSaveBlocked) {
			return "Blocked";
		}
		if (hasEditValidationWarnings || hasConversionWarnings) {
			return "Warning";
		}
		return "Ready";
	});
	const saveReadinessClass = $derived.by(() => {
		if (isSaveBlocked) {
			return "text-halbu-danger";
		}
		if (hasEditValidationWarnings || hasConversionWarnings) {
			return "text-halbu-warning";
		}
		return "text-halbu-text";
	});
	const editChecksLabel = $derived.by(() => {
		if (hasEditValidationErrors) {
			return `Failed (${editValidationErrorCount} error(s))`;
		}
		if (hasEditValidationWarnings) {
			return `Passed with warnings (${editValidationWarningCount})`;
		}
		return "Passed";
	});
	const editChecksClass = $derived.by(() => {
		if (hasEditValidationErrors) {
			return "text-halbu-danger";
		}
		if (hasEditValidationWarnings) {
			return "text-halbu-warning";
		}
		return "text-halbu-text";
	});
	const compatibilityChecksLabel = $derived.by(() => {
		if (requiresTargetSelection) {
			return "Target required";
		}
		if (compatibilityPending) {
			return "Checking...";
		}
		if (compatibilityError.length > 0) {
			return "Check failed";
		}
		if (hasBlockingCompatibilityIssues) {
			return `Failed (${blockingCompatibilityIssues.length} blocking issue(s))`;
		}
		if (hasCompatibilityIssues) {
			return `Passed with warnings (${nonBlockingCompatibilityIssues.length})`;
		}
		return "Passed";
	});
	const compatibilityChecksClass = $derived.by(() => {
		if (requiresTargetSelection || compatibilityPending || hasCompatibilityIssues) {
			return "text-halbu-warning";
		}
		if (compatibilityError.length > 0 || hasBlockingCompatibilityIssues) {
			return "text-halbu-danger";
		}
		return "text-halbu-text";
	});
	const hasValidationIssues = $derived(
		requiresTargetSelection ||
			hasEditValidationErrors ||
			hasEditValidationWarnings ||
			hasCompatibilityIssues ||
			compatibilityError.length > 0,
	);
	const conversionStatusLabel = $derived.by(() => {
		if (!isConversionRelevant) {
			return "No conversion";
		}
		if (compatibilityPending) {
			return `Converting to v${effectiveTargetVersion} (checking compatibility)`;
		}
		if (compatibilityError.length > 0) {
			return `Converting to v${effectiveTargetVersion} (validation failed)`;
		}
		return `Converting to v${effectiveTargetVersion}`;
	});
	const conversionStatusClass = $derived.by(() => {
		if (compatibilityError.length > 0 || hasBlockingCompatibilityIssues) {
			return "text-halbu-danger";
		}
		if (!isConversionRelevant) {
			return "text-halbu-textMuted";
		}
		if (compatibilityPending || hasCompatibilityIssues) {
			return "text-halbu-warning";
		}
		return "text-halbu-text";
	});
	const changeReview = $derived(buildChangeReview(baselineSave, save));
	const reviewChangeCount = $derived(changeReview.totalChanges);
	const reviewChangeGroups = $derived(changeReview.groups);
	const unsavedChangesClass = $derived.by(() => {
		return reviewChangeCount > 0 ? "text-halbu-info" : "text-halbu-textMuted";
	});
	const unsavedChangesLabel = $derived.by(() => {
		return reviewChangeCount === 1
			? "1 unsaved change"
			: `${reviewChangeCount} unsaved changes`;
	});
	const nextActionLabel = $derived.by(() => {
		if (requiresTargetSelection) {
			return "Select an output format in Conversion before saving.";
		}
		if (
			hasEditValidationErrors ||
			hasBlockingCompatibilityIssues ||
			compatibilityError.length > 0
		) {
			return "Fix validation issues before saving.";
		}
		if (saveDisabled) {
			return "Saving is currently unavailable.";
		}
		if (reviewChangeCount > 0) {
			return "Review changes, then save.";
		}
		return "Choose Save or Save As to finalize this file.";
	});
	const canChooseTargetFormat = $derived(outputFormats.length > 0);
	const COMPATIBILITY_CODE_LABELS = {
		WarlockRequiresRotW: "Warlock requires RotW edition target.",
		WarlockRequiresRotWExpansion: "Warlock requires Reign of the Warlock expansion mode.",
		RotWExpansionRequiresRotWEdition:
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

	function handleCompatibilityTargetVersionChange(event) {
		const selectedVersion = Number(event.currentTarget.value);
		if (!Number.isInteger(selectedVersion) || selectedVersion < 1) {
			return;
		}
		onSelectCompatibilityTargetVersion(selectedVersion);
	}

	function handleAdvancedSaveOptionsToggle(event) {
		const isOpen = event.currentTarget.open === true;
		advancedConversionDetailsOpen = isOpen;
		onToggleAdvancedSaveOptions(isOpen);
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

	function openForceSaveModal() {
		if (!canForceConvert || saveInProgress) {
			return;
		}
		forceSaveModalOpen = true;
	}

	function closeForceSaveModal() {
		forceSaveModalOpen = false;
	}

	function handleForceSaveDialogClose() {
		forceSaveModalOpen = false;
	}

	async function forceSaveAsCurrentVersion() {
		statusError = "";
		saveInProgress = true;
		forceSaveModalOpen = false;
		try {
			await onSave({ saveAs: true, forceConvert: true });
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to force-save.");
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

	$effect(() => {
		const dialog = forceSaveDialogRef;
		if (dialog == null) {
			return;
		}
		if (forceSaveModalOpen) {
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
	<section class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Save Summary</h3>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			<dt class="form-label mb-0">Save readiness</dt>
			<dd class={`m-0 text-sm font-semibold ${saveReadinessClass}`}>{saveReadinessLabel}</dd>

			<dt class="form-label mb-0">Unsaved changes</dt>
			<dd class={`m-0 text-sm font-semibold ${unsavedChangesClass}`}>
				{unsavedChangesLabel}
			</dd>

			<dt class="form-label mb-0">Source version</dt>
			<dd class="m-0 text-sm text-halbu-text">v{currentVersion}</dd>

			<dt class="form-label mb-0">Target version</dt>
			<dd class="m-0 text-sm text-halbu-text">v{effectiveTargetVersion}</dd>

			<dt class="form-label mb-0">Conversion</dt>
			<dd class={`m-0 text-sm font-semibold ${conversionStatusClass}`}>
				{conversionStatusLabel}
			</dd>
		</dl>
		<div class="form-text mt-1">{nextActionLabel}</div>
		{#if lastSaveUsedForceConversion}
			<div class="form-text mt-1 text-halbu-warning">
				Last save used force conversion; compatibility checks were bypassed.
			</div>
		{/if}
	</section>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Validation</h3>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			<dt class="form-label mb-0">Edit checks</dt>
			<dd class={`m-0 text-sm font-semibold ${editChecksClass}`}>{editChecksLabel}</dd>

			<dt class="form-label mb-0">
				Target compatibility{#if !requiresTargetSelection}
					(v{effectiveTargetVersion}){/if}
			</dt>
			<dd class={`m-0 text-sm font-semibold ${compatibilityChecksClass}`}>
				{compatibilityChecksLabel}
			</dd>
		</dl>
		{#if unknownFormatSession}
			<div class="form-text mt-1 text-halbu-warning">
				This save uses an unknown version ({save.version}).
			</div>
			{#if editionHint != null}
				<div class="form-text mt-1">
					Based on its structure, it appears to be a {editionHintLabel} save.
				</div>
			{/if}
			{#if parserLayoutVersion != null}
				<div class="form-text mt-1">Halbu parsed it using the v{parserLayoutVersion} layout.</div>
			{/if}
			{#if suggestedTargetVersion != null}
				<div class="form-text mt-1">
					Suggested target: v{suggestedTargetVersion}.
					{#if suggestedTargetAutoSelected}
						This target was selected automatically based on the detected edition.
					{:else if targetVersion != null && targetVersion !== suggestedTargetVersion}
						Current selected target: v{targetVersion}.
					{/if}
				</div>
			{:else}
				<div class="form-text mt-1 text-halbu-warning">
					Select an output format in Conversion before saving.
				</div>
			{/if}
		{/if}
		{#if hasEditValidationErrors || hasEditValidationWarnings}
			<ul class="mt-1 mb-0 pl-4 text-sm text-halbu-textMuted">
				{#each editValidationErrors as issue}
					<li class="text-halbu-danger">{issue}</li>
				{/each}
				{#each editValidationWarnings as issue}
					<li>{issue}</li>
				{/each}
			</ul>
		{/if}
		{#if compatibilityError.length > 0}
			<div class="form-text mt-1 text-halbu-danger">
				Compatibility check failed: {compatibilityError}
			</div>
		{/if}
		{#if hasCompatibilityIssues}
			<ul class="mt-1 mb-0 pl-4 text-sm text-halbu-textMuted">
				{#each compatibilityIssuesList as issue}
					<li class={issue.blocking ? "text-halbu-danger" : ""}>
						{issue.blocking ? "Blocking" : "Warning"}: {compatibilityMessage(issue)}
					</li>
				{/each}
			</ul>
		{/if}
		{#if !hasValidationIssues && !compatibilityPending}
			<div class="form-text mt-1">All checks passed for this save and target version.</div>
		{/if}
	</section>

	<details
		bind:open={advancedConversionDetailsOpen}
		ontoggle={handleAdvancedSaveOptionsToggle}
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${
			!isConversionRelevant && !advancedConversionDetailsOpen ? "opacity-90" : ""
		}`}
	>
		<summary class="flex cursor-pointer list-none items-center justify-between gap-2">
			<span class="inline-flex items-center gap-1.5">
				<span aria-hidden="true" class="text-sm text-halbu-textMuted">
					{advancedConversionDetailsOpen ? "▾" : "▸"}
				</span>
				<span
					class={`editor-card-title ${!isConversionRelevant ? "text-halbu-textMuted" : ""}`}
				>
					Conversion
				</span>
			</span>
			<span class={`text-sm font-semibold ${conversionStatusClass}`}
				>{conversionStatusLabel}</span
			>
		</summary>

		{#if advancedConversionDetailsOpen}
			{#if canChooseTargetFormat}
				<div class="mt-1 grid grid-cols-form-48 items-center gap-x-2.5 gap-y-1">
					<label class="form-label mb-0" for="save-target-format">Output format</label>
					<select
						id="save-target-format"
						class="form-select"
						value={targetVersion == null ? "" : targetVersion}
						onchange={handleCompatibilityTargetVersionChange}
					>
						{#if requiresTargetSelection}
							<option value="">Select target format...</option>
						{/if}
						{#each outputFormats as format}
							<option value={format.version}>
								{format.formatId} (v{format.version}) - {format.gameEdition}
							</option>
						{/each}
					</select>
				</div>
			{:else}
				<div class="form-text mt-1">
					No output format options are available for this save.
				</div>
			{/if}
		{:else if !isConversionRelevant}
			<div class="form-text mt-1">
				No conversion is required. Expand to change target settings.
			</div>
		{/if}
	</details>

	<section class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Actions</h3>
		<div class="flex flex-wrap items-center gap-1.5">
			<Button
				variant="secondary"
				class={reviewChangeCount > 0
					? "border-halbu-borderStrong bg-halbu-infoSoft text-halbu-info hover:bg-halbu-infoSoft"
					: ""}
				onclick={openReviewModal}
				disabled={reviewChangeCount < 1}
			>
				{reviewChangeCount > 0 ? `Review Changes (${reviewChangeCount})` : "Review Changes"}
			</Button>
			<Button
				variant="secondary"
				onclick={saveAsCurrentVersion}
				disabled={saveDisabled || saveInProgress}
			>
				Save As...
			</Button>
			{#if canForceConvert}
				<Button
					variant="destructive"
					onclick={openForceSaveModal}
					disabled={saveInProgress}
				>
					Force Save As...
				</Button>
			{/if}
			<Button onclick={saveCurrentVersion} disabled={saveDisabled || saveInProgress}>
				{saveInProgress ? "Saving..." : "Save"}
			</Button>
		</div>
		{#if statusError.length > 0}
			<div class="form-text mt-1 text-halbu-warning">{statusError}</div>
		{/if}
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
					<section
						class="rounded-xs border border-halbu-border bg-halbu-panel px-2 py-1.5"
					>
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

<dialog
	bind:this={forceSaveDialogRef}
	onclose={handleForceSaveDialogClose}
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
				Halbu can still write a converted file, but the output may load incorrectly, lose data,
				or behave unexpectedly.
			</p>
			<p class="form-text m-0">
				Force conversion writes to a new file only and bypasses compatibility checks.
			</p>
		</div>

		{#if blockingCompatibilityIssues.length > 0}
			<div class="rounded-xs border border-halbu-border bg-halbu-panel2 p-2">
				<div class="text-sm font-semibold text-halbu-text">Blocking issues</div>
				<ul class="mb-0 mt-1 pl-4 text-sm text-halbu-textMuted">
					{#each blockingCompatibilityIssues as issue}
						<li class="text-halbu-danger">{compatibilityMessage(issue)}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex items-center justify-end gap-1.5">
			<Button variant="secondary" onclick={closeForceSaveModal} disabled={saveInProgress}>
				Cancel
			</Button>
			<Button
				variant="destructive"
				onclick={forceSaveAsCurrentVersion}
				disabled={!canForceConvert || saveInProgress}
			>
				Force Save As...
			</Button>
		</div>
	</div>
</dialog>
