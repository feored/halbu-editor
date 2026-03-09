<script>
	import { cn } from "../../../utils/cn";

	const BASE =
		"inline-flex items-center rounded-full border border-halbu-borderStrong/70 px-2 py-0.5 text-[11px] font-semibold tracking-wide";

	const VARIANTS = {
		default: "bg-halbu-panel2/80 text-halbu-text",
		secondary: "bg-halbu-card/80 text-halbu-textMuted",
		success: "bg-halbu-successSoft text-halbu-success border-halbu-success/40",
		warning: "bg-halbu-warningSoft text-halbu-warning border-halbu-warning/40",
		danger: "bg-halbu-dangerSoft text-halbu-danger border-halbu-danger/40",
	};

	let {
		variant = "default",
		class: className = "",
		children,
		...rest
	} = $props();

	const resolvedVariant = $derived(VARIANTS[variant] ?? VARIANTS.default);
</script>

<span class={cn(BASE, resolvedVariant, className)} {...rest}>
	{@render children?.()}
</span>
