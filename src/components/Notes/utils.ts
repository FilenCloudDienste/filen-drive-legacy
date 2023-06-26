import striptags from "striptags"

export const createNotePreviewFromContentText = (content: string) => {
	if (content.length === 0) {
		return ""
	}

	return striptags(content.split("\n")[0]).slice(0, 128)
}
