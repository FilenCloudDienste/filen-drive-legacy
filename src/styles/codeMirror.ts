import memoize from "lodash/memoize"
import { createTheme } from "@uiw/codemirror-themes"
import { tags as t } from "@lezer/highlight"
import { getColor } from "./colors"

export const createCodeMirrorTheme = memoize((darkMode: boolean) => {
	return createTheme({
		theme: darkMode ? "dark" : "light",
		settings: {
			background: getColor(darkMode, "backgroundPrimary"),
			foreground: getColor(darkMode, "textPrimary"),
			caret: getColor(darkMode, "textPrimary"),
			selection: getColor(darkMode, "blue"),
			selectionMatch: getColor(darkMode, "backgroundTertiary"),
			lineHighlight: getColor(darkMode, "backgroundSecondary"),
			gutterBackground: getColor(darkMode, "backgroundPrimary"),
			gutterForeground: getColor(darkMode, "textSecondary")
		},
		styles: darkMode
			? [
					{ tag: [t.standard(t.tagName), t.tagName], color: "#7ee787" },
					{ tag: [t.comment, t.bracket], color: "#8b949e" },
					{ tag: [t.className, t.propertyName], color: "#d2a8ff" },
					{ tag: [t.variableName, t.attributeName, t.number, t.operator], color: "#79c0ff" },
					{ tag: [t.keyword, t.typeName, t.typeOperator, t.typeName], color: "#ff7b72" },
					{ tag: [t.string, t.meta, t.regexp], color: "#a5d6ff" },
					{ tag: [t.name, t.quote], color: "#7ee787" },
					{ tag: [t.heading], color: "#d2a8ff", fontWeight: "bold" },
					{ tag: [t.emphasis], color: "#d2a8ff", fontStyle: "italic" },
					{ tag: [t.deleted], color: "#ffdcd7", backgroundColor: "ffeef0" },
					{ tag: [t.atom, t.bool, t.special(t.variableName)], color: "#ffab70" },
					{ tag: t.link, textDecoration: "underline" },
					{ tag: t.strikethrough, textDecoration: "line-through" },
					{ tag: t.invalid, color: "#f97583" }
			  ]
			: [
					{ tag: [t.standard(t.tagName), t.tagName], color: "#116329" },
					{ tag: [t.comment, t.bracket], color: "#6a737d" },
					{ tag: [t.className, t.propertyName], color: "#6f42c1" },
					{ tag: [t.variableName, t.attributeName, t.number, t.operator], color: "#005cc5" },
					{ tag: [t.keyword, t.typeName, t.typeOperator, t.typeName], color: "#d73a49" },
					{ tag: [t.string, t.meta, t.regexp], color: "#032f62" },
					{ tag: [t.name, t.quote], color: "#22863a" },
					{ tag: [t.heading], color: "#24292e", fontWeight: "bold" },
					{ tag: [t.emphasis], color: "#24292e", fontStyle: "italic" },
					{ tag: [t.deleted], color: "#b31d28", backgroundColor: "ffeef0" },
					{ tag: [t.atom, t.bool, t.special(t.variableName)], color: "#e36209" },
					{ tag: [t.url, t.escape, t.regexp, t.link], color: "#032f62" },
					{ tag: t.link, textDecoration: "underline" },
					{ tag: t.strikethrough, textDecoration: "line-through" },
					{ tag: t.invalid, color: "#cb2431" }
			  ]
	})
})

export const createCodeMirrorThemeNotesText = memoize((darkMode: boolean) => {
	return createTheme({
		theme: darkMode ? "dark" : "light",
		settings: {
			background: getColor(darkMode, "backgroundPrimary"),
			foreground: getColor(darkMode, "textPrimary"),
			caret: getColor(darkMode, "textPrimary"),
			selection: getColor(darkMode, "blue"),
			selectionMatch: "transparent",
			lineHighlight: "transparent",
			gutterBackground: "transparent",
			gutterForeground: "transparent"
		},
		styles: [
			{ tag: t.comment, color: "transparent" },
			{ tag: t.variableName, color: "transparent" },
			{ tag: [t.string, t.special(t.brace)], color: "transparent" },
			{ tag: t.number, color: "transparent" },
			{ tag: t.bool, color: "transparent" },
			{ tag: t.null, color: "transparent" },
			{ tag: t.keyword, color: "transparent" },
			{ tag: t.operator, color: "transparent" },
			{ tag: t.className, color: "transparent" },
			{ tag: t.definition(t.typeName), color: "transparent" },
			{ tag: t.typeName, color: "transparent" },
			{ tag: t.angleBracket, color: "transparent" },
			{ tag: t.tagName, color: "transparent" },
			{ tag: t.attributeName, color: "transparent" }
		]
	})
})
