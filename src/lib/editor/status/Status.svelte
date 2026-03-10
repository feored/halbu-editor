<script>
	import { invoke } from "@tauri-apps/api/core";
	import Button from "../../components/ui/button/button.svelte";
	import {
		getSaveEditionLabel,
	} from "../../utils/GameSupport";

	let {
		save,
		parseMode = "lax",
		parseIssueCount = 0,
		parseIssues = [],
		editValidation = { errors: [], warnings: [] },
		sourceFileSize = null,
		sourcePath = null,
		saveRevision = 0,
		saveDisabled = false,
		onSave,
	} = $props();

	let statusError = $state("");
	let saveInProgress = $state(false);
	let backupStatus = $state({
		sourcePath: "",
		totalBackups: 0,
		lastBackupTimestamp: null,
		lastBackupDatetime: null,
	});
	let backupStatusError = $state("");

	const parseModeLabel = $derived(parseMode === "strict" ? "Strict" : "Lax");
	const parseIssuesList = $derived(Array.isArray(parseIssues) ? parseIssues : []);
	const parsedIssueCount = $derived(
		Math.max(0, Number(parseIssueCount) || 0, parseIssuesList.length)
	);
	const parseIssuesFound = $derived(parsedIssueCount > 0);
	const editValidationErrors = $derived(
		Array.isArray(editValidation?.errors) ? editValidation.errors : []
	);
	const editValidationWarnings = $derived(
		Array.isArray(editValidation?.warnings) ? editValidation.warnings : []
	);
	const editValidationErrorCount = $derived(editValidationErrors.length);
	const editValidationWarningCount = $derived(editValidationWarnings.length);
	const hasEditValidationErrors = $derived(editValidationErrorCount > 0);
	const hasEditValidationWarnings = $derived(editValidationWarningCount > 0);
	const currentVersion = $derived(Number(save?.version) || 0);
	const lastPlayedUnix = $derived(Number(save?.character?.last_played));
	const normalizedSourceFileSize = $derived.by(() => {
		const size = Number(sourceFileSize);
		if (!Number.isFinite(size) || size < 0) {
			return null;
		}
		return Math.trunc(size);
	});
	const sourceFileSizeLabel = $derived.by(() => {
		if (normalizedSourceFileSize == null) {
			return "Not available";
		}
		return formatBytes(normalizedSourceFileSize);
	});
	const parsedMapSeed = $derived(Number(save?.character?.map_seed));
	const normalizedMapSeed = $derived.by(() => {
		if (!Number.isFinite(parsedMapSeed)) {
			return null;
		}
		return Math.trunc(parsedMapSeed) >>> 0;
	});
	const mapSeedHexLabel = $derived.by(() => {
		if (normalizedMapSeed == null) {
			return "-";
		}
		return `0x${normalizedMapSeed.toString(16).toUpperCase().padStart(8, "0")}`;
	});
	const mapSeedLabel = $derived.by(() => {
		if (normalizedMapSeed == null) {
			return "-";
		}
		return `${normalizedMapSeed} (${mapSeedHexLabel})`;
	});
	const backupTotalLabel = $derived(
		Number.isFinite(Number(backupStatus?.totalBackups))
			? String(backupStatus.totalBackups)
			: "-"
	);
	const lastBackupLabel = $derived.by(() => {
		if (typeof backupStatus?.lastBackupDatetime === "string" && backupStatus.lastBackupDatetime.length > 0) {
			return backupStatus.lastBackupDatetime;
		}
		if (typeof backupStatus?.lastBackupTimestamp === "string" && backupStatus.lastBackupTimestamp.length > 0) {
			return backupStatus.lastBackupTimestamp;
		}
		return "Never";
	});

	function formatBytes(bytes) {
		if (!Number.isFinite(bytes) || bytes < 0) {
			return "-";
		}
		if (bytes < 1000) {
			return `${bytes.toLocaleString()} B`;
		}
		const kilobytes = bytes / 1000;
		return `${bytes.toLocaleString()} B (${kilobytes.toFixed(1)} kB)`;
	}

	function formatUnixTimestamp(unixSeconds) {
		if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
			return "-";
		}
		const date = new Date(unixSeconds * 1000);
		if (Number.isNaN(date.getTime())) {
			return "-";
		}
		return date.toLocaleString();
	}

	function enumLabel(value) {
		if (typeof value === "string") {
			return value;
		}
		if (value && typeof value === "object") {
			const keys = Object.keys(value);
			if (keys.length > 0) {
				return keys[0];
			}
		}
		return String(value ?? "-");
	}

	function severityClass(severity) {
		const label = enumLabel(severity).toLowerCase();
		if (label === "error") {
			return "text-halbu-danger";
		}
		if (label === "warning") {
			return "text-halbu-warning";
		}
		return "text-halbu-text";
	}

	async function saveCurrentVersion() {
		if (typeof onSave !== "function") {
			return;
		}
		statusError = "";
		saveInProgress = true;
		try {
			await onSave();
		} catch (error) {
			statusError = String(error);
		} finally {
			saveInProgress = false;
		}
	}

	async function refreshBackupStatus() {
		backupStatusError = "";
		const normalizedSourcePath = typeof sourcePath === "string" ? sourcePath.trim() : "";
		if (normalizedSourcePath.length < 1) {
			backupStatus = {
				sourcePath: "",
				totalBackups: 0,
				lastBackupTimestamp: null,
				lastBackupDatetime: null,
			};
			return;
		}

		try {
			const nextStatus = await invoke("get_backup_status", {
				sourcePath: normalizedSourcePath,
			});
			backupStatus = {
				sourcePath: nextStatus?.sourcePath ?? normalizedSourcePath,
				totalBackups: Number(nextStatus?.totalBackups) || 0,
				lastBackupTimestamp: nextStatus?.lastBackupTimestamp ?? null,
				lastBackupDatetime: nextStatus?.lastBackupDatetime ?? null,
			};
		} catch (error) {
			backupStatusError = String(error);
		}
	}

	$effect(() => {
		sourcePath;
		saveRevision;
		refreshBackupStatus();
	});

