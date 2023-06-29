import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Flex, Skeleton } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote, noteContent, editNoteContent, NoteType } from "../../lib/api"
import { safeAwait, randomStringUnsafe, getRandomArbitrary, Semaphore, SemaphoreProps, getCurrentParent } from "../../lib/helpers"
import db from "../../lib/db"
import { decryptNoteContent, encryptNoteContent, encryptNotePreview, decryptNoteKeyParticipant } from "../../lib/worker/worker.com"
import { debounce } from "lodash"
import { createNotePreviewFromContentText } from "./utils"
import eventListener from "../../lib/eventListener"
import { NotesSizes } from "./Notes"
import Editor from "./Editor"
import Topbar from "./Topbar"
import { SocketEvent } from "../../lib/services/socket"
import useDb from "../../lib/hooks/useDb"

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
		setNotes
	}: {
		sizes: NotesSizes
		currentNote: INote | undefined
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
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

		const userHasWritePermissions = useMemo(() => {
			if (!currentNote) {
				return false
			}

			return currentNote.participants.filter(participant => participant.userId === userId && participant.permissionsWrite).length > 0
		}, [currentNote, userId])

		const loadContent = useCallback(async (showLoader: boolean = true) => {
			if (!currentNoteRef.current) {
				return
			}

			setLoading(showLoader)

			const [contentErr, contentRes] = await safeAwait(noteContent(currentNoteRef.current.uuid))

			if (contentErr) {
				console.error(contentErr)

				setLoading(false)

				return
			}

			setContentType(contentRes.type)
			setSynced({ content: true, title: true })

			if (contentRes.content.length === 0) {
				if (currentNoteRef.current.type === "checklist") {
					prevContent.current = '<ul data-checked="false"><li><br></li></ul>'
					contentRef.current = '<ul data-checked="false"><li><br></li></ul>'

					setContent('<ul data-checked="false"><li><br></li></ul>')
				} else {
					prevContent.current = ""
					contentRef.current = ""

					setContent("")
				}

				setLoading(false)

				eventListener.emit("noteContentChanged", { note: currentNoteRef.current, content: "" })

				return
			}

			const userId = await db.get("userId")
			const privateKey = await db.get("privateKey")
			const noteKey = await decryptNoteKeyParticipant(
				currentNoteRef.current.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const contentDecrypted = await decryptNoteContent(contentRes.content, noteKey)

			if (
				currentNoteRef.current.type === "checklist" &&
				(contentDecrypted === "" || contentDecrypted.indexOf("<ul data-checked") === -1 || contentDecrypted === "<p><br></p>")
			) {
				prevContent.current = '<ul data-checked="false"><li><br></li></ul>'
				contentRef.current = '<ul data-checked="false"><li><br></li></ul>'

				setContent('<ul data-checked="false"><li><br></li></ul>')
			} else {
				prevContent.current = contentDecrypted
				contentRef.current = contentDecrypted

				setContent(contentDecrypted)
			}

			setLoading(false)

			eventListener.emit("noteContentChanged", { note: currentNoteRef.current, content: contentDecrypted })
		}, [])

		const save = useCallback(async () => {
			const newContent = `${contentRef.current}`

			await saveMutex.acquire()

			const userId = await db.get("userId")

			if (
				!currentNoteRef.current ||
				currentNoteRef.current.participants.filter(participant => participant.userId === userId && participant.permissionsWrite)
					.length === 0 ||
				getCurrentParent(window.location.href) !== currentNoteRef.current.uuid ||
				(JSON.stringify(newContent) === JSON.stringify(prevContent.current) && newContent.length === prevContent.current.length)
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
			const contentEncrypted = await encryptNoteContent(newContent, noteKey)
			const previewEncrypted = await encryptNotePreview(preview, noteKey)

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

			saveMutex.release()
		}, [])

		const debouncedSave = useCallback(debounce(save, 1000), [])

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

				loadContent()
			}

			const refreshNoteContentListener = eventListener.on("refreshNoteContent", (uuid: string) => {
				if (currentNote && uuid === currentNote.uuid) {
					loadContent()
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
