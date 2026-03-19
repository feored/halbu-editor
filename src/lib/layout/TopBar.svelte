<script lang="ts">
	let { title = "Halbu Editor" } = $props<{
		title?: string;
	}>();
</script>

<div class="topbar flex w-full items-center justify-between gap-3">
	<div class="topbar__identity flex min-w-0 items-center">
		<div class="topbar__title-wrap min-w-0">
			<h2 class="topbar__title m-0 text-base font-bold tracking-label">{title}</h2>
		</div>
	</div>
</div>
