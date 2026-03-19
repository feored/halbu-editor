<script>
	import { clsx } from "clsx";
	import { twMerge } from "tailwind-merge";

	const BASE =
		"inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-halbu-primary/45 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-100";

	const VARIANTS = {
		default:
			"bg-halbu-primary text-halbu-white hover:bg-halbu-primaryHover active:bg-halbu-primaryActive disabled:bg-halbu-panel2 disabled:text-halbu-textDim",
		secondary:
			"border border-halbu-border bg-halbu-panel text-halbu-text hover:bg-halbu-panel2 active:bg-halbu-panel2 disabled:border-halbu-borderStrong disabled:bg-halbu-panel2 disabled:text-halbu-textDim",
		outline:
			"border border-halbu-borderStrong bg-transparent text-halbu-text hover:bg-halbu-primarySoft disabled:border-halbu-border disabled:bg-halbu-panel disabled:text-halbu-textDim",
		destructive:
			"bg-halbu-danger text-halbu-text hover:bg-halbu-dangerHover active:bg-halbu-dangerActive disabled:bg-halbu-panel2 disabled:text-halbu-textDim",
		ghost: "text-halbu-text hover:bg-halbu-primarySoft disabled:text-halbu-textDim disabled:bg-halbu-panel",
	};

	const SIZES = {
		default: "h-8 px-3 py-1.5",
		sm: "h-7 px-2.5 text-2xs",
		lg: "h-9 px-4",
		icon: "h-8 w-8",
	};

	let {
		variant = "default",
		size = "default",
		class: className = "",
		type = "button",
		children,
		...rest
	} = $props();

	const resolvedVariant = $derived(VARIANTS[variant] ?? VARIANTS.default);
	const resolvedSize = $derived(SIZES[size] ?? SIZES.default);
	const resolvedType = $derived(type === "submit" || type === "reset" ? type : "button");
</script>

<button
	type={resolvedType}
	class={twMerge(clsx(BASE, resolvedVariant, resolvedSize, className))}
	{...rest}
>
	{@render children?.()}
</button>
