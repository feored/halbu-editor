<script>
	import { invoke } from "@tauri-apps/api/core";
	import Button from "../../components/ui/button/button.svelte";
	import {
		getSaveExpansionType,
		getSaveEditionLabel,
		getSaveFormatIdLabel,
	} from "../../utils/GameSupport";

	let {
		save,
		parseMode = "lax",
		parseIssueCount = 0,
		parseIssues = [],
		headerChecksum = null,
		computedChecksum = null,
		sourceFileSize = null,
		sourcePath = null,
		saveRevision = 0,
	} = $props();

	let backupStatus = $state({
		sourcePath: "",
		totalBackups: 0,
		lastBackupTimestamp: null,
		lastBackupDatetime: null,
	});
	let backupStatusError = $state("");
	let backupFolderOpenError = $state("");
	let openingBackupFolder = $state(false);

	const parseModeLabel = $derived(parseMode === "strict" ? "Strict" : "Lax");
	const parseIssuesList = $derived(parseIssues);
	const parsedIssueCount = $derived(parseIssueCount);
	const parseIssuesFound = $derived(parsedIssueCount > 0);
	const checksumHeaderLabel = $derived.by(() => formatChecksum(headerChecksum));
	const checksumComputedLabel = $derived.by(() => formatChecksum(computedChecksum));
	const checksumStatusLabel = $derived.by(() => {
		if (headerChecksum == null || computedChecksum == null) {
			return "Not available";
		}
		return headerChecksum === computedChecksum ? "Match" : "Mismatch";
	});
	const checksumStatusClass = $derived.by(() => {
		if (headerChecksum == null || computedChecksum == null) {
			return "text-halbu-textMuted";
		}
		return headerChecksum === computedChecksum
			? "text-halbu-text"
			: "text-halbu-warning";
	});
	const lastPlayedUnix = $derived(save.character.last_played);
	const sourceFileSizeLabel = $derived.by(() => {
		if (sourceFileSize == null) {
			return "Not available";
		}
		return formatBytes(sourceFileSize);
	});
	const mapSeedHexLabel = $derived.by(() => {
		return `0x${save.character.map_seed.toString(16).toUpperCase().padStart(8, "0")}`;
	});
	const mapSeedLabel = $derived.by(() => `${save.character.map_seed} (${mapSeedHexLabel})`);
	const backupTotalLabel = $derived(backupStatus.totalBackups);
	const canOpenBackupFolder = $derived.by(() => {
		return sourcePath != null && sourcePath.length > 0;
	});
	const lastBackupLabel = $derived.by(() => {
		if (backupStatus.lastBackupDatetime != null && backupStatus.lastBackupDatetime.length > 0) {
			return backupStatus.lastBackupDatetime;
		}
		if (backupStatus.lastBackupTimestamp != null && backupStatus.lastBackupTimestamp.length > 0) {
			return backupStatus.lastBackupTimestamp;
		}
		return "Never";
	});

	function formatBytes(bytes) {
		if (bytes < 0) {
			return "-";
		}
		if (bytes < 1000) {
			return `${bytes.toLocaleString()} B`;
		}
		const kilobytes = bytes / 1000;
		return `${bytes.toLocaleString()} B (${kilobytes.toFixed(1)} kB)`;
	}

	function formatChecksum(value) {
		if (value == null) {
			return "-";
		}
		return `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
	}

	function formatUnixTimestamp(unixSeconds) {
		if (unixSeconds <= 0) {
			return "-";
		}
		const date = new Date(unixSeconds * 1000);
		if (Number.isNaN(date.getTime())) {
			return "-";
		}
		return date.toLocaleString();
	}

	function severityClass(severity) {
		const label = severity.toLowerCase();
		if (label === "error") {
			return "text-halbu-danger";
		}
		if (label === "warning") {
			return "text-halbu-warning";
		}
		return "text-halbu-text";
	}

	async function refreshBackupStatus() {
		backupStatusError = "";
		if (sourcePath == null || sourcePath.length < 1) {
			backupStatus = {
				sourcePath: "",
				totalBackups: 0,
				lastBackupTimestamp: null,
				lastBackupDatetime: null,
			};
			return;
		}

		try {
			/** @type {import("../../types/editor").BackupStatus} */
			const response = await invoke("get_backup_status", {
				sourcePath,
			});
			backupStatus = response;
		} catch (error) {
			backupStatusError = String(error);
		}
	}

	async function openBackupFolderForSource() {
		if (sourcePath == null || sourcePath.length < 1) {
			return;
		}
		backupFolderOpenError = "";
		openingBackupFolder = true;
		try {
			await invoke("open_backup_folder_for_source", {
				sourcePath,
			});
		} catch (error) {
			backupFolderOpenError = String(error ?? "Failed to open backup folder.");
		} finally {
			openingBackupFolder = false;
		}
	}

	$effect(() => {
		sourcePath;
		saveRevision;
		refreshBackupStatus();
	});
</script>

<div class="grid content-start gap-2.5">
	<div class="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
		<div class="grid content-start gap-2.5">
			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
				<h3 class="editor-card-title mb-1.5">File Information</h3>
				<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
					<dt class="form-label mb-0">Format ID</dt>
					<dd class="m-0 text-sm text-halbu-text">{getSaveFormatIdLabel(save)}</dd>

					<dt class="form-label mb-0">Game edition</dt>
					<dd class="m-0 text-sm text-halbu-text">{getSaveEditionLabel(save)}</dd>

					<dt class="form-label mb-0">Gameplay mode</dt>
					<dd class="m-0 text-sm text-halbu-text">{getSaveExpansionType(save)}</dd>

					<dt class="form-label mb-0">Save version</dt>
					<dd class="m-0 text-sm text-halbu-text">{save.version}</dd>

					<dt class="form-label mb-0">Map seed</dt>
					<dd class="m-0 text-sm text-halbu-text">{mapSeedLabel}</dd>

					<dt class="form-label mb-0">Last played</dt>
					<dd class="m-0 text-sm text-halbu-text">
						{formatUnixTimestamp(lastPlayedUnix)}
					</dd>

					<dt class="form-label mb-0">Source file size</dt>
					<dd class="m-0 text-sm text-halbu-text">{sourceFileSizeLabel}</dd>
				</dl>
			</section>

			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
				<h3 class="editor-card-title mb-1.5">Parser Status</h3>
				<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
					<dt class="form-label mb-0">Parse mode</dt>
					<dd class="m-0 text-sm text-halbu-text">{parseModeLabel}</dd>

					<dt class="form-label mb-0">Parse diagnostics found</dt>
					<dd
						class={`m-0 text-sm ${parseIssuesFound ? "text-halbu-warning" : "text-halbu-text"}`}
					>
						{parseIssuesFound ? `${parsedIssueCount} issue(s)` : "No"}
					</dd>

					<dt class="form-label mb-0">Header checksum</dt>
					<dd class="m-0 font-mono text-sm text-halbu-text">{checksumHeaderLabel}</dd>

					<dt class="form-label mb-0">Computed checksum</dt>
					<dd class="m-0 font-mono text-sm text-halbu-text">{checksumComputedLabel}</dd>

					<dt class="form-label mb-0">Checksum status</dt>
					<dd class={`m-0 text-sm ${checksumStatusClass}`}>{checksumStatusLabel}</dd>
				</dl>
			</section>
		</div>

		<div class="grid content-start gap-2.5">
			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
				<h3 class="editor-card-title mb-1.5">Backups</h3>
				<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
					<dt class="form-label mb-0">Backups stored</dt>
					<dd class="m-0 text-sm text-halbu-text">{backupTotalLabel}</dd>

					<dt class="form-label mb-0">Last backup</dt>
					<dd class="m-0 text-sm text-halbu-text">{lastBackupLabel}</dd>
				</dl>
				<div class="mt-1">
					<Button
						variant="secondary"
						onclick={openBackupFolderForSource}
						disabled={!canOpenBackupFolder || openingBackupFolder}
					>
						{openingBackupFolder ? "Opening..." : "Open Backup Folder"}
					</Button>
				</div>
				{#if backupStatusError.length > 0}
					<div class="form-text text-halbu-warning mt-1">
						Backup status unavailable: {backupStatusError}
					</div>
				{/if}
				{#if backupFolderOpenError.length > 0}
					<div class="form-text text-halbu-warning mt-1">{backupFolderOpenError}</div>
				{/if}
			</section>

			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
				<h3 class="editor-card-title mb-1.5">Diagnostics</h3>
				{#if parseIssuesList.length > 0}
					<div class="overflow-auto rounded-xs border border-halbu-border bg-halbu-panel2">
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr class="border-b border-halbu-border text-halbu-textMuted">
									<th class="px-1.5 py-1 text-left font-medium">Severity</th>
									<th class="px-1.5 py-1 text-left font-medium">Kind</th>
									<th class="px-1.5 py-1 text-left font-medium">Section</th>
									<th class="px-1.5 py-1 text-left font-medium">Offset</th>
									<th class="px-1.5 py-1 text-left font-medium">Expected</th>
									<th class="px-1.5 py-1 text-left font-medium">Found</th>
									<th class="px-1.5 py-1 text-left font-medium">Message</th>
								</tr>
							</thead>
							<tbody>
								{#each parseIssuesList as issue}
									<tr class="border-b border-halbu-border align-top last:border-b-0">
										<td class={`whitespace-nowrap px-1.5 py-1 ${severityClass(issue.severity)}`}>
											{issue.severity}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue.kind}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue.section ?? "-"}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue.offset ?? "-"}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue.expected ?? "-"}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue.found ?? "-"}
										</td>
										<td class="min-w-64 px-1.5 py-1 text-halbu-text">
											{issue.message}
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
</div>
