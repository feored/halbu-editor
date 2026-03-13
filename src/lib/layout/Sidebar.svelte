<script>
	import { AlertCircleIcon, SettingsIcon } from "lucide-svelte";
	import Button from "../components/ui/button/button.svelte";
	import { cn } from "../utils/cn";

	let {
		title = "",
		items = [],
		activeId = null,
		editorActive = false,
		libraryActive = false,
		settingsActive = false,
		onSelect,
		onLibrary,
		onSettings,
	} = $props();

	function selectItem(itemId) {
		onSelect?.(itemId);
	}
</script>

<nav class="sidebar-nav flex h-full min-h-0 flex-col">
	<div class="sidebar-nav__library mb-2 border-b border-halbu-border pb-2">
		<Button
			variant="ghost"
			class={cn(
				"w-full justify-start rounded-none border-l-2 border-l-transparent px-2 py-1.5 text-[0.91rem]",
				libraryActive
					? "bg-halbu-panel2 border-l-halbu-primary text-halbu-text"
					: "text-halbu-text hover:bg-halbu-panel2"
			)}
			onclick={onLibrary}
		>
			<span>{editorActive ? "← Library" : "Library"}</span>
		</Button>
	</div>

	{#if items.length > 0}
		<div class="sidebar-nav__main flex min-h-0 flex-col gap-2">
			{#if title.length > 0}
					<h1 class="sidebar-nav__title m-0 px-1.5 py-0.5 text-[0.74rem] font-semibold tracking-[0.02em] text-halbu-textDim">
					{title}
				</h1>
			{:else}
					<h1 class="sidebar-nav__title m-0 px-1.5 py-0.5 text-[0.74rem] font-semibold tracking-[0.02em] text-halbu-textDim">
					SECTIONS
				</h1>
			{/if}

			<ul class="sidebar-nav__list m-0 grid list-none gap-1 p-0">
				{#each items as item (item.id)}
					<li
						class={cn(
							"min-w-0",
							item.dividerBefore === true && "mt-1.5 border-t border-halbu-border pt-1.5"
						)}
					>
						<Button
							variant="ghost"
							class={cn(
								"w-full justify-start rounded-none border-l-2 border-l-transparent px-2 py-1.5 text-[0.91rem] hover:bg-halbu-panel2 hover:text-halbu-text",
								activeId === item.id &&
									"bg-halbu-panel2 border-l-halbu-primary text-halbu-text"
							)}
							disabled={item.disabled === true}
							onclick={() => selectItem(item.id)}
						>
							<span class="flex w-full min-w-0 items-center justify-between gap-2">
								<span>{item.label}</span>
								{#if item.saveBlocked === true}
									<AlertCircleIcon
										size={12}
										strokeWidth={2.1}
										class="shrink-0 text-halbu-danger"
									/>
								{/if}
							</span>
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="sidebar-nav__footer mt-auto border-t border-halbu-border pt-2">
		<Button
			variant="ghost"
			class={cn(
				"w-full justify-start rounded-none border-l-2 border-l-transparent px-2 py-1.5 text-[0.91rem]",
				settingsActive
					? "bg-halbu-panel2 border-l-halbu-primary text-halbu-text"
					: "text-halbu-text hover:bg-halbu-panel2"
			)}
			onclick={onSettings}
		>
			<SettingsIcon size={14} strokeWidth={2} />
			<span>Settings</span>
		</Button>
	</div>
</nav>
