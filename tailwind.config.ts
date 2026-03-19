import type { Config } from "tailwindcss";

export default {
	content: ["./index.html", "./src/**/*.{svelte,js,ts}"],
	theme: {
		extend: {
			colors: {
				halbu: {
					bg: "rgb(var(--halbu-bg-rgb) / <alpha-value>)",
					panel: "rgb(var(--halbu-panel-rgb) / <alpha-value>)",
					panel2: "rgb(var(--halbu-panel2-rgb) / <alpha-value>)",
					card: "rgb(var(--halbu-card-rgb) / <alpha-value>)",
					border: "rgb(var(--halbu-border-rgb) / <alpha-value>)",
					borderStrong: "rgb(var(--halbu-border-strong-rgb) / <alpha-value>)",
					darkSidebar: "rgb(var(--halbu-dark-sidebar-rgb) / <alpha-value>)",
					darkInput: "rgb(var(--halbu-dark-input-rgb) / <alpha-value>)",

					text: "rgb(var(--halbu-text-rgb) / <alpha-value>)",
					textMuted: "rgb(var(--halbu-text-muted-rgb) / <alpha-value>)",
					textDim: "rgb(var(--halbu-text-dim-rgb) / <alpha-value>)",
					white: "rgb(var(--halbu-white-rgb) / <alpha-value>)",
					link: "rgb(var(--halbu-link-rgb) / <alpha-value>)",

					lightBg: "rgb(var(--halbu-light-bg-rgb) / <alpha-value>)",
					lightPanel: "rgb(var(--halbu-light-panel-rgb) / <alpha-value>)",
					lightPanel2: "rgb(var(--halbu-light-panel2-rgb) / <alpha-value>)",
					lightSecondaryBg: "rgb(var(--halbu-light-secondary-bg-rgb) / <alpha-value>)",
					lightBorder: "rgb(var(--halbu-light-border-rgb) / <alpha-value>)",
					lightBorderStrong: "rgb(var(--halbu-light-border-strong-rgb) / <alpha-value>)",
					lightText: "rgb(var(--halbu-light-text-rgb) / <alpha-value>)",
					lightTextMuted: "rgb(var(--halbu-light-text-muted-rgb) / <alpha-value>)",
					lightEmphasis: "rgb(var(--halbu-light-emphasis-rgb) / <alpha-value>)",

					primary: "rgb(var(--halbu-primary-rgb) / <alpha-value>)",
					primaryHover: "rgb(var(--halbu-primary-hover-rgb) / <alpha-value>)",
					primaryActive: "rgb(var(--halbu-primary-active-rgb) / <alpha-value>)",
					primarySoft: "rgb(var(--halbu-primary-rgb) / 0.18)",

					success: "rgb(var(--halbu-success-rgb) / <alpha-value>)",
					successSoft: "rgb(var(--halbu-success-rgb) / 0.14)",

					warning: "rgb(var(--halbu-warning-rgb) / <alpha-value>)",
					warningSoft: "rgb(var(--halbu-warning-rgb) / 0.18)",

					danger: "rgb(var(--halbu-danger-rgb) / <alpha-value>)",
					dangerHover: "rgb(var(--halbu-danger-hover-rgb) / <alpha-value>)",
					dangerActive: "rgb(var(--halbu-danger-active-rgb) / <alpha-value>)",
					dangerSoft: "rgb(var(--halbu-danger-rgb) / 0.14)",

					info: "rgb(var(--halbu-info-rgb) / <alpha-value>)",
					infoSoft: "rgb(var(--halbu-info-rgb) / 0.14)",
				},
			},

			boxShadow: {
				panel: "var(--app-soft-shadow)",
				focus: "var(--app-focus-ring)",
			},

			borderRadius: {
				xs: "2px",
				sm: "3px",
				md: "4px",
				lg: "5px",
				xl: "6px",
			},

			letterSpacing: {
				label: "0.02em",
			},

			lineHeight: {
				compact: "1.2",
			},

			fontSize: {
				"2xs": ["0.6875rem", { lineHeight: "1.4" }],
			},

			gridTemplateColumns: {
				"form-24": "6rem minmax(0,1fr)",
				"form-28": "7rem minmax(0,1fr)",
				"form-28-2": "7rem minmax(0,1fr) minmax(0,1fr)",
				"form-32": "8rem minmax(0,1fr)",
				"form-36": "9rem minmax(0,1fr)",
				"form-48": "12rem minmax(0,1fr)",
				skills: "minmax(0,2fr) minmax(20rem,1fr)",
			},
		},
	},
	plugins: [],
} satisfies Config;
