<script lang="ts">
	interface Tab<T> {
		value: T;
		label: string;
	}

	interface Props<T> {
		tabs: Tab<T>[];
		active: T;
		onSelect: (value: T) => void;
	}

	let { tabs, active, onSelect }: Props<any> = $props();
</script>

<div
	class="flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-halbu-border bg-halbu-panel px-1.5 py-1.5"
>
	{#each tabs as tab}
		<button
			type="button"
			class={`border px-3 py-1.5 text-sm font-medium leading-none transition ${
				active === tab.value
					? "tab-active border-halbu-borderStrong bg-halbu-card text-halbu-text"
					: "border-halbu-borderStrong bg-halbu-panel2 text-halbu-textMuted hover:bg-halbu-card hover:text-halbu-text"
			}`}
			onclick={() => onSelect(tab.value)}
		>
			{tab.label}
		</button>
	{/each}
</div>

<style>
	.tab-active {
		box-shadow: inset 0 -2px 0 0 var(--halbu-primary);
	}
</style>
