import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react"
import "react-contexify/dist/ReactContexify.css"
import {
	Menu as ContextMenu,
	Item as ContextMenuItem,
	Separator as ContextMenuSeparator,
	Submenu as ContextMenuSubmenu,
	contextMenu,
	animation
} from "react-contexify"
import {
	Note as INote,
	trashNote,
	archiveNote,
	restoreNote,
	noteFavorite,
	notePinned,
	noteChangeType,
	NoteType,
	deleteNote,
	noteParticipantsAdd,
	createNote,
	notes as getNotes,
	editNoteContent
} from "../../lib/api"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import useIsMobile from "../../lib/hooks/useIsMobile"
import eventListener from "../../lib/eventListener"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import {
	safeAwait,
	downloadObjectAsTextWithExt,
	downloadObjectAsTextWithoutExt,
	getFileExt,
	generateRandomString,
	simpleDate
} from "../../lib/helpers"
import { IoChevronForward } from "react-icons/io5"
import {
	decryptNoteKeyParticipant,
	encryptNotePreview,
	encryptNoteContent,
	decryptNoteTitle,
	decryptNotePreview,
	encryptMetadata,
	encryptMetadataPublicKey,
	encryptNoteTitle
} from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { createNotePreviewFromContentText } from "./utils"
import { useNavigate } from "react-router-dom"
import useDb from "../../lib/hooks/useDb"
import striptags from "striptags"
import { Flex, Spinner } from "@chakra-ui/react"
import { v4 as uuidv4 } from "uuid"
import { getColor } from "../../styles/colors"

