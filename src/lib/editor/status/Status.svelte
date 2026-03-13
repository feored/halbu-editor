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
	const parseIssuesList = $derived(Array.isArray(parseIssues) ? parseIssues : []);
	const parsedIssueCount = $derived(
		Math.max(0, Number(parseIssueCount) || 0, parseIssuesList.length),
	);
	const parseIssuesFound = $derived(parsedIssueCount > 0);
	const normalizedHeaderChecksum = $derived.by(() => {
		const parsed = Number(headerChecksum);
		if (!Number.isFinite(parsed) || parsed < 0) {
			return null;
		}
		return Math.trunc(parsed) >>> 0;
	});
	const normalizedComputedChecksum = $derived.by(() => {
		const parsed = Number(computedChecksum);
		if (!Number.isFinite(parsed) || parsed < 0) {
			return null;
		}
		return Math.trunc(parsed) >>> 0;
	});
	const checksumHeaderLabel = $derived.by(() => formatChecksum(normalizedHeaderChecksum));
	const checksumComputedLabel = $derived.by(() => formatChecksum(normalizedComputedChecksum));
	const checksumStatusLabel = $derived.by(() => {
		if (normalizedHeaderChecksum == null || normalizedComputedChecksum == null) {
			return "Not available";
		}
		return normalizedHeaderChecksum === normalizedComputedChecksum ? "Match" : "Mismatch";
	});
	const checksumStatusClass = $derived.by(() => {
		if (normalizedHeaderChecksum == null || normalizedComputedChecksum == null) {
			return "text-halbu-textMuted";
		}
		return normalizedHeaderChecksum === normalizedComputedChecksum
			? "text-halbu-text"
			: "text-halbu-warning";
	});
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
			: "-",
	);
	const canOpenBackupFolder = $derived.by(() => {
		const normalizedSourcePath = typeof sourcePath === "string" ? sourcePath.trim() : "";
		return normalizedSourcePath.length > 0;
	});
	const lastBackupLabel = $derived.by(() => {
		if (
			typeof backupStatus?.lastBackupDatetime === "string" &&
			backupStatus.lastBackupDatetime.length > 0
		) {
			return backupStatus.lastBackupDatetime;
		}
		if (
			typeof backupStatus?.lastBackupTimestamp === "string" &&
			backupStatus.lastBackupTimestamp.length > 0
		) {
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

	function formatChecksum(value) {
		if (!Number.isFinite(value)) {
			return "-";
		}
		return `0x${Math.trunc(value).toString(16).toUpperCase().padStart(8, "0")}`;
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

	async function openBackupFolderForSource() {
		const normalizedSourcePath = typeof sourcePath === "string" ? sourcePath.trim() : "";
		if (normalizedSourcePath.length < 1) {
			return;
		}
		backupFolderOpenError = "";
		openingBackupFolder = true;
		try {
			await invoke("open_backup_folder_for_source", {
				sourcePath: normalizedSourcePath,
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
				<dl class="m-0 grid grid-cols-[12rem_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1">
					<dt class="form-label mb-0">Format ID</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{getSaveFormatIdLabel(save)}</dd>

					<dt class="form-label mb-0">Game edition</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{getSaveEditionLabel(save)}</dd>

					<dt class="form-label mb-0">Gameplay mode</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{getSaveExpansionType(save)}</dd>

					<dt class="form-label mb-0">Save version</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{save?.version ?? "-"}</dd>

					<dt class="form-label mb-0">Map seed</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{mapSeedLabel}</dd>

					<dt class="form-label mb-0">Last played</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">
						{formatUnixTimestamp(lastPlayedUnix)}
					</dd>

					<dt class="form-label mb-0">Source file size</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{sourceFileSizeLabel}</dd>
				</dl>
			</section>

			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
				<h3 class="editor-card-title mb-1.5">Parser Status</h3>
				<dl class="m-0 grid grid-cols-[12rem_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1">
					<dt class="form-label mb-0">Parse mode</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{parseModeLabel}</dd>

					<dt class="form-label mb-0">Parse diagnostics found</dt>
					<dd
						class={`m-0 text-[0.9rem] ${parseIssuesFound ? "text-halbu-warning" : "text-halbu-text"}`}
					>
						{parseIssuesFound ? `${parsedIssueCount} issue(s)` : "No"}
					</dd>

					<dt class="form-label mb-0">Header checksum</dt>
					<dd class="m-0 font-mono text-[0.9rem] text-halbu-text">{checksumHeaderLabel}</dd>

					<dt class="form-label mb-0">Computed checksum</dt>
					<dd class="m-0 font-mono text-[0.9rem] text-halbu-text">{checksumComputedLabel}</dd>

					<dt class="form-label mb-0">Checksum status</dt>
					<dd class={`m-0 text-[0.9rem] ${checksumStatusClass}`}>{checksumStatusLabel}</dd>
				</dl>
			</section>
		</div>

		<div class="grid content-start gap-2.5">
			<section class="rounded-sm border border-halbu-border bg-halbu-panel px-2.5 py-2">
				<h3 class="editor-card-title mb-1.5">Backups</h3>
				<dl class="m-0 grid grid-cols-[12rem_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1">
					<dt class="form-label mb-0">Backups stored</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{backupTotalLabel}</dd>

					<dt class="form-label mb-0">Last backup</dt>
					<dd class="m-0 text-[0.9rem] text-halbu-text">{lastBackupLabel}</dd>
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
						<table class="w-full border-collapse text-[0.86rem]">
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
										<td class={`whitespace-nowrap px-1.5 py-1 ${severityClass(issue?.severity)}`}>
											{enumLabel(issue?.severity)}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{enumLabel(issue?.kind)}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue?.section ?? "-"}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue?.offset ?? "-"}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue?.expected ?? "-"}
										</td>
										<td class="whitespace-nowrap px-1.5 py-1 text-halbu-text">
											{issue?.found ?? "-"}
										</td>
										<td class="min-w-64 px-1.5 py-1 text-halbu-text">
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
</div>
