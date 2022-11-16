import { githubLight } from "@uiw/codemirror-theme-github"
import { okaidia } from "@uiw/codemirror-theme-okaidia"

export const createCodeMirrorTheme = (darkMode: boolean) => {
    return darkMode ? okaidia : githubLight
}