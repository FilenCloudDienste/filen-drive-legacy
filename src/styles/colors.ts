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

const colors: any = {
	light: {
		textPrimary: "#060607",
		textSecondary: "#313338",
		textTertiary: "#585a61",
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
		brown: "rgba(162, 132, 94, 1)"
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
		brown: "rgba(162, 132, 94, 1)"
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
