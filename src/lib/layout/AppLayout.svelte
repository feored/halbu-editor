<script>
	let {
		showSidebar = true,
		showTopbar = true,
		topbar,
		sidebar,
		children,
	} = $props();
</script>

<div class="app-layout flex h-dvh min-h-0 flex-col">
	{#if showTopbar}
		<header class="app-layout__top relative z-[2] flex min-h-11 items-center px-3 py-1.5">
			{@render topbar?.()}
		</header>
	{/if}

	<div class="app-layout__body relative z-[1] flex min-h-0 flex-1">
		{#if showSidebar}
			<aside class="app-layout__sidebar h-full w-[16.8rem] flex-none">
				{@render sidebar?.()}
			</aside>
		{/if}
		<main class="app-layout__content min-w-0 flex-1 overflow-auto">
			{@render children?.()}
		</main>
	</div>
</div>
