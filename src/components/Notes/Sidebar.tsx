import { memo, useState, useMemo, useCallback, useEffect } from "react"
import { Flex, Spinner } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import { Virtuoso } from "react-virtuoso"
import { IoIosAdd } from "react-icons/io"
import { Note as INote, notes as getNotes, createNote, noteParticipantAdd } from "../../lib/api"
import { safeAwait, generateRandomString, getCurrentParent, simpleDate } from "../../lib/helpers"
import db from "../../lib/db"
import {
	encryptMetadata,
	encryptMetadataPublicKey,
	decryptNotePreview,
	decryptNoteTitle,
	encryptNoteTitle,
	decryptNoteKeyParticipant
} from "../../lib/worker/worker.com"
import { v4 as uuidv4, validate } from "uuid"
import { useNavigate } from "react-router-dom"
import { NotesSizes } from "./Notes"
import Note from "./Note"

export const Sidebar = memo(
	({
		sizes,
		currentNote,
		notes,
		setNotes
	}: {
		sizes: NotesSizes
		currentNote: INote | undefined
		notes: INote[]
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
	}) => {
		const isMobile = useIsMobile()
		const windowHeight = useWindowHeight()
		const lang = useLang()
		const darkMode = useDarkMode()
		const [hoveringAdd, setHoveringAdd] = useState<boolean>(false)
		const [loading, setLoading] = useState<boolean>(true)
		const [creating, setCreating] = useState<boolean>(false)
		const navigate = useNavigate()

		const notesSorted = useMemo(() => {
			return notes.sort((a, b) => {
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
		}, [notes])

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

		const loadNotes = useCallback(async (showLoader: boolean = true) => {
			setLoading(showLoader)

			const [notesErr, notesRes] = await safeAwait(fetchNotes())

			if (notesErr) {
				console.error(notesErr)

				setLoading(false)

				return
			}

			setNotes(notesRes)
			setLoading(false)
		}, [])

		const create = useCallback(async () => {
			setCreating(true)

			const key = generateRandomString(32)
			const userId = await db.get("userId")
			const publicKey = await db.get("publicKey")
			const masterKeys = await db.get("masterKeys")
			const metadata = await encryptMetadata(JSON.stringify({ key }), masterKeys[masterKeys.length - 1])
			const ownerMetadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKey)
			const title = await encryptNoteTitle(simpleDate(Date.now()), key)
			const uuid = uuidv4()

			const [createErr] = await safeAwait(createNote({ uuid, metadata, title }))

			if (createErr) {
				console.error(createErr)

				setCreating(false)

				return
			}

			const [addErr] = await safeAwait(noteParticipantAdd({ uuid, metadata: ownerMetadata, userId, permissionsWrite: true }))

			const [notesErr, notesRes] = await safeAwait(fetchNotes())

			if (notesErr) {
				console.error(notesErr)

				setCreating(false)

				return
			}

			setNotes(notesRes)
			navigate("#/notes/" + uuid)
			setCreating(false)
		}, [])

		const itemContent = useCallback((index: number, note: INote) => {
			return (
				<Note
					key={note.uuid}
					note={note}
				/>
			)
		}, [])

		useEffect(() => {
			loadNotes()
		}, [])

		useEffect(() => {
			if (notesSorted.length > 0 && !validate(getCurrentParent(location.hash))) {
				navigate("#/notes/" + notesSorted[0].uuid)
			}
		}, [notesSorted, location.hash])

		return (
			<Flex
				width={sizes.notes + "px"}
				borderRight={"1px solid " + getColor(darkMode, "borderSecondary")}
				flexDirection="column"
				overflow="hidden"
				height={windowHeight + "px"}
			>
				<Flex
					width={sizes.notes + "px"}
					height="50px"
					flexDirection="row"
					justifyContent="space-between"
					alignItems="center"
					paddingLeft="15px"
					paddingRight="15px"
					borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textPrimary")}
						fontSize={18}
					>
						{i18n(lang, "notes")}
					</AppText>
					<Flex
						backgroundColor={hoveringAdd ? getColor(darkMode, "backgroundSecondary") : undefined}
						width="32px"
						height="32px"
						padding="4px"
						borderRadius="full"
						justifyContent="center"
						alignItems="center"
						onMouseEnter={() => setHoveringAdd(true)}
						onMouseLeave={() => setHoveringAdd(false)}
						onClick={() => {
							if (creating) {
								return
							}

							create()
						}}
						cursor="pointer"
					>
						{creating ? (
							<Spinner
								width="16px"
								height="16px"
								color={getColor(darkMode, "textSecondary")}
							/>
						) : (
							<IoIosAdd
								size={24}
								color={hoveringAdd ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								cursor="pointer"
								style={{
									flexShrink: 0
								}}
							/>
						)}
					</Flex>
				</Flex>
				{loading ? (
					<></>
				) : (
					<Virtuoso
						data={notesSorted}
						height={windowHeight - 50}
						width={sizes.notes}
						itemContent={itemContent}
						totalCount={notesSorted.length}
						overscan={8}
						style={{
							overflowX: "hidden",
							overflowY: "auto"
						}}
					/>
				)}
			</Flex>
		)
	}
)

export default Sidebar
