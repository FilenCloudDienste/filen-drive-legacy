import { memo, useMemo, useRef, useState, useEffect, useCallback } from "react"
import "react-contexify/dist/ReactContexify.css"
import "../../styles/contexify.css"
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
	editNoteContent,
	deleteNote
} from "../../lib/api"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import useIsMobile from "../../lib/hooks/useIsMobile"
import eventListener from "../../lib/eventListener"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { safeAwait } from "../../lib/helpers"
import { IoChevronForward } from "react-icons/io5"

const ContextMenus = memo(
	({ setNotes, currentNote }: { setNotes: React.Dispatch<React.SetStateAction<INote[]>>; currentNote: INote | undefined }) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const lang = useLang()
		const [selectedNote, setSelectedNote] = useState<INote | undefined>(undefined)

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

				const [err] = await safeAwait(noteChangeType(selectedNote.uuid, type))

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
		}, [selectedNote])

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

			return () => {
				openNoteContextMenuListener.remove()
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
							<ContextMenuItem onClick={() => eventListener.emit("openNoteHistoryModal", selectedNote)}>
								History
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuSubmenu
								label="Type"
								arrow={<IoChevronForward fontSize={16} />}
							>
								<ContextMenuItem onClick={() => changeType("text")}>Text</ContextMenuItem>
								<ContextMenuItem onClick={() => changeType("rich")}>Rich text</ContextMenuItem>
								<ContextMenuItem onClick={() => changeType("md")}>Markdown</ContextMenuItem>
								<ContextMenuItem onClick={() => changeType("code")}>Code</ContextMenuItem>
							</ContextMenuSubmenu>
							<ContextMenuSeparator />
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
							<ContextMenuSeparator />
							{!selectedNote.trash && <ContextMenuItem onClick={() => trash()}>Trash</ContextMenuItem>}
							{!selectedNote.archive && !selectedNote.trash && (
								<ContextMenuItem onClick={() => archive()}>Archive</ContextMenuItem>
							)}
							{(selectedNote.trash || selectedNote.archive) && (
								<ContextMenuItem onClick={() => restore()}>Restore</ContextMenuItem>
							)}
							{selectedNote.trash && (
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
	}
)

export default ContextMenus