const ContextMenus = memo(({ setNotes }: { setNotes: React.Dispatch<React.SetStateAction<INote[]>> }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [selectedNote, setSelectedNote] = useState<INote | undefined>(undefined)
	const [content, setContent] = useState<string>("")
	const contentRef = useRef<string>("")
	const navigate = useNavigate()
	const [userId] = useDb("userId", 0)
	const [dupliating, setDuplicating] = useState<boolean>(false)

	const userHasWritePermissions = useMemo(() => {
		if (!selectedNote) {
			return false
		}

		return selectedNote.participants.filter(participant => participant.userId === userId && participant.permissionsWrite).length > 0
	}, [selectedNote, userId])

	const trash = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		const loadingToast = showToast("loading", "Moving note to trash", "bottom", 864000000)

		const [err] = await safeAwait(trashNote(selectedNote.uuid))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, trash: true, archive: false } : note)))
	}, [selectedNote])

	const archive = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		const loadingToast = showToast("loading", "Archiving note", "bottom", 864000000)

		const [err] = await safeAwait(archiveNote(selectedNote.uuid))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, archive: true, trash: false } : note)))
	}, [selectedNote])

	const restore = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		const loadingToast = showToast("loading", "Restoring note", "bottom", 864000000)

		const [err] = await safeAwait(restoreNote(selectedNote.uuid))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, archive: false, trash: false } : note)))
	}, [selectedNote])

	const favorite = useCallback(
		async (favorite: boolean) => {
			if (!selectedNote) {
				return
			}

			const loadingToast = showToast("loading", "Favoriting note", "bottom", 864000000)

			const [err] = await safeAwait(noteFavorite(selectedNote.uuid, favorite))

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, favorite } : note)))
		},
		[selectedNote]
	)

	const pinned = useCallback(
		async (pinned: boolean) => {
			if (!selectedNote) {
				return
			}

			const loadingToast = showToast("loading", "Pinning note", "bottom", 864000000)

			const [err] = await safeAwait(notePinned(selectedNote.uuid, pinned))

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, pinned } : note)))
		},
		[selectedNote]
	)

	const changeType = useCallback(
		async (type: NoteType) => {
			if (!selectedNote || type === selectedNote.type) {
				return
			}

			const loadingToast = showToast("loading", "Changing type", "bottom", 864000000)

			const userId = await db.get("userId")
			const privateKey = await db.get("privateKey")
			const noteKey = await decryptNoteKeyParticipant(
				selectedNote.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const preview = createNotePreviewFromContentText(contentRef.current, selectedNote.type)
			const contentEncrypted = await encryptNoteContent(contentRef.current, noteKey)
			const previewEncrypted = await encryptNotePreview(preview, noteKey)

			const [err] = await safeAwait(
				noteChangeType({ uuid: selectedNote.uuid, type, content: contentEncrypted, preview: previewEncrypted })
			)

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, type } : note)))

			eventListener.emit("refreshNoteContent", selectedNote.uuid)
		},
		[selectedNote]
	)

	const del = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		const loadingToast = showToast("loading", "Deleting note", "bottom", 864000000)

		const [err] = await safeAwait(deleteNote(selectedNote.uuid))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		setNotes(prev => prev.filter(note => note.uuid !== selectedNote.uuid))
		navigate("#/notes")
	}, [selectedNote])

	const exportText = useCallback(() => {
		if (!selectedNote || contentRef.current.length === 0) {
			return
		}

		let exportString = `${contentRef.current}`
		const ext = getFileExt(selectedNote.title)

		try {
			if (selectedNote.type === "rich") {
				exportString = striptags(exportString.split("<p><br></p>").join("\n"))
			}

			if (selectedNote.type === "checklist") {
				let list: string[] = []
				const ex = exportString
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
						list.push(listPointEx[0].trim())
					}
				}

				exportString = list.join("\n")
			}

			if (ext.length === 0) {
				downloadObjectAsTextWithExt(exportString, selectedNote.title.slice(0, 64), ext.length === 0 ? ".txt" : ext)
			} else {
				downloadObjectAsTextWithoutExt(exportString, selectedNote.title.slice(0, 64))
			}
		} catch (e) {
			console.error(e)

			if (ext.length === 0) {
				downloadObjectAsTextWithExt(contentRef.current, selectedNote.title.slice(0, 64), ext.length === 0 ? ".txt" : ext)
			} else {
				downloadObjectAsTextWithoutExt(contentRef.current, selectedNote.title.slice(0, 64))
			}
		}
	}, [selectedNote])

	const fetchNotes = useCallback(async () => {
		const privateKey = await db.get("privateKey")
		const userId = await db.get("userId")
		const notesRes = await getNotes()
		const notes: INote[] = []

		for (const note of notesRes) {
			const noteKey = await decryptNoteKeyParticipant(
				note.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const title = await decryptNoteTitle(note.title, noteKey)

			notes.push({
				...note,
				title,
				preview: note.preview.length === 0 ? title : await decryptNotePreview(note.preview, noteKey)
			})
		}

		return notes
	}, [])

	const duplicate = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		setDuplicating(true)

		const key = generateRandomString(32)
		const publicKey = await db.get("publicKey")
		const masterKeys = await db.get("masterKeys")
		const metadata = await encryptMetadata(JSON.stringify({ key }), masterKeys[masterKeys.length - 1])
		const ownerMetadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKey)
		const title = await encryptNoteTitle(selectedNote.title, key)
		const uuid = uuidv4()

		const [createErr] = await safeAwait(createNote({ uuid, metadata, title }))

		if (createErr) {
			console.error(createErr)

			setDuplicating(false)

			showToast("error", createErr.message, "bottom", 5000)

			return
		}

		const [addErr] = await safeAwait(
			noteParticipantsAdd({ uuid, metadata: ownerMetadata, contactUUID: "owner", permissionsWrite: true })
		)

		if (addErr) {
			console.error(addErr)

			setDuplicating(false)

			showToast("error", addErr.message, "bottom", 5000)

			return
		}

		const preview = createNotePreviewFromContentText(contentRef.current, selectedNote.type)
		const contentEncrypted = await encryptNoteContent(contentRef.current, key)
		const previewEncrypted = await encryptNotePreview(preview, key)

		const [changeTypeErr] = await safeAwait(
			noteChangeType({ uuid, type: selectedNote.type, content: contentEncrypted, preview: previewEncrypted })
		)

		if (changeTypeErr) {
			console.error(changeTypeErr)

			setDuplicating(false)

			showToast("error", changeTypeErr.message, "bottom", 5000)

			return
		}

		const [editErr] = await safeAwait(
			editNoteContent({
				uuid,
				preview: previewEncrypted,
				content: contentEncrypted,
				type: selectedNote.type
			})
		)

		if (editErr) {
			console.error(editErr)

			setDuplicating(false)

			showToast("error", editErr.message, "bottom", 5000)

			return
		}

		const [notesErr, notesRes] = await safeAwait(fetchNotes())

		if (notesErr) {
			console.error(notesErr)

			setDuplicating(false)

			showToast("error", notesErr.message, "bottom", 5000)

			return
		}

		setNotes(notesRes)
		navigate("#/notes/" + uuid)
		setDuplicating(false)
	}, [selectedNote])

	useEffect(() => {
		contentRef.current = content
	}, [content])

	useEffect(() => {
		const openNoteContextMenuListener = eventListener.on(
			"openNoteContextMenu",
			({ note, position, event }: { note: INote; position: { x: number; y: number }; event: KeyboardEvent }) => {
				setSelectedNote(note)

				contextMenu.show({
					id: "noteContextMenu",
					event,
					position
				})
			}
		)

		const noteContentChangedListener = eventListener.on("noteContentChanged", (data: { note: INote; content: string }) => {
			setContent(data.content)
		})

		return () => {
			openNoteContextMenuListener.remove()
			noteContentChangedListener.remove()
		}
	}, [])

	return (
		<>
			<ContextMenu
				id="noteContextMenu"
				animation={{
					enter: animation.fade,
					exit: false
				}}
				theme={darkMode ? "filendark" : "filenlight"}
			>
				{selectedNote && (
					<>
						{userHasWritePermissions && (
							<>
								<ContextMenuItem onClick={() => eventListener.emit("openNoteHistoryModal", selectedNote)}>
									History
								</ContextMenuItem>
								<ContextMenuSeparator />
							</>
						)}
						{userId === selectedNote.ownerId && (
							<>
								<ContextMenuItem onClick={() => eventListener.emit("openNoteAddParticipantModal", selectedNote)}>
									Participants
								</ContextMenuItem>
								<ContextMenuSeparator />
							</>
						)}
						{userHasWritePermissions && (
							<>
								<ContextMenuSubmenu
									label="Type"
									arrow={<IoChevronForward fontSize={16} />}
								>
									<ContextMenuItem onClick={() => changeType("text")}>Text</ContextMenuItem>
									<ContextMenuItem onClick={() => changeType("rich")}>Rich text</ContextMenuItem>
									<ContextMenuItem onClick={() => changeType("checklist")}>Checklist</ContextMenuItem>
									<ContextMenuItem onClick={() => changeType("md")}>Markdown</ContextMenuItem>
									<ContextMenuItem onClick={() => changeType("code")}>Code</ContextMenuItem>
								</ContextMenuSubmenu>
								<ContextMenuSeparator />
							</>
						)}
						{selectedNote.pinned ? (
							<ContextMenuItem onClick={() => pinned(false)}>Unpin</ContextMenuItem>
						) : (
							<ContextMenuItem onClick={() => pinned(true)}>Pin</ContextMenuItem>
						)}
						{selectedNote.favorite ? (
							<ContextMenuItem onClick={() => favorite(false)}>Unfavorite</ContextMenuItem>
						) : (
							<ContextMenuItem onClick={() => favorite(true)}>Favorite</ContextMenuItem>
						)}
						<ContextMenuItem onClick={() => duplicate()}>
							<Flex
								flexDirection="row"
								justifyContent="space-between"
								gap="25px"
								alignItems="center"
							>
								<Flex>Duplicate</Flex>
								{dupliating && (
									<Flex>
										<Spinner
											width="16px"
											height="16px"
											color={getColor(darkMode, "textPrimary")}
										/>
									</Flex>
								)}
							</Flex>
						</ContextMenuItem>
						<ContextMenuItem onClick={() => exportText()}>Export</ContextMenuItem>
						{userId === selectedNote.ownerId && <ContextMenuSeparator />}
						{!selectedNote.trash && userId === selectedNote.ownerId && (
							<ContextMenuItem onClick={() => trash()}>Trash</ContextMenuItem>
						)}
						{!selectedNote.archive && !selectedNote.trash && userId === selectedNote.ownerId && (
							<ContextMenuItem onClick={() => archive()}>Archive</ContextMenuItem>
						)}
						{(selectedNote.trash || selectedNote.archive) && userId === selectedNote.ownerId && (
							<ContextMenuItem onClick={() => restore()}>Restore</ContextMenuItem>
						)}
						{selectedNote.trash && userId === selectedNote.ownerId && (
							<>
								<ContextMenuSeparator />
								<ContextMenuItem onClick={() => del()}>Delete</ContextMenuItem>
							</>
						)}
					</>
				)}
			</ContextMenu>
		</>
	)
})

export default ContextMenus
