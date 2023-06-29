import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Input } from "@chakra-ui/react"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import { Note as INote, editNoteTitle } from "../../lib/api"
import db from "../../lib/db"
import { encryptNoteTitle, decryptNoteKeyParticipant, decryptNoteTitle } from "../../lib/worker/worker.com"
import { debounce } from "lodash"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import { getCurrentParent, Semaphore, SemaphoreProps } from "../../lib/helpers"
import useDb from "../../lib/hooks/useDb"

export const Title = memo(
	({
		currentNote,
		setNotes,
		setSynced
	}: {
		currentNote: INote | undefined
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
		setSynced: React.Dispatch<React.SetStateAction<{ title: boolean; content: boolean }>>
	}) => {
		const darkMode = useDarkMode()
		const [title, setTitle] = useState<string>("")
		const titleRef = useRef<string>("")
		const startTitle = useRef<string | undefined>(undefined)
		const [userId] = useDb("userId", 0)
		const currentNoteRef = useRef<INote | undefined>(currentNote)
		const editMutex = useRef<SemaphoreProps>(new Semaphore(1)).current

		const userHasWritePermissions = useMemo(() => {
			if (!currentNote) {
				return false
			}

			return currentNote.participants.filter(participant => participant.userId === userId && participant.permissionsWrite).length > 0
		}, [currentNote, userId])

		const editTitle = useCallback(async () => {
			await editMutex.acquire()

			const userId = await db.get("userId")

			if (
				!currentNoteRef.current ||
				JSON.stringify(startTitle.current) === JSON.stringify(titleRef.current) ||
				getCurrentParent(window.location.href) !== currentNoteRef.current.uuid
			) {
				editMutex.release()

				setSynced(prev => ({ ...prev, title: true }))

				return
			}

			setSynced(prev => ({ ...prev, title: false }))

			const privateKey = await db.get("privateKey")
			const noteKey = await decryptNoteKeyParticipant(
				currentNoteRef.current.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const titleEncrypted = await encryptNoteTitle(titleRef.current, noteKey)

			await editNoteTitle(currentNoteRef.current.uuid, titleEncrypted)

			startTitle.current = titleRef.current

			setSynced(prev => ({ ...prev, title: true }))

			editMutex.release()
		}, [])

		const debouncedSave = useCallback(debounce(editTitle, 1000), [])

		const windowOnKeyDownListener = useCallback((e: KeyboardEvent) => {
			if (e.which === 83 && (e.ctrlKey || e.metaKey)) {
				e.preventDefault()

				setSynced(prev => ({ ...prev, title: false }))

				editTitle()
			}
		}, [])

		useEffect(() => {
			window.addEventListener("keydown", windowOnKeyDownListener)

			return () => {
				window.removeEventListener("keydown", windowOnKeyDownListener)
			}
		}, [])

		useEffect(() => {
			currentNoteRef.current = currentNote
		}, [currentNote])

		useEffect(() => {
			if (currentNote) {
				setTitle(currentNote.title)
			}

			const socketEventListener = eventListener.on("socketEvent", async (data: SocketEvent) => {
				try {
					if (data.type === "noteTitleEdited" && currentNote) {
						if (data.data.note === currentNote.uuid && getCurrentParent(window.location.href) === data.data.note) {
							const userId = await db.get("userId")
							const privateKey = await db.get("privateKey")
							const noteKey = await decryptNoteKeyParticipant(
								currentNote.participants.filter(participant => participant.userId === userId)[0].metadata,
								privateKey
							)
							const titleDecrypted = await decryptNoteTitle(data.data.title, noteKey)

							setTitle(titleDecrypted)

							startTitle.current = titleRef.current

							eventListener.emit("noteTitleChanged", { note: currentNote, title: titleDecrypted })

							setNotes(prev =>
								prev.map(n =>
									n.uuid === data.data.note
										? {
												...n,
												editedTimestamp: Date.now(),
												title: titleDecrypted
										  }
										: n
								)
							)
						}
					}
				} catch (e) {
					console.error(e)
				}
			})

			return () => {
				socketEventListener.remove()
			}
		}, [currentNote])

		useEffect(() => {
			titleRef.current = title

			if (typeof startTitle.current === "undefined") {
				startTitle.current = title
			}
		}, [title])

		return (
			<Input
				value={title}
				onChange={e => {
					if (!userHasWritePermissions) {
						return
					}

					if (currentNote) {
						setSynced(prev => ({ ...prev, title: false }))
						setNotes(prev => prev.map(note => (note.uuid === currentNote.uuid ? { ...note, title: e.target.value } : note)))
					}

					debouncedSave()
				}}
				onBlur={() => {
					if (!userHasWritePermissions) {
						return
					}

					editTitle()
				}}
				onKeyDown={e => {
					if (e.key === "Enter" && userHasWritePermissions) {
						editTitle()
					}
				}}
				disabled={!userHasWritePermissions}
				cursor={userHasWritePermissions ? "text" : "default"}
				autoFocus={false}
				spellCheck={false}
				border="none"
				borderRadius="0px"
				color={getColor(darkMode, "textPrimary")}
				_placeholder={{
					color: getColor(darkMode, "textSecondary")
				}}
				placeholder="Note title"
				paddingLeft="0px"
				paddingRight="0px"
				margin="0px"
				outline="none"
				shadow="none"
				_disabled={{
					color: getColor(darkMode, "textPrimary")
				}}
				_hover={{
					shadow: "none",
					outline: "none"
				}}
				_active={{
					shadow: "none",
					outline: "none"
				}}
				_focus={{
					shadow: "none",
					outline: "none"
				}}
				_highlighted={{
					shadow: "none",
					outline: "none"
				}}
				fontSize={16}
				height="100%"
			/>
		)
	}
)

export default Title
