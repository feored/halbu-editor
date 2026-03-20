<script lang="ts">
	interface Tab<T> {
		value: T;
		label: string;
		title?: string;
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
			title={tab.title}
			class={`editor-toggle-button rounded-xs px-3 py-1.5 text-sm font-medium leading-none ${
				active === tab.value ? "editor-toggle-button--selected" : ""
			}`}
			onclick={() => onSelect(tab.value)}
		>
			{tab.label}
		</button>
	{/each}
</div>
