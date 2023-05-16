export type Color =
	| "textPrimary"
	| "textSecondary"
	| "backgroundPrimary"
	| "backgroundSecondary"
	| "backgroundTertiary"
	| "borderPrimary"
	| "borderSecondary"
	| "borderActive"
	| "linkPrimary"
	| "dragSelect"
	| "red"
	| "orange"
	| "yellow"
	| "green"
	| "mint"
	| "teal"
	| "cyan"
	| "blue"
	| "indigo"
	| "purple"
	| "pink"
	| "brown"
	| "v2_gray"
	| "v2_gray2"
	| "v2_gray3"
	| "v2_gray4"
	| "v2_gray5"
	| "v2_gray6"
	| "v2_label"
	| "v2_secondaryLabel"
	| "v2_tertiaryLabel"
	| "v2_quaternaryLabel"
	| "v2_systemFill"
	| "v2_secondarySystemFill"
	| "v2_tertiarySystemFill"
	| "v2_quaternarySystemFill"
	| "v2_placeholderText"
	| "v2_systemBackground"
	| "v2_secondarySystemBackground"
	| "v2_tertiarySystemBackground"
	| "v2_systemGroupedBackground"
	| "v2_secondarySystemGroupedBackground"
	| "v2_tertiarySystemGroupedBackground"
	| "v2_separator"
	| "v2_opaqueSeparator"
	| "v2_link"
	| "v2_red"
	| "v2_orange"
	| "v2_yellow"
	| "v2_green"
	| "v2_mint"
	| "v2_teal"
	| "v2_cyan"
	| "v2_blue"
	| "v2_indigo"
	| "v2_purple"
	| "v2_pink"
	| "v2_brown"

const colors: any = {
	light: {
		textPrimary: "#000000",
		textSecondary: "#282828",
		backgroundPrimary: "#FFFFFF",
		backgroundSecondary: "#f0f0f0",
		backgroundTertiary: "#FAFAFA",
		borderPrimary: "rgba(0, 0, 0, 0.09)",
		borderSecondary: "rgba(0, 0, 0, 0.09)",
		borderActive: "rgba(0, 0, 0, 0.3)",
		linkPrimary: "#2997ff",
		dragSelect: "rgb(21, 21, 21, 0.15)",
		red: "rgba(255, 59, 48, 1)",
		orange: "rgba(255, 149, 0, 1)",
		yellow: "rgba(255, 204, 0, 1)",
		green: "rgba(52, 199, 89, 1)",
		mint: "rgba(0, 199, 190, 1)",
		teal: "rgba(48, 176, 199, 1)",
		cyan: "rgba(50, 173, 230, 1)",
		blue: "rgba(0, 122, 255, 1)",
		indigo: "rgba(88, 86, 214, 1)",
		purple: "rgba(175, 82, 222, 1)",
		pink: "rgba(255, 45, 85, 1)",
		brown: "rgba(162, 132, 94, 1)",
		v2_gray: "",
		v2_gray2: "",
		v2_gray3: "",
		v2_gray4: "",
		v2_gray5: "",
		v2_gray6: "",
		v2_label: "",
		v2_secondaryLabel: "",
		v2_tertiaryLabel: "",
		v2_quaternaryLabel: "",
		v2_systemFill: "",
		v2_secondarySystemFill: "",
		v2_tertiarySystemFill: "",
		v2_quaternarySystemFill: "",
		v2_placeholderText: "",
		v2_systemBackground: "",
		v2_secondarySystemBackground: "",
		v2_tertiarySystemBackground: "",
		v2_systemGroupedBackground: "",
		v2_secondarySystemGroupedBackground: "",
		v2_tertiarySystemGroupedBackground: "",
		v2_separator: "",
		v2_opaqueSeparator: "",
		v2_link: "",
		v2_red: "",
		v2_orange: "",
		v2_yellow: "",
		v2_green: "",
		v2_mint: "",
		v2_teal: "",
		v2_cyan: "",
		v2_blue: "",
		v2_indigo: "",
		v2_purple: "",
		v2_pink: "",
		v2_brown: ""
	},
	dark: {
		textPrimary: "#ffffff",
		textSecondary: "#959595",
		backgroundPrimary: "#050505",
		backgroundSecondary: "#141414",
		backgroundTertiary: "#1d1d1d",
		borderPrimary: "rgba(255, 255, 255, 0.07)",
		borderSecondary: "rgba(255, 255, 255, 0.07)",
		borderActive: "rgba(255, 255, 255, 0.28)",
		linkPrimary: "#2997ff",
		dragSelect: "rgb(21, 21, 21, 0.5)",
		red: "rgba(255, 59, 48, 1)",
		orange: "rgba(255, 149, 0, 1)",
		yellow: "rgba(255, 204, 0, 1)",
		green: "rgba(52, 199, 89, 1)",
		mint: "rgba(0, 199, 190, 1)",
		teal: "rgba(48, 176, 199, 1)",
		cyan: "rgba(50, 173, 230, 1)",
		blue: "rgba(0, 122, 255, 1)",
		indigo: "rgba(88, 86, 214, 1)",
		purple: "rgba(175, 82, 222, 1)",
		pink: "rgba(255, 45, 85, 1)",
		brown: "rgba(162, 132, 94, 1)",
		v2_gray: "#8e8e93",
		v2_gray2: "#636366",
		v2_gray3: "#48484a",
		v2_gray4: "#3a3a3c",
		v2_gray5: "#2c2c2e",
		v2_gray6: "#1c1c1e",
		v2_label: "#ffffff",
		v2_secondaryLabel: "#f3f3f8",
		v2_tertiaryLabel: "#f8f8fc",
		v2_quaternaryLabel: "#fbfbfd",
		v2_systemFill: "#ceced1",
		v2_secondarySystemFill: "#d3d3d6",
		v2_tertiarySystemFill: "#dedee1",
		v2_quaternarySystemFill: "#e6e6e8",
		v2_placeholderText: "#f8f8fc",
		v2_systemBackground: "#000000",
		v2_secondarySystemBackground: "#1c1c1e",
		v2_tertiarySystemBackground: "#2c2c2e",
		v2_systemGroupedBackground: "#000000",
		v2_secondarySystemGroupedBackground: "#1c1c1e",
		v2_tertiarySystemGroupedBackground: "#2c2c2e",
		v2_separator: "#98989b",
		v2_opaqueSeparator: "#38383a",
		v2_link: "#0b84ff",
		v2_red: "#ff453a",
		v2_orange: "#ff9f0a",
		v2_yellow: "#ffd60a",
		v2_green: "#30d158",
		v2_mint: "#66d4cf",
		v2_teal: "#40c8e0",
		v2_cyan: "#64D2FF",
		v2_blue: "#0A84FF",
		v2_indigo: "#5e5ce6",
		v2_purple: "#bf5af2",
		v2_pink: "#ff375f",
		v2_brown: "#AC8E68"
	}
}

export const mainGradient = {
	a: "#7928CA",
	b: "#FF0080"
}

export const getColor = (darkMode: boolean, type: Color): string => {
	if (!colors[darkMode ? "dark" : "light"][type]) {
		return darkMode ? "white" : "black"
	}

	return colors[darkMode ? "dark" : "light"][type]
}

export default colors
