import striptags from "striptags"
import { NoteType } from "../../lib/api"

export const createNotePreviewFromContentText = (content: string, type: NoteType) => {
	if (content.length === 0) {
		return ""
	}

	if (type === "rich") {
		if (content.indexOf("<p><br></p>") === -1) {
			return striptags(content.split("\n")[0]).slice(0, 128)
		}

		return striptags(content.split("<p><br></p>")[0]).slice(0, 128)
	}

	return striptags(content.split("\n")[0]).slice(0, 128)
}
