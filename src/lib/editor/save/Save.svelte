<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import { getChangeReview } from "$lib/editor/status/changes";
	import SaveChangeReviewDialog from "$lib/editor/save/SaveChangeReviewDialog.svelte";
	import SaveAnywayDialog from "$lib/editor/save/SaveAnywayDialog.svelte";
	import { editorState } from "$lib/editor/editorState.svelte";

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const saveState = $derived(editorState.saveState!);

	let statusError = $state("");
	let saveInProgress = $state(false);
	let reviewDialogOpen = $state(false);
	let forceSaveDialogOpen = $state(false);
	const currentVersion = $derived(save.version);
	const isGameRulesMode = $derived(session.mode === "game-rules");
	const changeReview = $derived(getChangeReview(session.baselineSave, save));
	const changeCount = $derived(changeReview.totalChanges);
	const changeGroups = $derived(changeReview.groups);
	const unsavedChangesClass = $derived(
		changeCount > 0 ? "text-halbu-primary" : "text-halbu-textMuted",
	);
	const unsavedChangesLabel = $derived(
		changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`,
	);
	const toneClass: Record<"normal" | "warning" | "danger", string> = {
		normal: "text-halbu-text",
		warning: "text-halbu-warning",
		danger: "text-halbu-danger",
	};

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

<div class="divide-y divide-halbu-border">
	<section class="grid gap-1.5 pb-3">
		<h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-halbu-textMuted">
			Save
		</h3>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			<dt class="form-label mb-0">Save readiness</dt>
			<dd class={`m-0 text-sm font-semibold ${toneClass[saveState.readiness.tone]}`}>
				{saveState.readiness.label}
			</dd>
			<dt class="form-label mb-0">Unsaved changes</dt>
			<dd class={`m-0 text-sm font-semibold ${unsavedChangesClass}`}>
				{unsavedChangesLabel}
			</dd>
			<dt class="form-label mb-0">Source version</dt>
			<dd class="m-0 text-sm text-halbu-text">v{currentVersion}</dd>
			<dt class="form-label mb-0">Target version</dt>
			<dd class="m-0 text-sm text-halbu-text">{saveState.targetVersionLabel}</dd>
			<dt class="form-label mb-0">Conversion</dt>
			<dd
				class={`m-0 text-sm font-semibold ${
					!saveState.isConverting ? "text-halbu-textMuted" : "text-halbu-text"
				}`}
			>
				{saveState.conversionLabel}
			</dd>
		</dl>
		<div class="form-text mt-1">
			{changeCount > 0 && !saveState.isSaveBlocked
				? "Review changes, then save."
				: saveState.nextStep}
		</div>
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

	<section class="grid gap-1.5 py-3">
		<h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-halbu-textMuted">
			Issues
		</h3>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			<dt class="form-label mb-0">Validation</dt>
			<dd class={`m-0 text-sm font-semibold ${toneClass[saveState.validation.tone]}`}>
				{saveState.validation.label}
			</dd>
			<dt class="form-label mb-0">Target compatibility</dt>
			<dd class={`m-0 text-sm font-semibold ${toneClass[saveState.compatibility.tone]}`}>
				{saveState.compatibility.label}
			</dd>
		</dl>
		{#if saveState.unknownFormat}
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
					{#if session.editionHint == null}Not detected{:else}{saveState.editionHintLabel} (heuristic){/if}
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
		{#if saveState.issues.length > 0}
			<div class="mt-1 overflow-hidden rounded-xs border border-halbu-border bg-halbu-panel2">
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
						{#each saveState.issues as issue}
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
		{#if !saveState.hasIssues && !session.compatibilityPending && !session.validationPending}
			<div class="form-text mt-1">All checks passed for this save and target version.</div>
		{/if}
	</section>

	<section class="grid gap-1.5 py-3">
		<div class="flex items-center justify-between gap-2">
			<h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-halbu-textMuted">
				Conversion
			</h3>
			<span
				class={`text-sm font-semibold ${
					!saveState.isConverting ? "text-halbu-textMuted" : "text-halbu-text"
				}`}
			>
				{saveState.conversionLabel}
			</span>
		</div>
		{#if editorState.outputFormatOptions.length > 0}
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
					{#if saveState.needsTargetVersion}<option value="">Select target format...</option>{/if}
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

	<section class="grid gap-1.5 pt-3">
		<h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-halbu-textMuted">
			Actions
		</h3>
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
				disabled={saveState.isSaveBlocked || saveInProgress}>Save As...</Button
			>
			{#if saveState.canForceSave}
				<Button
					variant="destructive"
					onclick={() => {
						if (saveState.canForceSave && !saveInProgress) {
							forceSaveDialogOpen = true;
						}
					}}
					disabled={saveInProgress}>Save As Anyway...</Button
				>
			{/if}
			<Button onclick={saveNow} disabled={saveState.isSaveBlocked || saveInProgress}
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
	targetVersion={saveState.targetVersion ?? currentVersion}
	issues={saveState.forceSaveIssues}
	hasValidationIssues={saveState.hasForceSaveValidationIssues}
	hasCompatibilityIssues={saveState.hasForceSaveCompatibilityIssues}
	canForceSave={saveState.canForceSave}
	saving={saveInProgress}
	onClose={() => {
		forceSaveDialogOpen = false;
	}}
	onConfirm={forceSaveAs}
/>
