<script>
	import { invoke } from "@tauri-apps/api/core";
	import Button from "../../components/ui/button/button.svelte";
	import {
		getSaveExpansionType,
		getSaveEditionLabel,
		getSaveFormatIdLabel,
		isUnknownSaveFormat,
	} from "../../utils/GameSupport";
	import { getErrorMessage } from "../../utils/errorMessage";

	let {
		save,
		editorDocumentMode = "raw",
		parseMode = "lax",
		parseIssueCount = 0,
		parseIssues = [],
		headerChecksum = null,
		computedChecksum = null,
		sourceFileSize = null,
		sourcePath = null,
		editionHint = null,
		suggestedTargetVersion = null,
		parserLayoutVersion = null,
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
	const unknownFormatSession = $derived(isUnknownSaveFormat(save));
	const editionHintLabel = $derived.by(() => {
		if (editionHint === "D2RLegacy") {
			return "D2R Legacy";
		}
		if (editionHint === "RotW") {
			return "RotW";
		}
		return "Unknown";
	});
	const parserLayoutLabel = $derived.by(() => {
		if (parserLayoutVersion == null) {
			return "Not available";
		}
		return `V${parserLayoutVersion}`;
	});
	const suggestedTargetLabel = $derived.by(() => {
		if (suggestedTargetVersion == null) {
			return "Select manually";
		}
		return `v${suggestedTargetVersion}`;
	});
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
	const backupTotalLabel = $derived(backupStatus.totalBackups);
	const canOpenBackupFolder = $derived.by(() => {
		return sourcePath != null && sourcePath.length > 0;
	});
	const lastBackupLabel = $derived.by(() => {
		if (backupStatus.lastBackupTimestamp != null && backupStatus.lastBackupTimestamp.length > 0) {
			const formattedTimestamp = formatBackupTimestamp(
				backupStatus.lastBackupTimestamp,
			);
			if (formattedTimestamp != null) {
				return formattedTimestamp;
			}
		}
		if (backupStatus.lastBackupDatetime != null && backupStatus.lastBackupDatetime.length > 0) {
			const parsedFromDatetime = new Date(
				backupStatus.lastBackupDatetime.replace(" ", "T"),
			);
			const formattedDatetime = formatDateTimeForDisplay(parsedFromDatetime);
			if (formattedDatetime != null) {
				return formattedDatetime;
			}
			return backupStatus.lastBackupDatetime;
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
		return formatDateTimeForDisplay(date) ?? "-";
	}

	function formatDateTimeForDisplay(date) {
		if (Number.isNaN(date.getTime())) {
			return null;
		}
		const year = String(date.getFullYear());
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		const seconds = String(date.getSeconds()).padStart(2, "0");
		return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
	}

	function formatBackupTimestamp(timestamp) {
		if (timestamp.length < 19) {
			return null;
		}
		const year = Number(timestamp.slice(0, 4));
		const month = Number(timestamp.slice(4, 6));
		const day = Number(timestamp.slice(6, 8));
		const hour = Number(timestamp.slice(9, 11));
		const minute = Number(timestamp.slice(11, 13));
		const second = Number(timestamp.slice(13, 15));
		const millisecond = Number(timestamp.slice(16, 19));
		if (
			!Number.isInteger(year) ||
			!Number.isInteger(month) ||
			!Number.isInteger(day) ||
			!Number.isInteger(hour) ||
			!Number.isInteger(minute) ||
			!Number.isInteger(second) ||
			!Number.isInteger(millisecond)
		) {
			return null;
		}
		const date = new Date(year, month - 1, day, hour, minute, second, millisecond);
		return formatDateTimeForDisplay(date);
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
			backupStatusError = getErrorMessage(error, "Failed to load backup status.");
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
			backupFolderOpenError = getErrorMessage(error, "Failed to open backup folder.");
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
	<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
		<h3 class="editor-card-title mb-1.5">File Information</h3>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			{#if unknownFormatSession}
				<dt class="form-label mb-0">Detected version</dt>
				<dd class="m-0 text-sm text-halbu-text">v{save.version} (unknown format)</dd>

				<dt class="form-label mb-0">Edition hint</dt>
				<dd class="m-0 text-sm text-halbu-text">
					{#if editionHint == null}
						Not detected
					{:else}
						{editionHintLabel} (heuristic)
					{/if}
				</dd>

				<dt class="form-label mb-0">Parser layout</dt>
				<dd class="m-0 text-sm text-halbu-text">{parserLayoutLabel}</dd>

				<dt class="form-label mb-0">Suggested target</dt>
				<dd class="m-0 text-sm text-halbu-text">{suggestedTargetLabel}</dd>
			{:else}
				<dt class="form-label mb-0">Format ID</dt>
				<dd class="m-0 text-sm text-halbu-text">{getSaveFormatIdLabel(save)}</dd>

				<dt class="form-label mb-0">Game edition</dt>
				<dd class="m-0 text-sm text-halbu-text">{getSaveEditionLabel(save)}</dd>

				<dt class="form-label mb-0">Save version</dt>
				<dd class="m-0 text-sm text-halbu-text">{save.version}</dd>
			{/if}

			<dt class="form-label mb-0">Gameplay mode</dt>
			<dd class="m-0 text-sm text-halbu-text">{getSaveExpansionType(save)}</dd>

			<dt class="form-label mb-0">Last played</dt>
			<dd class="m-0 text-sm text-halbu-text">
				{formatUnixTimestamp(lastPlayedUnix)}
			</dd>

			<dt class="form-label mb-0">Source file size</dt>
			<dd class="m-0 text-sm text-halbu-text">{sourceFileSizeLabel}</dd>

			<dt class="form-label mb-0">Header checksum</dt>
			<dd class="m-0 font-mono text-sm text-halbu-text">{checksumHeaderLabel}</dd>

			<dt class="form-label mb-0">Computed checksum</dt>
			<dd class="m-0 font-mono text-sm text-halbu-text">{checksumComputedLabel}</dd>

			<dt class="form-label mb-0">Checksum status</dt>
			<dd class={`m-0 text-sm ${checksumStatusClass}`}>{checksumStatusLabel}</dd>
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
		</dl>
	</section>

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
