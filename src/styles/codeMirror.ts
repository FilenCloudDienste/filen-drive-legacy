import { githubLight } from "@uiw/codemirror-theme-github"
import { okaidia } from "@uiw/codemirror-theme-okaidia"
import { memoize } from "lodash"

export const createCodeMirrorTheme = memoize((darkMode: boolean) => {
	return darkMode ? okaidia : githubLight
})
