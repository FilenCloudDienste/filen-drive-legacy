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

	if (type === "checklist") {
		const ex = content
			.split('<ul data-checked="false">')
			.join("")
			.split('<ul data-checked="true">')
			.join("")
			.split("\n")
			.join("")
			.split("<li>")

		for (const listPoint of ex) {
			const listPointEx = listPoint.split("</li>")

			if (listPointEx[0].trim().length > 0) {
				return striptags(listPointEx[0].trim())
			}
		}

		return ""
	}

	return striptags(content.split("\n")[0]).slice(0, 128)
}
