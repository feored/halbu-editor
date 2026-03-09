<script>
	import { cn } from "../../../utils/cn";

	let {
		orientation = "horizontal",
		class: className = "",
		...rest
	} = $props();

	const isVertical = $derived(orientation === "vertical");
</script>

<div
	class={cn(
		"shrink-0 bg-halbu-borderStrong/70",
		isVertical ? "h-full w-px" : "h-px w-full",
		className
	)}
	{...rest}
></div>
