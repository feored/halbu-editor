<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { buildChangeReview } from "$lib/editor/status/reviewChanges";
	import SaveChangeReviewDialog from "$lib/editor/save/SaveChangeReviewDialog.svelte";
	import SaveForceConvertDialog from "$lib/editor/save/SaveForceConvertDialog.svelte";
	import { editorState } from "$lib/editor/editorState.svelte";

	import type { CompatibilityIssue } from "$lib/types/backend";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);

	let statusError = $state("");
	let saveInProgress = $state(false);
	let reviewDialogOpen = $state(false);
	let forceSaveDialogOpen = $state(false);
	let advancedOpen = $state(false);

	const editErrors = $derived(session.editValidation.errors);
	const editWarnings = $derived(session.editValidation.warnings);
	const errorCount = $derived(editErrors.length);
	const warningCount = $derived(editWarnings.length);
	const hasEditErrors = $derived(errorCount > 0);
	const hasEditWarnings = $derived(warningCount > 0);
	const compatibilityIssues = $derived(session.compatibilityIssues);
	const blockingIssues = $derived(compatibilityIssues.filter((issue) => issue.blocking));
	const warningIssues = $derived(compatibilityIssues.filter((issue) => !issue.blocking));
	const hasBlockingIssues = $derived(blockingIssues.length > 0);
	const hasCompatibilityIssues = $derived(compatibilityIssues.length > 0);
	const currentVersion = $derived(save.version);
	const effectiveTargetVersion = $derived(editorState.targetVersion);
	const targetVersionLabel = $derived.by(() =>
		effectiveTargetVersion == null ? "Not selected" : `v${effectiveTargetVersion}`,
	);
	const isGameRulesMode = $derived(session.mode === "game-rules");
	const hasConversionWarnings = $derived(
		session.compatibilityPending ||
			(session.compatibilityError ?? "").length > 0 ||
			hasCompatibilityIssues,
	);
	const isConversionRelevant = $derived(
		effectiveTargetVersion != null && effectiveTargetVersion !== currentVersion,
	);
	const saveReadinessLabel = $derived.by(() => {
		if (editorState.isSaveBlocked) return "Blocked";
		if (hasEditWarnings || hasConversionWarnings) return "Warning";
		return "Ready";
	});
	const saveReadinessClass = $derived.by(() => {
		if (editorState.isSaveBlocked) return "text-halbu-danger";
		if (hasEditWarnings || hasConversionWarnings) return "text-halbu-warning";
		return "text-halbu-text";
	});
	const editChecksLabel = $derived.by(() => {
		if (hasEditErrors) return `Failed (${errorCount} error(s))`;
		if (hasEditWarnings) return `Passed with warnings (${warningCount})`;
		return "Passed";
	});
	const editChecksClass = $derived.by(() => {
		if (hasEditErrors) return "text-halbu-danger";
		if (hasEditWarnings) return "text-halbu-warning";
		return "text-halbu-text";
	});
	const compatibilityChecksLabel = $derived.by(() => {
		if (editorState.needsTargetVersion) return "Target required";
		if (session.compatibilityPending) return "Checking...";
		if ((session.compatibilityError ?? "").length > 0) return "Check failed";
		if (hasBlockingIssues) return `Failed (${blockingIssues.length} blocking issue(s))`;
		if (hasCompatibilityIssues) return `Passed with warnings (${warningIssues.length})`;
		return "Passed";
	});
	const compatibilityChecksClass = $derived.by(() => {
		if ((session.compatibilityError ?? "").length > 0 || hasBlockingIssues) {
			return "text-halbu-danger";
		}
		if (
			editorState.needsTargetVersion ||
			session.compatibilityPending ||
			hasCompatibilityIssues
		) {
			return "text-halbu-warning";
		}
		return "text-halbu-text";
	});
	const hasValidationIssues = $derived(
		editorState.needsTargetVersion ||
			hasEditErrors ||
			hasEditWarnings ||
			hasCompatibilityIssues ||
			(session.compatibilityError ?? "").length > 0,
	);
	const conversionLabel = $derived.by(() => {
		if (effectiveTargetVersion == null) return "No target selected";
		if (!isConversionRelevant) return "No conversion";
		if (session.compatibilityPending)
			return `Converting to v${effectiveTargetVersion} (checking compatibility)`;
		if ((session.compatibilityError ?? "").length > 0)
			return `Converting to v${effectiveTargetVersion} (validation failed)`;
		return `Converting to v${effectiveTargetVersion}`;
	});
	const conversionClass = $derived.by(() => {
		if ((session.compatibilityError ?? "").length > 0 || hasBlockingIssues) {
			return "text-halbu-danger";
		}
		if (!isConversionRelevant) return "text-halbu-textMuted";
		if (session.compatibilityPending || hasCompatibilityIssues) return "text-halbu-warning";
		return "text-halbu-text";
	});
	const changeReview = $derived(buildChangeReview(session.baselineSave, save));
	const changeCount = $derived(changeReview.totalChanges);
	const changeGroups = $derived(changeReview.groups);
	const unsavedChangesClass = $derived(
		changeCount > 0 ? "text-halbu-info" : "text-halbu-textMuted",
	);
	const unsavedChangesLabel = $derived(
		changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`,
	);
	const nextActionLabel = $derived.by(() => {
		if (editorState.needsTargetVersion)
			return "Select an output format in Conversion before saving.";
		if (hasEditErrors || hasBlockingIssues || (session.compatibilityError ?? "").length > 0) {
			return "Fix validation issues before saving.";
		}
		if (editorState.isSaveBlocked) return "Saving is currently unavailable.";
		if (changeCount > 0) return "Review changes, then save.";
		return "Choose Save or Save As to finalize this file.";
	});
	const canChooseTargetFormat = $derived(editorState.outputFormatOptions.length > 0);
	const editionHintLabel = $derived.by(() => {
		if (session.editionHint === "D2R Legacy") return "D2R Legacy";
		if (session.editionHint === "RotW") return "RotW";
		return "Unknown";
	});
	const compatibilityCodeLabels: Record<CompatibilityIssue["code"], string> = {
		WarlockRequiresRotW: "Warlock requires RotW edition target.",
		WarlockRequiresRotWExpansion: "Warlock requires Reign of the Warlock expansion mode.",
		RotWExpansionRequiresRotWEdition:
			"Reign of the Warlock expansion mode requires a RotW edition target.",
		ExpansionClassRequiresExpansionMode:
			"Druid and Assassin require Expansion or Reign of the Warlock mode.",
		UnknownClassRequiresKnownTarget:
			"Unknown classes cannot be safely converted to known target formats.",
	};

	function getCompatibilityMessage(issue: CompatibilityIssue): string {
		const message = issue.message.trim();
		if (message.length > 0) return message;
		return compatibilityCodeLabels[issue.code];
	}

	const blockingIssueMessages = $derived(
		blockingIssues.map((issue) => getCompatibilityMessage(issue)),
	);

	function handleTargetVersionChange(event: Event): void {
		const nextVersion = Number((event.currentTarget as HTMLSelectElement).value);
		if (nextVersion !== 99 && nextVersion !== 105) return;
		editorState.setTargetVersion(nextVersion);
	}

	function handleAdvancedToggle(event: Event): void {
		const isOpen = (event.currentTarget as HTMLDetailsElement).open === true;
		advancedOpen = isOpen;
		editorState.setAdvancedSaveOptionsEnabled(isOpen);
	}

	async function saveNow(): Promise<void> {
		statusError = "";
		saveInProgress = true;
		try {
			await editorState.save();
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to save.");
		} finally {
			saveInProgress = false;
		}
	}

	async function saveAs(): Promise<void> {
		statusError = "";
		saveInProgress = true;
		try {
			await editorState.save({ saveAs: true });
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to save.");
		} finally {
			saveInProgress = false;
		}
	}

	function openForceSaveDialog(): void {
		if (!editorState.canForceConvert || saveInProgress) return;
		forceSaveDialogOpen = true;
	}

	function closeForceSaveDialog(): void {
		forceSaveDialogOpen = false;
	}

	async function forceSaveAs(): Promise<void> {
		statusError = "";
		saveInProgress = true;
		forceSaveDialogOpen = false;
		try {
			await editorState.save({ saveAs: true, forceConvert: true });
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to force-save.");
		} finally {
			saveInProgress = false;
		}
	}

	function openReviewDialog(): void {
		if (changeCount < 1) return;
		reviewDialogOpen = true;
	}

	function closeReviewDialog(): void {
		reviewDialogOpen = false;
	}

	async function undoAllChanges(): Promise<void> {
		if (changeCount < 1) return;
		try {
			editorState.restore();
			closeReviewDialog();
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to restore changes.");
		}
	}

	$effect(() => {
		advancedOpen = session.advancedSaveOptionsEnabled === true;
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
			<dd class="m-0 text-sm text-halbu-text">{targetVersionLabel}</dd>
			<dt class="form-label mb-0">Conversion</dt>
			<dd class={`m-0 text-sm font-semibold ${conversionClass}`}>{conversionLabel}</dd>
		</dl>
		<div class="form-text mt-1">{nextActionLabel}</div>
		{#if isGameRulesMode}
			<div class="form-text mt-1">
				Game rules mode: Save writes recalculated life, mana, stamina, and remaining
				stat/skill points.
			</div>
			<div class="form-text mt-1 text-halbu-warning">
				Custom values may be replaced by recalculated values.
			</div>
		{/if}
		{#if session.lastSaveUsedForceConversion}
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
				Target compatibility{#if !editorState.needsTargetVersion && effectiveTargetVersion != null}
					(v{effectiveTargetVersion}){/if}
			</dt>
			<dd class={`m-0 text-sm font-semibold ${compatibilityChecksClass}`}>
				{compatibilityChecksLabel}
			</dd>
		</dl>
		{#if editorState.isUnknownFormat}
			<div class="form-text mt-1 text-halbu-warning">Unknown source format session.</div>
			<dl class="m-0 mt-1 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
				<dt class="form-label mb-0">Detected version</dt>
				<dd class="m-0 text-sm text-halbu-text">v{save.version} (unknown)</dd>
				<dt class="form-label mb-0">Parser layout</dt>
				<dd class="m-0 text-sm text-halbu-text">
					{#if session.parserLayoutVersion == null}Not available{:else}v{session.parserLayoutVersion}{/if}
				</dd>
				<dt class="form-label mb-0">Edition hint</dt>
				<dd class="m-0 text-sm text-halbu-text">
					{#if session.editionHint == null}Not detected{:else}{editionHintLabel} (heuristic){/if}
				</dd>
				<dt class="form-label mb-0">Suggested target</dt>
				<dd class="m-0 text-sm text-halbu-text">
					{#if session.suggestedTargetVersion == null}Select manually{:else}v{session.suggestedTargetVersion}{/if}
				</dd>
			</dl>
			{#if session.suggestedTargetVersion == null}
				<div class="form-text mt-1 text-halbu-warning">
					Select an output format in Conversion before saving.
				</div>
			{:else if session.targetVersion != null && session.targetVersion !== session.suggestedTargetVersion}
				<div class="form-text mt-1">
					Current selected target: v{session.targetVersion}.
				</div>
			{/if}
		{/if}
		{#if hasEditErrors || hasEditWarnings}
			<ul class="mt-1 mb-0 pl-4 text-sm text-halbu-textMuted">
				{#each editErrors as issue}<li class="text-halbu-danger">{issue}</li>{/each}
				{#each editWarnings as issue}<li>{issue}</li>{/each}
			</ul>
		{/if}
		{#if (session.compatibilityError ?? "").length > 0}
			<div class="form-text mt-1 text-halbu-danger">
				Compatibility check failed: {session.compatibilityError}
			</div>
		{/if}
		{#if hasCompatibilityIssues}
			<ul class="mt-1 mb-0 pl-4 text-sm text-halbu-textMuted">
				{#each compatibilityIssues as issue}
					<li class={issue.blocking ? "text-halbu-danger" : ""}>
						{issue.blocking ? "Blocking" : "Warning"}: {getCompatibilityMessage(issue)}
					</li>
				{/each}
			</ul>
		{/if}
		{#if !hasValidationIssues && !session.compatibilityPending}
			<div class="form-text mt-1">All checks passed for this save and target version.</div>
		{/if}
	</section>

	<details
		bind:open={advancedOpen}
		ontoggle={handleAdvancedToggle}
		class={`rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2 ${!isConversionRelevant && !advancedOpen ? "opacity-90" : ""}`}
	>
		<summary class="flex cursor-pointer list-none items-center justify-between gap-2">
			<span class="inline-flex items-center gap-1.5">
				<span aria-hidden="true" class="text-sm text-halbu-textMuted"
					>{advancedOpen ? "v" : ">"}</span
				>
				<span
					class={`editor-card-title ${!isConversionRelevant ? "text-halbu-textMuted" : ""}`}
					>Conversion</span
				>
			</span>
			<span class={`text-sm font-semibold ${conversionClass}`}>{conversionLabel}</span>
		</summary>
		{#if advancedOpen}
			{#if canChooseTargetFormat}
				<div class="mt-1 grid grid-cols-form-48 items-center gap-x-2.5 gap-y-1">
					<label class="form-label mb-0" for="save-target-format">Output format</label>
					<select
						id="save-target-format"
						class="form-select"
						value={session.targetVersion == null ? "" : session.targetVersion}
						onchange={handleTargetVersionChange}
					>
						{#if editorState.needsTargetVersion}<option value=""
								>Select target format...</option
							>{/if}
						{#each editorState.outputFormatOptions as format}
							<option value={format.version}
								>{format.formatId} (v{format.version}) - {format.gameEdition}</option
							>
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
				class={changeCount > 0
					? "border-halbu-borderStrong bg-halbu-infoSoft text-halbu-info hover:bg-halbu-infoSoft"
					: ""}
				onclick={openReviewDialog}
				disabled={changeCount < 1}
			>
				{changeCount > 0 ? `Review Changes (${changeCount})` : "Review Changes"}
			</Button>
			<Button
				variant="secondary"
				onclick={saveAs}
				disabled={editorState.isSaveBlocked || saveInProgress}>Save As...</Button
			>
			{#if editorState.canForceConvert}
				<Button
					variant="destructive"
					onclick={openForceSaveDialog}
					disabled={saveInProgress}>Force Save As...</Button
				>
			{/if}
			<Button onclick={saveNow} disabled={editorState.isSaveBlocked || saveInProgress}
				>{saveInProgress ? "Saving..." : "Save"}</Button
			>
		</div>
		{#if statusError.length > 0}<div class="form-text mt-1 text-halbu-warning">
				{statusError}
			</div>{/if}
	</section>
</div>

<SaveChangeReviewDialog
	open={reviewDialogOpen}
	reviewChangeCount={changeCount}
	reviewChangeGroups={changeGroups}
	onClose={closeReviewDialog}
	onUndoAllChanges={undoAllChanges}
/>
<SaveForceConvertDialog
	open={forceSaveDialogOpen}
	{effectiveTargetVersion}
	{blockingIssueMessages}
	canForceConvert={editorState.canForceConvert}
	{saveInProgress}
	onClose={closeForceSaveDialog}
	onConfirmForceSave={forceSaveAs}
/>
