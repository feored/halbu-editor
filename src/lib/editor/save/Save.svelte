<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { getChangeReview } from "$lib/editor/status/changes";
	import SaveChangeReviewDialog from "$lib/editor/save/SaveChangeReviewDialog.svelte";
	import SaveAnywayDialog from "$lib/editor/save/SaveAnywayDialog.svelte";
	import { getValidationMessage } from "$lib/editor/save/validation";
	import { editorState } from "$lib/editor/editorState.svelte";

	import type { CompatibilityIssue } from "$lib/types/backend";

	type SaveIssueSource = "Validation" | "Compatibility";

	type SaveIssueRow = {
		source: SaveIssueSource;
		blocking: boolean;
		message: string;
	};

	const session = $derived(editorState.session!);
	const save = $derived(session.save);

	let statusError = $state("");
	let saveInProgress = $state(false);
	let reviewDialogOpen = $state(false);
	let forceSaveDialogOpen = $state(false);

	const validationIssues = $derived(session.validationReport.issues);
	const blockingValidationIssues = $derived(validationIssues.filter((issue) => issue.blocking));
	const validationWarnings = $derived(validationIssues.filter((issue) => !issue.blocking));
	const validationError = $derived(session.validationError);
	const validationPending = $derived(session.validationPending);
	const validationErrorCount = $derived(blockingValidationIssues.length);
	const validationWarningCount = $derived(validationWarnings.length);
	const hasBlockingValidationIssues = $derived(validationErrorCount > 0);
	const hasValidationWarnings = $derived(validationWarningCount > 0);
	const compatibilityIssues = $derived(session.compatibilityIssues);
	const blockingCompatibilityIssues = $derived(
		compatibilityIssues.filter((issue) => issue.blocking),
	);
	const compatibilityWarnings = $derived(
		compatibilityIssues.filter((issue) => !issue.blocking),
	);
	const hasBlockingCompatibilityIssues = $derived(blockingCompatibilityIssues.length > 0);
	const hasCompatibilityIssues = $derived(compatibilityIssues.length > 0);
	const saveIssues = $derived.by(() => {
		const issues: SaveIssueRow[] = [];

		for (const issue of validationIssues) {
			issues.push({
				source: "Validation",
				blocking: issue.blocking,
				message: getValidationMessage(issue, save),
			});
		}

		for (const issue of compatibilityIssues) {
			issues.push({
				source: "Compatibility",
				blocking: issue.blocking,
				message: getCompatibilityMessage(issue),
			});
		}

		return issues;
	});
	const currentVersion = $derived(save.version);
	const targetVersion = $derived(editorState.targetVersion);
	const targetVersionLabel = $derived.by(() =>
		targetVersion == null ? "Not selected" : `v${targetVersion}`,
	);
	const isGameRulesMode = $derived(session.mode === "game-rules");
	const hasConversionWarnings = $derived(
		session.compatibilityPending ||
			(session.compatibilityError ?? "").length > 0 ||
			hasCompatibilityIssues,
	);
	const isConverting = $derived(targetVersion != null && targetVersion !== currentVersion);
	const saveReadinessLabel = $derived.by(() => {
		if (editorState.isSaveBlocked) return "Blocked";
		if (hasValidationWarnings || hasConversionWarnings) return "Warning";
		return "Ready";
	});
	const saveReadinessClass = $derived.by(() => {
		if (editorState.isSaveBlocked) return "text-halbu-danger";
		if (hasValidationWarnings || hasConversionWarnings) return "text-halbu-warning";
		return "text-halbu-text";
	});
	const validationChecksLabel = $derived.by(() => {
		if (validationPending) return "Checking...";
		if ((validationError ?? "").length > 0) return "Check failed";
		if (hasBlockingValidationIssues) return `Failed (${validationErrorCount} error(s))`;
		if (hasValidationWarnings) return `Passed with warnings (${validationWarningCount})`;
		return "Passed";
	});
	const validationChecksClass = $derived.by(() => {
		if ((validationError ?? "").length > 0 || hasBlockingValidationIssues)
			return "text-halbu-danger";
		if (validationPending || hasValidationWarnings) return "text-halbu-warning";
		return "text-halbu-text";
	});
	const compatibilityChecksLabel = $derived.by(() => {
		if (editorState.needsTargetVersion) return "Target required";
		if (session.compatibilityPending) return "Checking...";
		if ((session.compatibilityError ?? "").length > 0) return "Check failed";
		if (hasBlockingCompatibilityIssues) {
			return `Failed (${blockingCompatibilityIssues.length} blocking issue(s))`;
		}
		if (hasCompatibilityIssues) return `Passed with warnings (${compatibilityWarnings.length})`;
		return "Passed";
	});
	const compatibilityChecksClass = $derived.by(() => {
		if ((session.compatibilityError ?? "").length > 0 || hasBlockingCompatibilityIssues) {
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
	const hasIssues = $derived(
		editorState.needsTargetVersion ||
			hasBlockingValidationIssues ||
			hasValidationWarnings ||
			(validationError ?? "").length > 0 ||
			hasCompatibilityIssues ||
			(session.compatibilityError ?? "").length > 0,
	);
	const conversionLabel = $derived.by(() => {
		if (targetVersion == null) return "No target selected";
		if (!isConverting) return "No conversion";
		if (session.compatibilityPending)
			return `Converting to v${targetVersion} (checking compatibility)`;
		if ((session.compatibilityError ?? "").length > 0)
			return `Converting to v${targetVersion} (check failed)`;
		return `Converting to v${targetVersion}`;
	});
	const changeReview = $derived(getChangeReview(session.baselineSave, save));
	const changeCount = $derived(changeReview.totalChanges);
	const changeGroups = $derived(changeReview.groups);
	const unsavedChangesClass = $derived(
		changeCount > 0 ? "text-halbu-primary" : "text-halbu-textMuted",
	);
	const unsavedChangesLabel = $derived(
		changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`,
	);
	const nextStep = $derived.by(() => {
		if (editorState.needsTargetVersion)
			return "Select an output format in Conversion before saving.";
		if (
			hasBlockingValidationIssues ||
			hasBlockingCompatibilityIssues ||
			(validationError ?? "").length > 0 ||
			(session.compatibilityError ?? "").length > 0
		) {
			if (editorState.canForceSave) return "Fix issues or use Save As Anyway.";
			return "Fix issues before saving.";
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
		blockingCompatibilityIssues.map((issue) => getCompatibilityMessage(issue)),
	);
	const hasForceSaveValidationIssues = $derived(
		(validationError ?? "").length > 0 || hasBlockingValidationIssues,
	);
	const hasForceSaveCompatibilityIssues = $derived(
		(session.compatibilityError ?? "").length > 0 || hasBlockingCompatibilityIssues,
	);
	const forceSaveIssues = $derived.by(() => {
		const issues: string[] = [];

		if ((validationError ?? "").length > 0) {
			issues.push(`Validation check failed: ${validationError}`);
		}

		for (const issue of blockingValidationIssues) {
			issues.push(getValidationMessage(issue, save));
		}

		if ((session.compatibilityError ?? "").length > 0) {
			issues.push(`Compatibility check failed: ${session.compatibilityError}`);
		}

		for (const issue of blockingIssueMessages) {
			issues.push(issue);
		}

		return issues;
	});

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

	async function forceSaveAs(): Promise<void> {
		statusError = "";
		saveInProgress = true;
		forceSaveDialogOpen = false;
		try {
			await editorState.save({ saveAs: true, forceSave: true });
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to save anyway.");
		} finally {
			saveInProgress = false;
		}
	}

	async function undoAllChanges(): Promise<void> {
		if (changeCount < 1) return;
		try {
			editorState.restore();
			reviewDialogOpen = false;
		} catch (error) {
			statusError = getErrorMessage(error, "Failed to restore changes.");
		}
	}
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
			<dd
				class={`m-0 text-sm font-semibold ${
					!isConverting ? "text-halbu-textMuted" : "text-halbu-text"
				}`}
			>
				{conversionLabel}
			</dd>
		</dl>
		<div class="form-text mt-1">{nextStep}</div>
		{#if isGameRulesMode}
			<div class="form-text mt-1">
				Game rules mode: Save writes recalculated life, mana, stamina, and remaining
				stat/skill points.
			</div>
			<div class="form-text mt-1 text-halbu-warning">
				Custom values may be replaced by recalculated values.
			</div>
		{/if}
		{#if session.lastSaveUsedForceSave}
			<div class="form-text mt-1 text-halbu-warning">
				Last save used Save As Anyway; blocking checks were bypassed.
			</div>
		{/if}
	</section>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Issues</h3>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			<dt class="form-label mb-0">Validation</dt>
			<dd class={`m-0 text-sm font-semibold ${validationChecksClass}`}>
				{validationChecksLabel}
			</dd>
			<dt class="form-label mb-0">
				Target compatibility{#if !editorState.needsTargetVersion && targetVersion != null}
					(v{targetVersion}){/if}
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
		{#if (validationError ?? "").length > 0}
			<div class="form-text mt-1 text-halbu-danger">
				Validation check failed: {validationError}
			</div>
		{/if}
		{#if saveIssues.length > 0}
			<div
				class="mt-1 overflow-hidden rounded-xs border border-halbu-borderStrong bg-halbu-panel2"
			>
				<div
					class="flex items-center justify-between border-b border-halbu-border bg-halbu-panel px-2 py-1"
				>
					<span class="text-sm font-semibold text-halbu-text">Issues</span>
					<span class="text-xs text-halbu-textMuted">Validation and compatibility</span>
				</div>
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr
							class="border-b border-halbu-border bg-halbu-panel text-halbu-textMuted"
						>
							<th class="w-24 px-2 py-1 text-left font-medium">Source</th>
							<th class="w-24 px-2 py-1 text-left font-medium">Severity</th>
							<th class="px-2 py-1 text-left font-medium">Message</th>
						</tr>
					</thead>
					<tbody>
						{#each saveIssues as issue}
							<tr class="border-b border-halbu-border last:border-b-0">
								<td class="w-24 px-2 py-1 align-top whitespace-nowrap">
									<span
										class="inline-flex rounded-xs border border-halbu-border bg-halbu-panel px-1.5 py-0.5 text-xs font-semibold text-halbu-textMuted"
									>
										{issue.source}
									</span>
								</td>
								<td class="w-24 px-2 py-1 align-top whitespace-nowrap">
									<span
										class={`inline-flex rounded-xs border px-1.5 py-0.5 text-xs font-semibold ${
											issue.blocking
												? "border-halbu-danger bg-halbu-dangerSoft text-halbu-danger"
												: "border-halbu-warning bg-halbu-warningSoft text-halbu-warning"
										}`}>{issue.blocking ? "Blocking" : "Warning"}</span
									>
								</td>
								<td class="px-2 py-1 align-top text-halbu-text">{issue.message}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		{#if (session.compatibilityError ?? "").length > 0}
			<div class="form-text mt-1 text-halbu-danger">
				Compatibility check failed: {session.compatibilityError}
			</div>
		{/if}
		{#if !hasIssues && !session.compatibilityPending && !validationPending}
			<div class="form-text mt-1">All checks passed for this save and target version.</div>
		{/if}
	</section>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<div class="flex items-center justify-between gap-2">
			<h3 class={`editor-card-title mb-0 ${!isConverting ? "text-halbu-textMuted" : ""}`}>
				Conversion
			</h3>
			<span
				class={`text-sm font-semibold ${
					!isConverting ? "text-halbu-textMuted" : "text-halbu-text"
				}`}
			>
				{conversionLabel}
			</span>
		</div>
		{#if canChooseTargetFormat}
			<div class="mt-1 grid grid-cols-form-48 items-center gap-x-2.5 gap-y-1">
				<label class="form-label mb-0" for="save-target-format">Output format</label>
				<select
					id="save-target-format"
					class="form-select"
					value={session.targetVersion == null ? "" : session.targetVersion}
					onchange={(event) => {
						const nextVersion = Number((event.currentTarget as HTMLSelectElement).value);
						if (nextVersion === 99 || nextVersion === 105) {
							editorState.setTargetVersion(nextVersion);
						}
					}}
				>
					{#if editorState.needsTargetVersion}<option value="">Select target format...</option>{/if}
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
	</section>

	<section class="rounded-sm border border-halbu-borderStrong bg-halbu-panel2 px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">Actions</h3>
		<div class="flex flex-wrap items-center gap-1.5">
			<Button
				variant="secondary"
				onclick={() => {
					if (changeCount > 0) {
						reviewDialogOpen = true;
					}
				}}
				disabled={changeCount < 1}
			>
				{changeCount > 0 ? `Review Changes (${changeCount})` : "Review Changes"}
			</Button>
			<Button
				variant="secondary"
				onclick={saveAs}
				disabled={editorState.isSaveBlocked || saveInProgress}>Save As...</Button
			>
			{#if editorState.canForceSave}
				<Button
					variant="destructive"
					onclick={() => {
						if (editorState.canForceSave && !saveInProgress) {
							forceSaveDialogOpen = true;
						}
					}}
					disabled={saveInProgress}>Save As Anyway...</Button
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
	changeCount={changeCount}
	changeGroups={changeGroups}
	onClose={() => {
		reviewDialogOpen = false;
	}}
	onUndoAllChanges={undoAllChanges}
/>
<SaveAnywayDialog
	open={forceSaveDialogOpen}
	targetVersion={targetVersion ?? currentVersion}
	issues={forceSaveIssues}
	hasValidationIssues={hasForceSaveValidationIssues}
	hasCompatibilityIssues={hasForceSaveCompatibilityIssues}
	canForceSave={editorState.canForceSave}
	saving={saveInProgress}
	onClose={() => {
		forceSaveDialogOpen = false;
	}}
	onConfirm={forceSaveAs}
/>
