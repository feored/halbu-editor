<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import Button from "$lib/components/ui/button/button.svelte";
	import { editorState } from "$lib/editor/editorState.svelte";
	import { getErrorMessage } from "$lib/utils/errorMessage";
	import {
		getSaveEditionLabel,
		getSaveFormatIdLabel,
		isUnknownSaveFormat,
	} from "$lib/utils/gameData";

	import type { ParseIssue } from "$lib/types/backend";

	type Backups = {
		totalBackups: number;
		lastBackupTimestamp: string | null;
		lastBackupDatetime: string | null;
	};

	const emptyBackups: Backups = {
		totalBackups: 0,
		lastBackupTimestamp: null,
		lastBackupDatetime: null,
	};

	const session = $derived(editorState.session!);
	const save = $derived(session.save);
	const parseIssues = $derived(session.parseIssues);

	let backups = $state<Backups>(emptyBackups);
	let backupsError = $state("");
	let backupFolderError = $state("");
	let openingBackupFolder = $state(false);

	function formatBytes(bytes: number | null): string {
		if (bytes == null) {
			return "Not available";
		}

		if (bytes < 1000) {
			return `${bytes.toLocaleString()} B`;
		}

		return `${bytes.toLocaleString()} B (${(bytes / 1000).toFixed(1)} kB)`;
	}

	function formatChecksum(value: number | null): string {
		if (value == null) {
			return "-";
		}

		return `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
	}

	function formatDateTime(date: Date): string | null {
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

	function formatUnixTimestamp(unixSeconds: number): string {
		if (unixSeconds <= 0) {
			return "-";
		}

		return formatDateTime(new Date(unixSeconds * 1000)) ?? "-";
	}

	function formatBackupTimestamp(timestamp: string): string | null {
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
			[year, month, day, hour, minute, second, millisecond].some(
				(value) => !Number.isInteger(value),
			)
		) {
			return null;
		}

		return formatDateTime(new Date(year, month - 1, day, hour, minute, second, millisecond));
	}

	function formatLastBackup(backups: Backups): string {
		if (backups.lastBackupTimestamp != null && backups.lastBackupTimestamp.length > 0) {
			const formatted = formatBackupTimestamp(backups.lastBackupTimestamp);
			if (formatted != null) {
				return formatted;
			}
		}

		if (backups.lastBackupDatetime != null && backups.lastBackupDatetime.length > 0) {
			return (
				formatDateTime(new Date(backups.lastBackupDatetime.replace(" ", "T"))) ??
				backups.lastBackupDatetime
			);
		}

		return "Never";
	}

	function severityClass(severity: ParseIssue["severity"]): string {
		if (severity === "Error") {
			return "text-halbu-danger";
		}

		if (severity === "Warning") {
			return "text-halbu-warning";
		}

		return "text-halbu-text";
	}

	async function loadBackups(): Promise<void> {
		backupsError = "";

		if (session.sourcePath == null || session.sourcePath.length < 1) {
			backups = emptyBackups;
			return;
		}

		try {
			backups = await invoke<Backups>("get_backup_status", {
				sourcePath: session.sourcePath,
			});
		} catch (error) {
			backupsError = getErrorMessage(error, "Failed to load backup status.");
		}
	}

	async function openBackupFolder(): Promise<void> {
		if (session.sourcePath == null || session.sourcePath.length < 1) {
			return;
		}

		backupFolderError = "";
		openingBackupFolder = true;

		try {
			await invoke("open_backup_folder_for_source", { sourcePath: session.sourcePath });
		} catch (error) {
			backupFolderError = getErrorMessage(error, "Failed to open backup folder.");
		} finally {
			openingBackupFolder = false;
		}
	}

	$effect(() => {
		void session.sourcePath;
		void session.saveRevision;
		void loadBackups();
	});
</script>

<div class="divide-y divide-halbu-border">
	<section class="pb-3">
		<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-halbu-textMuted">
			File Information
		</p>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			{#if isUnknownSaveFormat(save)}
				<dt class="form-label mb-0">Detected version</dt>
				<dd class="m-0 text-sm text-halbu-text">v{save.version} (unknown format)</dd>
				<dt class="form-label mb-0">Edition hint</dt>
				<dd class="m-0 text-sm text-halbu-text">
					{#if session.editionHint == null}
						Not detected
					{:else if session.editionHint === "D2R Legacy"}
						D2R Legacy (heuristic)
					{:else if session.editionHint === "RotW"}
						RotW (heuristic)
					{:else}
						Unknown
					{/if}
				</dd>
				<dt class="form-label mb-0">Parser layout</dt>
				<dd class="m-0 text-sm text-halbu-text">
					{#if session.parserLayoutVersion == null}
						Not available
					{:else}
						V{session.parserLayoutVersion}
					{/if}
				</dd>
				<dt class="form-label mb-0">Suggested target</dt>
				<dd class="m-0 text-sm text-halbu-text">
					{#if session.suggestedTargetVersion == null}
						Select manually
					{:else}
						v{session.suggestedTargetVersion}
					{/if}
				</dd>
			{:else}
				<dt class="form-label mb-0">Format ID</dt>
				<dd class="m-0 text-sm text-halbu-text">{getSaveFormatIdLabel(save)}</dd>
				<dt class="form-label mb-0">Game edition</dt>
				<dd class="m-0 text-sm text-halbu-text">{getSaveEditionLabel(save)}</dd>
				<dt class="form-label mb-0">Save version</dt>
				<dd class="m-0 text-sm text-halbu-text">{save.version}</dd>
			{/if}
			<dt class="form-label mb-0">Gameplay mode</dt>
			<dd class="m-0 text-sm text-halbu-text">{save.expansionType}</dd>
			<dt class="form-label mb-0">Editor mode</dt>
			<dd class="m-0 text-sm text-halbu-text">
				{session.mode === "game-rules" ? "Game rules" : "Raw"}
			</dd>
			<dt class="form-label mb-0">Last played</dt>
			<dd class="m-0 text-sm text-halbu-text">{formatUnixTimestamp(save.character.lastPlayed)}</dd>
			<dt class="form-label mb-0">Source file size</dt>
			<dd class="m-0 text-sm text-halbu-text">{formatBytes(session.sourceFileSize)}</dd>
			<dt class="form-label mb-0">Header checksum</dt>
			<dd class="m-0 font-mono text-sm text-halbu-text">
				{formatChecksum(session.headerChecksum)}
			</dd>
			<dt class="form-label mb-0">Computed checksum</dt>
			<dd class="m-0 font-mono text-sm text-halbu-text">
				{formatChecksum(session.computedChecksum)}
			</dd>
			<dt class="form-label mb-0">Checksum status</dt>
			<dd
				class={`m-0 text-sm ${
					session.headerChecksum == null || session.computedChecksum == null
						? "text-halbu-textMuted"
						: session.headerChecksum === session.computedChecksum
							? "text-halbu-text"
							: "text-halbu-warning"
				}`}
			>
				{#if session.headerChecksum == null || session.computedChecksum == null}
					Not available
				{:else if session.headerChecksum === session.computedChecksum}
					Match
				{:else}
					Mismatch
				{/if}
			</dd>
		</dl>
	</section>

	<section class="py-3">
		<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-halbu-textMuted">
			Parser Status
		</p>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			<dt class="form-label mb-0">Parse mode</dt>
			<dd class="m-0 text-sm text-halbu-text">
				{editorState.parseMode === "strict" ? "Strict" : "Lax"}
			</dd>
			<dt class="form-label mb-0">Parse diagnostics found</dt>
			<dd
				class={`m-0 text-sm ${
					parseIssues.length > 0 ? "text-halbu-warning" : "text-halbu-text"
				}`}
			>
				{parseIssues.length > 0 ? `${session.parseIssueCount} issue(s)` : "No"}
			</dd>
		</dl>
	</section>

	<section class="py-3">
		<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-halbu-textMuted">
			Backups
		</p>
		<dl class="m-0 grid grid-cols-form-48 items-baseline gap-x-2.5 gap-y-1">
			<dt class="form-label mb-0">Backups stored</dt>
			<dd class="m-0 text-sm text-halbu-text">{backups.totalBackups}</dd>
			<dt class="form-label mb-0">Last backup</dt>
			<dd class="m-0 text-sm text-halbu-text">{formatLastBackup(backups)}</dd>
		</dl>
		<div class="mt-2">
			<Button
				variant="secondary"
				onclick={openBackupFolder}
				disabled={(session.sourcePath == null || session.sourcePath.length < 1) || openingBackupFolder}
			>
				{openingBackupFolder ? "Opening..." : "Open Backup Folder"}
			</Button>
		</div>
		{#if backupsError.length > 0}
			<div class="form-text mt-1 text-halbu-warning">
				Backup status unavailable: {backupsError}
			</div>
		{/if}
		{#if backupFolderError.length > 0}
			<div class="form-text mt-1 text-halbu-warning">{backupFolderError}</div>
		{/if}
	</section>

	<section class="pt-3">
		<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-halbu-textMuted">
			Diagnostics
		</p>
		{#if parseIssues.length > 0}
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
						{#each parseIssues as issue}
							<tr class="border-b border-halbu-border align-top last:border-b-0">
								<td class={`whitespace-nowrap px-1.5 py-1 ${severityClass(issue.severity)}`}>
									{issue.severity}
								</td>
								<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">{issue.kind}</td>
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
								<td class="min-w-64 px-1.5 py-1 text-halbu-text">{issue.message}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="m-0 text-sm text-halbu-textMuted">No parse diagnostics recorded.</p>
		{/if}
	</section>
</div>
