import { githubLight } from "@uiw/codemirror-theme-github"
import { okaidia } from "@uiw/codemirror-theme-okaidia"
import { memoize } from "lodash"
import { createTheme } from "@uiw/codemirror-themes"
import { tags as t } from "@lezer/highlight"
import { getColor } from "./colors"

export const createCodeMirrorTheme = memoize((darkMode: boolean) => {
	return darkMode ? okaidia : githubLight
})

export const createCodeMirrorThemeNotesText = memoize((darkMode: boolean) => {
	return createTheme({
		theme: "dark",
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
			{ tag: t.comment, color: "#787b8099" },
			{ tag: t.variableName, color: "#0080ff" },
			{ tag: [t.string, t.special(t.brace)], color: "#5c6166" },
			{ tag: t.number, color: "#5c6166" },
			{ tag: t.bool, color: "#5c6166" },
			{ tag: t.null, color: "#5c6166" },
			{ tag: t.keyword, color: "#5c6166" },
			{ tag: t.operator, color: "#5c6166" },
			{ tag: t.className, color: "#5c6166" },
			{ tag: t.definition(t.typeName), color: "#5c6166" },
			{ tag: t.typeName, color: "#5c6166" },
			{ tag: t.angleBracket, color: "#5c6166" },
			{ tag: t.tagName, color: "#5c6166" },
			{ tag: t.attributeName, color: "#5c6166" }
		]
	})
})
