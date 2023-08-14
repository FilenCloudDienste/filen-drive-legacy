import striptags from "striptags"
import { NoteType, notes as getNotes, notesTags as getTags, Note as INote, NoteTag, noteContent } from "../../lib/api"
import db from "../../lib/db"
import {
	decryptNoteKeyParticipant,
	decryptNoteTitle,
	decryptNoteTagName,
	decryptNotePreview,
	decryptNoteContent
} from "../../lib/worker/worker.com"

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

export const fetchNotesAndTags = async (skipCache: boolean = false): Promise<{ cache: boolean; notes: INote[]; tags: NoteTag[] }> => {
	const refresh = async (): Promise<{ cache: boolean; notes: INote[]; tags: NoteTag[] }> => {
		const [privateKey, userId, masterKeys, notesRes, tagsRes] = await Promise.all([
			db.get("privateKey"),
			db.get("userId"),
			db.get("masterKeys"),
			getNotes(),
			getTags()
		])

		const notes: INote[] = []
		const tags: NoteTag[] = []
		const promises: Promise<void>[] = []

		for (const note of notesRes) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						const noteKey = await decryptNoteKeyParticipant(
							note.participants.filter(participant => participant.userId === userId)[0].metadata,
							privateKey
						)
						const title = await decryptNoteTitle(note.title, noteKey)
						const preview = note.preview.length === 0 ? title : await decryptNotePreview(note.preview, noteKey)
						const tags: NoteTag[] = []

						for (const tag of note.tags) {
							const tagName = await decryptNoteTagName(tag.name, masterKeys)

							tags.push({
								...tag,
								name: tagName
							})
						}

						notes.push({
							...note,
							title: striptags(title),
							preview: striptags(preview),
							tags
						})
					} catch (e) {
						reject(e)

						return
					}

					resolve()
				})
			)
		}

		for (const tag of tagsRes) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						const name = await decryptNoteTagName(tag.name, masterKeys)

						if (name.length > 0) {
							tags.push({
								...tag,
								name: striptags(name)
							})
						}
					} catch (e) {
						reject(e)

						return
					}

					resolve()
				})
			)
		}

		await Promise.all(promises)

		console.log(notes, tags)

		await db.set(
			"notesAndTags",
			{
				notes: sortAndFilterNotes(notes, "", ""),
				tags: sortAndFilterTags(tags)
			},
			"notes"
		)

		cleanupLocalDb(notes, tags).catch(console.error)

		return {
			cache: false,
			notes,
			tags
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache: { notes: INote[]; tags: NoteTag[] } = await db.get("notesAndTags", "notes")

	if (cache) {
		return {
			cache: true,
			notes: sortAndFilterNotes(cache.notes, "", ""),
			tags: sortAndFilterTags(cache.tags)
		}
	}

	return await refresh()
}

export const sortAndFilterTags = (tags: NoteTag[]) => {
	return tags.sort((a, b) => {
		if (a.favorite !== b.favorite) {
			return b.favorite ? 1 : -1
		}

		return b.editedTimestamp - a.editedTimestamp
	})
}

export const sortAndFilterNotes = (notes: INote[], search: string, activeTag: string) => {
	const filtered = notes
		.sort((a, b) => {
			if (a.pinned !== b.pinned) {
				return b.pinned ? 1 : -1
			}

			if (a.trash !== b.trash && a.archive === false) {
				return a.trash ? 1 : -1
			}

			if (a.archive !== b.archive) {
				return a.archive ? 1 : -1
			}

			if (a.trash !== b.trash) {
				return a.trash ? 1 : -1
			}

			return b.editedTimestamp - a.editedTimestamp
		})
		.filter(note => {
			if (search.length === 0) {
				return true
			}

			if (note.title.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			if (note.preview.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			return false
		})

	if (activeTag.length > 0) {
		return filtered.filter(note => note.tags.map(t => t.uuid).includes(activeTag))
	}

	return filtered
}

export const fetchNoteContent = async (
	note: INote,
	skipCache: boolean = false
): Promise<{ cache: boolean; content: string; type: NoteType }> => {
	const refresh = async (): Promise<{ cache: boolean; content: string; type: NoteType }> => {
		const result = await noteContent(note.uuid)
		let content = ""

		if (result.content.length === 0) {
			if (result.type === "checklist") {
				content = '<ul data-checked="false"><li><br></li></ul>'
			} else {
				content = ""
			}

			await Promise.all([db.set("noteContent:" + note.uuid, content, "notes"), db.set("noteType:" + note.uuid, result.type, "notes")])

			return {
				cache: false,
				content,
				type: result.type
			}
		}

		const [userId, privateKey] = await Promise.all([db.get("userId"), db.get("privateKey")])
		const me = note.participants.filter(participant => participant.userId === userId)

		if (!me || me.length === 0) {
			throw new Error("Could not find user not participant")
		}

		const noteKey = await decryptNoteKeyParticipant(me[0].metadata, privateKey)
		const contentDecrypted = await decryptNoteContent(result.content, noteKey)

		if (
			result.type === "checklist" &&
			(contentDecrypted === "" || contentDecrypted.indexOf("<ul data-checked") === -1 || contentDecrypted === "<p><br></p>")
		) {
			content = '<ul data-checked="false"><li><br></li></ul>'
		} else {
			content = contentDecrypted
		}

		await Promise.all([db.set("noteContent:" + note.uuid, content, "notes"), db.set("noteType:" + note.uuid, result.type, "notes")])

		return {
			cache: false,
			content,
			type: result.type
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const [cache, type] = await Promise.all([db.get("noteContent:" + note.uuid, "notes"), db.get("noteType:" + note.uuid, "notes")])

	if (cache) {
		return {
			cache: true,
			content: cache,
			type
		}
	}

	return await refresh()
}

export const cleanupLocalDb = async (notes: INote[], tags: NoteTag[]) => {
	const keys = await db.keys("notes")

	const existingNoteUUIDs: string[] = notes.map(n => n.uuid)
	const existingTagsUUDs: string[] = tags.map(t => t.uuid)

	for (const key of keys) {
		if (key.startsWith("noteContent:") || key.startsWith("noteType:")) {
			const noteUUID = key.split(":")[1]

			if (!existingNoteUUIDs.includes(noteUUID)) {
				await db.remove(key, "notes")
			}
		}
	}
}