</script>

<div class="grid content-start gap-[0.6rem]">
	<div class="grid grid-cols-1 gap-[0.6rem] xl:grid-cols-2">
		<div class="grid content-start gap-[0.6rem]">
			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
				<h3 class="editor-card-title mb-[0.34rem]">File Information</h3>
				<dl class="m-0 grid grid-cols-[12rem_minmax(0,1fr)] items-baseline gap-x-[0.6rem] gap-y-[0.24rem]">
					<dt class="form-label mb-0">Game edition</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{getSaveEditionLabel(save)}</dd>

					<dt class="form-label mb-0">Save version</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{save?.version ?? "-"}</dd>

					<dt class="form-label mb-0">Map seed</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{mapSeedLabel}</dd>

					<dt class="form-label mb-0">Last played</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{formatUnixTimestamp(lastPlayedUnix)}</dd>

					<dt class="form-label mb-0">Source file size</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{sourceFileSizeLabel}</dd>
				</dl>
			</section>

			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
				<h3 class="editor-card-title mb-[0.34rem]">Parser Status</h3>
				<dl class="m-0 grid grid-cols-[12rem_minmax(0,1fr)] items-baseline gap-x-[0.6rem] gap-y-[0.24rem]">
					<dt class="form-label mb-0">Parse mode</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{parseModeLabel}</dd>

					<dt class="form-label mb-0">Parse diagnostics found</dt>
					<dd class={`m-0 text-[0.9rem] ${parseIssuesFound ? "text-halbu-warning" : "text-halbu-text"}`}>
						{parseIssuesFound ? `${parsedIssueCount} issue(s)` : "No"}
					</dd>
				</dl>
			</section>
		</div>

		<div class="grid content-start gap-[0.6rem]">
			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
				<h3 class="editor-card-title mb-[0.34rem]">Backups</h3>
				<dl class="m-0 grid grid-cols-[12rem_minmax(0,1fr)] items-baseline gap-x-[0.6rem] gap-y-[0.24rem]">
					<dt class="form-label mb-0">Backups stored</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{backupTotalLabel}</dd>

					<dt class="form-label mb-0">Last backup</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{lastBackupLabel}</dd>
				</dl>
				{#if backupStatusError.length > 0}
					<div class="form-text text-halbu-warning mt-[0.2rem]">
						Backup status unavailable: {backupStatusError}
					</div>
				{/if}
			</section>

			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
				<h3 class="editor-card-title mb-[0.34rem]">Diagnostics</h3>
				{#if parseIssuesList.length > 0}
					<div class="overflow-auto rounded-xs border border-halbu-border bg-halbu-panel2">
						<table class="w-full border-collapse text-[0.86rem]">
							<thead>
								<tr class="border-b border-halbu-border text-halbu-textMuted">
									<th class="px-[0.42rem] py-[0.26rem] text-left font-medium">Severity</th>
									<th class="px-[0.42rem] py-[0.26rem] text-left font-medium">Kind</th>
									<th class="px-[0.42rem] py-[0.26rem] text-left font-medium">Section</th>
									<th class="px-[0.42rem] py-[0.26rem] text-left font-medium">Offset</th>
									<th class="px-[0.42rem] py-[0.26rem] text-left font-medium">Expected</th>
									<th class="px-[0.42rem] py-[0.26rem] text-left font-medium">Found</th>
									<th class="px-[0.42rem] py-[0.26rem] text-left font-medium">Message</th>
								</tr>
							</thead>
							<tbody>
								{#each parseIssuesList as issue}
									<tr class="border-b border-halbu-border align-top last:border-b-0">
										<td class={`whitespace-nowrap px-[0.42rem] py-[0.28rem] ${severityClass(issue?.severity)}`}>
											{enumLabel(issue?.severity)}
										</td>
										<td class="whitespace-nowrap px-[0.42rem] py-[0.28rem] text-halbu-text">
											{enumLabel(issue?.kind)}
										</td>
										<td class="whitespace-nowrap px-[0.42rem] py-[0.28rem] text-halbu-text">
											{issue?.section ?? "-"}
										</td>
										<td class="whitespace-nowrap px-[0.42rem] py-[0.28rem] text-halbu-text">
											{issue?.offset ?? "-"}
										</td>
										<td class="whitespace-nowrap px-[0.42rem] py-[0.28rem] text-halbu-text">
											{issue?.expected ?? "-"}
										</td>
										<td class="whitespace-nowrap px-[0.42rem] py-[0.28rem] text-halbu-text">
											{issue?.found ?? "-"}
										</td>
										<td class="min-w-[16rem] px-[0.42rem] py-[0.28rem] text-halbu-text">
											{issue?.message ?? "-"}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="form-text">No parse diagnostics recorded.</div>
				{/if}
			</section>
		</div>
	</div>

	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-[0.6rem] py-[0.46rem]">
		<h3 class="editor-card-title mb-[0.34rem]">Save</h3>
		<div class="grid gap-[0.3rem]">
			<div class="rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.52rem] py-[0.4rem]">
				<div class="grid gap-[0.08rem]">
					<div class="form-label mb-0">Edit validation</div>
					<div
						class={`text-[0.9rem] ${
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
						<ul class="m-0 pl-[1rem] text-[0.86rem] text-halbu-textMuted">
							{#each editValidationErrors as issue}
								<li>{issue}</li>
							{/each}
							{#each editValidationWarnings as issue}
								<li>{issue}</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>

			<div class="rounded-xs border border-halbu-border bg-halbu-panel2 px-[0.52rem] py-[0.4rem]">
				<div class="grid gap-[0.3rem] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
					<div class="text-[0.88rem] text-halbu-text">Current version: v{currentVersion}</div>
					<div class="justify-self-start sm:justify-self-end">
						<Button onclick={saveCurrentVersion} disabled={saveDisabled || saveInProgress}>
							{saveInProgress ? "Saving..." : `Save v${currentVersion}`}
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
