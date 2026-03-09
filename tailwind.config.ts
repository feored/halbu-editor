import type { Config } from "tailwindcss";

export default {
	content: ["./index.html", "./src/**/*.{svelte,js,ts}"],
	theme: {
		extend: {
			colors: {
				halbu: {
					bg: "#141414",
					panel: "#1b1b1b",
					panel2: "#232323",
					card: "#2b2b2b",
					border: "#3d3d3d",
					borderStrong: "#565656",
					darkSidebar: "#181818",
					darkInput: "#121212",

					text: "#ececec",
					textMuted: "#b2b2b2",
					textDim: "#7f7f7f",
					white: "#ffffff",
					link: "#8ecff0",

					lightBg: "#f4f4f4",
					lightPanel: "#ffffff",
					lightPanel2: "#efefef",
					lightSecondaryBg: "#e7e7e7",
					lightBorder: "#d0d0d0",
					lightBorderStrong: "#bdbdbd",
					lightText: "#1c1c1c",
					lightTextMuted: "#666666",
					lightEmphasis: "#101010",

					primary: "#2ea3e6",
					primaryHover: "#248fc9",
					primaryActive: "#1d74a3",
					primarySoft: "rgba(46,163,230,0.18)",

					success: "#4fa36d",
					successSoft: "rgba(79,163,109,0.14)",

					warning: "#e3b562",
					warningSoft: "rgba(227,181,98,0.18)",

					danger: "#d9534f",
					dangerHover: "#c5423e",
					dangerActive: "#a73532",
					dangerSoft: "rgba(217,83,79,0.14)",

					info: "#67bde9",
					infoSoft: "rgba(46,163,230,0.14)",
				},
			},

			boxShadow: {
				panel: "0 8px 22px rgba(0,0,0,0.20)",
				focus: "0 0 0 3px rgba(46,163,230,0.24)",
			},

			borderRadius: {
				xs: "2px",
				sm: "4px",
				md: "6px",
				lg: "8px",
				xl: "10px",
				xl2: "8px",
			},
		},
	},
	plugins: [],
} satisfies Config;
