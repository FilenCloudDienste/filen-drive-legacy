import { memo, useState, useCallback, useEffect, useRef } from "react"
import { Flex, Skeleton } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote, noteContent, editNoteContent, NoteType } from "../../lib/api"
import { safeAwait, randomStringUnsafe, getRandomArbitrary, Semaphore, SemaphoreProps } from "../../lib/helpers"
import db from "../../lib/db"
import {
	decryptNoteContent,
	encryptNoteContent,
	encryptNotePreview,
	decryptNoteKeyParticipant,
	bufferToHash
} from "../../lib/worker/worker.com"
import { debounce } from "lodash"
import { createNotePreviewFromContentText } from "./utils"
import eventListener from "../../lib/eventListener"
import { NotesSizes } from "./Notes"
import Editor from "./Editor"
import Title from "./Title"

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
		const isMobile = useIsMobile()
		const lang = useLang()
		const darkMode = useDarkMode()
		const [content, setContent] = useState<string>("")
		const [contentType, setContentType] = useState<NoteType | undefined>(undefined)
		const [loading, setLoading] = useState<boolean>(true)
		const prevContent = useRef<string>("")
		const [saving, setSaving] = useState<boolean>(false)
		const lastContentFetchUUID = useRef<string>("")
		const saveMutex = useRef<SemaphoreProps>(new Semaphore(1)).current
		const contentRef = useRef<string>("")

		const loadContent = useCallback(
			async (showLoader: boolean = true) => {
				if (!currentNote) {
					return
				}

				setLoading(showLoader)

				const [contentErr, contentRes] = await safeAwait(noteContent(currentNote.uuid))

				if (contentErr) {
					console.error(contentErr)

					setLoading(false)

					return
				}

				setContentType(contentRes.type)

				if (contentRes.content.length === 0) {
					prevContent.current = ""

					setContent("")
					setLoading(false)

					return
				}

				const userId = await db.get("userId")
				const privateKey = await db.get("privateKey")
				const noteKey = await decryptNoteKeyParticipant(
					currentNote.participants.filter(participant => participant.userId === userId)[0].metadata,
					privateKey
				)
				const contentDecrypted = await decryptNoteContent(contentRes.content, noteKey)

				prevContent.current = contentDecrypted

				setContent(contentDecrypted)
				setLoading(false)
			},
			[currentNote]
		)

		const save = useCallback(async () => {
			await saveMutex.acquire()

			if (!currentNote || JSON.stringify(contentRef.current) === JSON.stringify(prevContent.current)) {
				saveMutex.release()

				return
			}

			setSaving(true)

			const userId = await db.get("userId")
			const privateKey = await db.get("privateKey")
			const noteKey = await decryptNoteKeyParticipant(
				currentNote.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const preview = createNotePreviewFromContentText(contentRef.current)
			const contentEncrypted = await encryptNoteContent(contentRef.current, noteKey)
			const previewEncrypted = await encryptNotePreview(preview, noteKey)

			await editNoteContent({
				uuid: currentNote.uuid,
				preview: previewEncrypted,
				content: contentEncrypted,
				type: currentNote.type
			})

			prevContent.current = contentRef.current

			setSaving(false)
			setNotes(prev => prev.map(note => (note.uuid === currentNote.uuid ? { ...note, editedTimestamp: Date.now(), preview } : note)))

			saveMutex.release()
		}, [currentNote])

		const debouncedSave = useCallback(debounce(save, 3000), [])

		useEffect(() => {
			contentRef.current = content

			debouncedSave()
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

			return () => {
				refreshNoteContentListener.remove()
			}
		}, [currentNote])

		return (
			<Flex
				width={sizes.note + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<Flex
					width={sizes.note + "px"}
					height="40px"
					flexDirection="row"
					borderBottom={"1px solid " + getColor(darkMode, "borderPrimary")}
					alignItems="center"
					paddingLeft="15px"
					paddingRight="15px"
				>
					{currentNote ? (
						<Title
							currentNote={currentNote}
							setNotes={setNotes}
						/>
					) : (
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
								fontSize={15}
							>
								{randomStringUnsafe(getRandomArbitrary(10, 50))}
							</AppText>
						</Skeleton>
					)}
				</Flex>
				<Flex
					width={sizes.note + "px"}
					height={windowHeight - 40 + "px"}
					flexDirection="column"
				>
					{loading ? (
						<Flex
							overflow="hidden"
							width={sizes.note + "px"}
							height={windowHeight - 40 + "px"}
							flexDirection="column"
							paddingLeft="15px"
							paddingRight="15px"
							paddingBottom="15px"
							paddingTop="15px"
						>
							{new Array(getRandomArbitrary(15, 30)).fill(1).map((_, index) => {
								return <ContentSkeleton key={index} />
							})}
						</Flex>
					) : (
						<>
							{currentNote && contentType && (
								<Editor
									width={sizes.note}
									height={windowHeight - 50}
									content={content}
									setContent={setContent}
									currentNote={currentNote}
									type={contentType}
									onBlur={() => save()}
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
