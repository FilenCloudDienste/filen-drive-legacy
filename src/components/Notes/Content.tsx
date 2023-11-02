import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Flex, Skeleton } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote, editNoteContent, NoteType } from "../../lib/api"
import {
	safeAwait,
	randomStringUnsafe,
	getRandomArbitrary,
	Semaphore,
	SemaphoreProps,
	getCurrentParent,
	formatBytes
} from "../../lib/helpers"
import db from "../../lib/db"
import { decryptNoteContent, encryptNoteContent, encryptNotePreview, decryptNoteKeyParticipant } from "../../lib/worker/worker.com"
import debounce from "lodash/debounce"
import { createNotePreviewFromContentText, fetchNoteContent } from "./utils"
import eventListener from "../../lib/eventListener"
import { NotesSizes } from "./Notes"
import Editor from "./Editor"
import Topbar from "./Topbar"
import { SocketEvent } from "../../lib/services/socket"
import useDb from "../../lib/hooks/useDb"
import { useNavigate } from "react-router-dom"
import { show as showToast } from "../Toast/Toast"
import { MAX_NOTE_SIZE } from "../../lib/constants"
import { i18n } from "../../i18n"

export const ContentSkeleton = memo(() => {
	const isMobile = useIsMobile()
	const darkMode = useDarkMode()

	return (
		<Flex
			flexDirection="row"
			width="100%"
			marginBottom="10px"
		>
			<Skeleton
				startColor={getColor(darkMode, "backgroundSecondary")}
				endColor={getColor(darkMode, "backgroundTertiary")}
				borderRadius="10px"
				height="20px"
				boxShadow="sm"
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "textPrimary")}
					fontSize={16}
				>
					{randomStringUnsafe(getRandomArbitrary(10, 100))}
				</AppText>
			</Skeleton>
		</Flex>
	)
})

