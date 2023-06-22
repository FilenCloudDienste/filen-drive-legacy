export const createNotePreviewFromContentText = (content: string) => {
	if (content.length === 0) {
		return ""
	}

	return content.split("\n")[0].slice(0, 128)
}
