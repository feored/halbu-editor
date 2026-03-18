<script lang="ts">
	import { clsx, type ClassValue } from "clsx";
	import { AlertCircleIcon, SettingsIcon } from "lucide-svelte";
	import { twMerge } from "tailwind-merge";
	import Button from "$lib/components/ui/button/button.svelte";

	type SidebarItem = {
		id: string;
		label: string;
		dividerBefore?: boolean;
		disabled?: boolean;
		saveBlocked?: boolean;
	};

	let {
		title = "",
		items = [],
		activeId = null,
		libraryActive = false,
		newCharacterActive = false,
		settingsActive = false,
		onSelect,
		onLibrary,
		onNewCharacter,
		onSettings,
	} = $props<{
		title?: string;
		items?: SidebarItem[];
		activeId?: string | null;
		libraryActive?: boolean;
		newCharacterActive?: boolean;
		settingsActive?: boolean;
		onSelect?: (itemId: string) => void;
		onLibrary?: () => void;
		onNewCharacter?: () => void;
		onSettings?: () => void;
	}>();

	function mergeClasses(...inputs: ClassValue[]): string {
		return twMerge(clsx(inputs));
	}
</script>

<nav class="sidebar-nav flex h-full min-h-0 flex-col">
	<div class="sidebar-nav__library mb-2 border-b border-halbu-border pb-2">
		<h1
			class="sidebar-nav__title m-0 px-1.5 py-0.5 text-xs font-semibold tracking-[0.02em] text-halbu-textDim"
		>
			CHARACTERS
		</h1>
		<div class="grid gap-1">
			<Button
				variant="ghost"
				class={mergeClasses(
					"w-full justify-start rounded-none border-l-2 border-l-transparent px-2 py-1.5 text-sm",
					libraryActive
						? "bg-halbu-panel2 border-l-halbu-primary text-halbu-text"
						: "text-halbu-text hover:bg-halbu-panel2",
				)}
				onclick={onLibrary}
			>
				<span>Library</span>
			</Button>
			<Button
				variant="ghost"
				class={mergeClasses(
					"w-full justify-start rounded-none border-l-2 border-l-transparent px-2 py-1.5 text-sm",
					newCharacterActive
						? "bg-halbu-panel2 border-l-halbu-primary text-halbu-text"
						: "text-halbu-text hover:bg-halbu-panel2",
				)}
				onclick={onNewCharacter}
			>
				<span>New Character</span>
			</Button>
		</div>
	</div>

	{#if items.length > 0}
		<div class="sidebar-nav__main flex min-h-0 flex-col gap-2">
			{#if title.length > 0}
				<h1
					class="sidebar-nav__title m-0 px-1.5 py-0.5 text-xs font-semibold tracking-[0.02em] text-halbu-textDim"
				>
					{title}
				</h1>
			{:else}
				<h1
					class="sidebar-nav__title m-0 px-1.5 py-0.5 text-xs font-semibold tracking-[0.02em] text-halbu-textDim"
				>
					SECTIONS
				</h1>
			{/if}

			<ul class="sidebar-nav__list m-0 grid list-none gap-1 p-0">
				{#each items as item (item.id)}
					{#if item.dividerBefore === true}
						<li class="mt-1.5 border-t border-halbu-border pt-1.5">
							<h2
								class="sidebar-nav__title m-0 px-1.5 py-0.5 text-xs font-semibold tracking-[0.02em] text-halbu-textDim"
							>
								OVERVIEW
							</h2>
						</li>
					{/if}
					<li class="min-w-0">
						<Button
							variant="ghost"
							class={mergeClasses(
								"w-full justify-start rounded-none border-l-2 border-l-transparent px-2 py-1.5 text-sm hover:bg-halbu-panel2 hover:text-halbu-text",
								activeId === item.id &&
									"bg-halbu-panel2 border-l-halbu-primary text-halbu-text",
							)}
							disabled={item.disabled === true}
							onclick={() => onSelect(item.id)}
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
			class={mergeClasses(
				"w-full justify-start rounded-none border-l-2 border-l-transparent px-2 py-1.5 text-sm",
				settingsActive
					? "bg-halbu-panel2 border-l-halbu-primary text-halbu-text"
					: "text-halbu-text hover:bg-halbu-panel2",
			)}
			onclick={onSettings}
		>
			<SettingsIcon size={14} strokeWidth={2} />
			<span>Settings</span>
		</Button>
	</div>
</nav>