export const Content = memo(
	({
		sizes,
		currentNote,
		setNotes,
		lang
	}: {
		sizes: NotesSizes
		currentNote: INote | undefined
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
		lang: string
	}) => {
		const windowHeight = useWindowHeight()
		const [content, setContent] = useState<string>("")
		const [contentType, setContentType] = useState<NoteType | undefined>(undefined)
		const [loading, setLoading] = useState<boolean>(true)
		const prevContent = useRef<string>("")
		const [synced, setSynced] = useState<{ title: boolean; content: boolean }>({ title: true, content: true })
		const lastContentFetchUUID = useRef<string>("")
		const saveMutex = useRef<SemaphoreProps>(new Semaphore(1)).current
		const contentRef = useRef<string>("")
		const [userId] = useDb("userId", 0)
		const currentNoteRef = useRef<INote | undefined>(currentNote)
		const navigate = useNavigate()

		const userHasWritePermissions = useMemo(() => {
			if (!currentNote) {
				return false
			}

			return currentNote.participants.filter(participant => participant.userId === userId && participant.permissionsWrite).length > 0
		}, [currentNote, userId])

		const loadNoteContent = useCallback(async (refresh: boolean = false) => {
			if (!currentNoteRef.current) {
				return
			}

			const startURL = window.location.href

			const [cache, type] = await Promise.all([
				db.get("noteContent:" + currentNoteRef.current.uuid, "notes"),
				db.get("noteType:" + currentNoteRef.current.uuid, "notes")
			])
			const hasCache = cache && type && typeof cache === "string" && typeof type === "string"

			if (!hasCache) {
				setLoading(true)
				setContent("")
				setContentType("text")
				setSynced(prev => ({ ...prev, content: false, title: false }))
			}

			const [contentErr, contentRes] = await safeAwait(fetchNoteContent(currentNoteRef.current, refresh))

			if (contentErr) {
				console.error(contentErr)

				setLoading(false)

				if (contentErr.toString().toLowerCase().indexOf("note not found") !== -1) {
					navigate("/#/notes")
				}

				return
			}

			if (window.location.href !== startURL) {
				return
			}

			prevContent.current = contentRes.content

			setContentType(contentRes.type)
			setContent(contentRes.content)
			setSynced(prev => ({ ...prev, content: true, title: true }))
			setLoading(false)

			eventListener.emit("noteContentChanged", { note: currentNoteRef.current, content: contentRes.content })

			if (contentRes.cache) {
				loadNoteContent(true)
			}
		}, [])

		const save = useCallback(async () => {
			await saveMutex.acquire()

			const newContent = `${contentRef.current}`

			try {
				const userId = await db.get("userId")

				if (
					!currentNoteRef.current ||
					currentNoteRef.current.participants.filter(participant => participant.userId === userId && participant.permissionsWrite)
						.length === 0 ||
					getCurrentParent(window.location.href) !== currentNoteRef.current.uuid ||
					JSON.stringify(newContent) === JSON.stringify(prevContent.current)
				) {
					saveMutex.release()

					setSynced(prev => ({ ...prev, content: true }))

					return
				}

				setSynced(prev => ({ ...prev, content: false }))

				const privateKey = await db.get("privateKey")
				const noteKey = await decryptNoteKeyParticipant(
					currentNoteRef.current.participants.filter(participant => participant.userId === userId)[0].metadata,
					privateKey
				)
				const preview = createNotePreviewFromContentText(newContent, currentNoteRef.current.type)
				const [contentEncrypted, previewEncrypted] = await Promise.all([
					encryptNoteContent(newContent, noteKey),
					encryptNotePreview(preview, noteKey)
				])

				if (contentEncrypted.length >= MAX_NOTE_SIZE) {
					showToast("error", i18n(lang, "noteTooBig", true, ["__MAXSIZE__"], [formatBytes(MAX_NOTE_SIZE)]), "bottom", 5000)

					saveMutex.release()

					setSynced(prev => ({ ...prev, content: false }))

					return
				}

				await editNoteContent({
					uuid: currentNoteRef.current.uuid,
					preview: previewEncrypted,
					content: contentEncrypted,
					type: currentNoteRef.current.type
				})

				prevContent.current = newContent

				setSynced(prev => ({ ...prev, content: true }))
				setNotes(prev =>
					prev.map(note =>
						currentNoteRef.current && note.uuid === currentNoteRef.current.uuid
							? { ...note, editedTimestamp: Date.now(), preview }
							: note
					)
				)

				await Promise.all([
					newContent.length < 128 * 1024
						? db.set("noteContent:" + currentNoteRef.current.uuid, newContent, "notes")
						: Promise.resolve(),
					db.set("noteType:" + currentNoteRef.current.uuid, currentNoteRef.current.type, "notes")
				]).catch(console.error)
			} catch (e: any) {
				console.error(e)

				showToast("error", e.toString(), "bottom", 5000)
			}

			saveMutex.release()
		}, [lang])

		const debouncedSave = useCallback(debounce(save, 2000), [])

		const windowOnKeyDownListener = useCallback((e: KeyboardEvent) => {
			if (e.which === 83 && (e.ctrlKey || e.metaKey)) {
				e.preventDefault()

				setSynced(prev => ({ ...prev, content: false }))

				save()
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
			contentRef.current = content

			debouncedSave()

			eventListener.emit("noteContentChanged", { note: currentNote, content })
		}, [content])

		useEffect(() => {
			if (currentNote && lastContentFetchUUID.current !== currentNote.uuid) {
				lastContentFetchUUID.current = currentNote.uuid

				loadNoteContent()
				;(async () => {
					await saveMutex.acquire()

					setTimeout(() => {
						saveMutex.release()
					}, 250)
				})()
			}

			const refreshNoteContentListener = eventListener.on("refreshNoteContent", (uuid: string) => {
				if (currentNote && uuid === currentNote.uuid && getCurrentParent(window.location.href) === uuid) {
					loadNoteContent(true)
				}
			})

			const socketEventListener = eventListener.on("socketEvent", async (data: SocketEvent) => {
				try {
					if (data.type === "noteContentEdited" && currentNote) {
						const userId = await db.get("userId")

						if (
							data.data.note === currentNote.uuid &&
							getCurrentParent(window.location.href) === data.data.note &&
							userId !== data.data.editorId
						) {
							const privateKey = await db.get("privateKey")
							const noteKey = await decryptNoteKeyParticipant(
								currentNote.participants.filter(participant => participant.userId === userId)[0].metadata,
								privateKey
							)
							const contentDecrypted = await decryptNoteContent(data.data.content, noteKey)
							const preview = createNotePreviewFromContentText(contentDecrypted, currentNote.type)

							prevContent.current = contentDecrypted

							setContent(contentDecrypted)
							setContentType(data.data.type)

							eventListener.emit("noteContentChanged", { note: currentNote, content: contentDecrypted })

							setNotes(prev =>
								prev.map(n =>
									n.uuid === data.data.note
										? {
												...n,
												editedTimestamp: data.data.editedTimestamp,
												type: data.data.type,
												preview
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
				refreshNoteContentListener.remove()
				socketEventListener.remove()
			}
		}, [currentNote])

		return (
			<Flex
				width={sizes.note + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<Topbar
					sizes={sizes}
					currentNote={currentNote}
					setNotes={setNotes}
					synced={synced}
					setSynced={setSynced}
				/>
				<Flex
					width={sizes.note + "px"}
					height={windowHeight - 50 + "px"}
					flexDirection="column"
				>
					{loading ? (
						<Flex
							overflow="hidden"
							width={sizes.note + "px"}
							height={windowHeight - 50 + "px"}
							flexDirection="column"
							paddingLeft="15px"
							paddingRight="15px"
							paddingBottom="15px"
							paddingTop="15px"
						>
							{new Array(20).fill(1).map((_, index) => {
								return <ContentSkeleton key={index} />
							})}
						</Flex>
					) : (
						<>
							{currentNote && contentType && (
								<Editor
									width={sizes.note}
									height={windowHeight - 60}
									content={content}
									setContent={setContent}
									currentNote={currentNote}
									type={contentType}
									onBlur={() => save()}
									showMarkdownPreview={true}
									onContentChange={() => {
										setSynced(prev => ({ ...prev, content: false }))
									}}
									canEdit={userHasWritePermissions}
								/>
							)}
						</>
					)}
				</Flex>
			</Flex>
		)
	}
)

export default Content
