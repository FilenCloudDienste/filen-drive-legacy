import { memo, useState, useMemo, useCallback, useEffect } from "react"
import { Flex, Spinner, Input, Tooltip } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import { Virtuoso } from "react-virtuoso"
import { IoIosAdd } from "react-icons/io"
import { Note as INote, createNote, noteParticipantsAdd, NoteTag } from "../../lib/api"
import { safeAwait, generateRandomString, getCurrentParent, simpleDate } from "../../lib/helpers"
import db from "../../lib/db"
import { encryptMetadata, encryptMetadataPublicKey, encryptNoteTitle } from "../../lib/worker/worker.com"
import { v4 as uuidv4, validate } from "uuid"
import { useNavigate } from "react-router-dom"
import { NotesSizes } from "./Notes"
import { Note, NoteSkeleton } from "./Note"
import { show as showToast } from "../Toast/Toast"
import useDb from "../../lib/hooks/useDb"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import useMeasure from "react-use-measure"
import Tag from "./Tag"
import { useLocalStorage } from "react-use"
import { fetchNotesAndTags, sortAndFilterNotes, sortAndFilterTags } from "./utils"

export const Sidebar = memo(
	({
		sizes,
		currentNote,
		notes,
		setNotes,
		search,
		setSearch,
		tags,
		setTags
	}: {
		sizes: NotesSizes
		currentNote: INote | undefined
		notes: INote[]
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
		search: string
		setSearch: React.Dispatch<React.SetStateAction<string>>
		tags: NoteTag[]
		setTags: React.Dispatch<React.SetStateAction<NoteTag[]>>
	}) => {
		const isMobile = useIsMobile()
		const windowHeight = useWindowHeight()
		const lang = useLang()
		const darkMode = useDarkMode()
		const [hoveringAdd, setHoveringAdd] = useState<boolean>(false)
		const [loading, setLoading] = useState<boolean>(true)
		const [creating, setCreating] = useState<boolean>(false)
		const navigate = useNavigate()
		const [tagsContainerRef, tagsContainerBounds] = useMeasure()
		const [activeTag, setActiveTag] = useDb("notesActiveTag", "")
		const [notesTagsContainerHeight, setNotesTagsContainerHeight] = useLocalStorage<number>(
			"notesTagsContainerHeight",
			tagsContainerBounds.height
		)
		const [userId] = useDb("userId", 0)

		const notesSorted = useMemo(() => {
			return sortAndFilterNotes(notes, search, activeTag)
		}, [notes, search, activeTag])

		const tagsSorted = useMemo(() => {
			return sortAndFilterTags(tags)
		}, [tags])

		const loadNotesAndTags = useCallback(async (refresh: boolean = false) => {
			const getItemsInDb = await db.get("notesAndTags", "notes")
			const hasItemsInDb =
				getItemsInDb &&
				getItemsInDb.notes &&
				getItemsInDb.tags &&
				Array.isArray(getItemsInDb.notes) &&
				Array.isArray(getItemsInDb.tags)

			if (!hasItemsInDb) {
				setLoading(true)
				setNotes([])
				setTags([])
			}

			const [err, res] = await safeAwait(fetchNotesAndTags(refresh))

			if (err) {
				console.error(err)

				setLoading(false)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			setNotes(res.notes)
			setTags(res.tags)
			setLoading(false)

			if (res.cache) {
				loadNotesAndTags(true)
			}
		}, [])

		const create = useCallback(async () => {
			setCreating(true)

			const key = generateRandomString(32)
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

				showToast("error", createErr.message, "bottom", 5000)

				return
			}

			const [addErr] = await safeAwait(
				noteParticipantsAdd({ uuid, metadata: ownerMetadata, contactUUID: "owner", permissionsWrite: true })
			)

			if (addErr) {
				console.error(addErr)

				setCreating(false)

				showToast("error", addErr.message, "bottom", 5000)

				return
			}

			const [notesAndTagsErr, notesAndTagsRes] = await safeAwait(fetchNotesAndTags(true))

			if (notesAndTagsErr) {
				console.error(notesAndTagsErr)

				setCreating(false)

				showToast("error", notesAndTagsErr.message, "bottom", 5000)

				return
			}

			setNotes(notesAndTagsRes.notes)
			setTags(notesAndTagsRes.tags)
			navigate("#/notes/" + uuid)
			setCreating(false)
		}, [])

		const itemContent = useCallback(
			(_: number, note: INote) => {
				return (
					<Note
						key={note.uuid}
						note={note}
						userId={userId}
					/>
				)
			},
			[userId]
		)

		useEffect(() => {
			db.set(
				"notesAndTags",
				{
					notes: sortAndFilterNotes(notesSorted, "", ""),
					tags: sortAndFilterTags(tagsSorted)
				},
				"notes"
			).catch(console.error)
		}, [notesSorted, tagsSorted])

		useEffect(() => {
			if (tagsContainerBounds.height > 0) {
				setNotesTagsContainerHeight(tagsContainerBounds.height)
			}
		}, [tagsContainerBounds.height])

		useEffect(() => {
			loadNotesAndTags()
		}, [])

		useEffect(() => {
			const socketEventListener = eventListener.on("socketEvent", (data: SocketEvent) => {
				if (data.type === "noteNew") {
					loadNotesAndTags(true)
				}
			})

			const refreshNotesListener = eventListener.on("refreshNotes", () => {
				loadNotesAndTags(true)
			})

			return () => {
				socketEventListener.remove()
				refreshNotesListener.remove()
			}
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
					<Tooltip
						label={i18n(lang, "newNote")}
						placement="left"
						borderRadius="5px"
						backgroundColor={getColor(darkMode, "backgroundSecondary")}
						boxShadow="md"
						color={getColor(darkMode, "textSecondary")}
						hasArrow={true}
						openDelay={300}
					>
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
								if (creating || loading) {
									return
								}

								create()
							}}
							cursor={loading ? "not-allowed" : "pointer"}
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
					</Tooltip>
				</Flex>
				{loading ? (
					<>
						<Flex
							height={windowHeight - 50 + "px"}
							width={sizes.notes + "px"}
							flexDirection="column"
							overflow="hidden"
						>
							{new Array(5).fill(1).map((_, index) => {
								return (
									<NoteSkeleton
										index={index}
										key={index}
									/>
								)
							})}
						</Flex>
					</>
				) : (
					<>
						<Flex
							width={sizes.notes + "px"}
							height="50px"
							flexDirection="row"
							justifyContent="space-between"
							alignItems="center"
							paddingLeft="15px"
							paddingRight="15px"
						>
							<Input
								backgroundColor={getColor(darkMode, "backgroundSecondary")}
								borderRadius="10px"
								height="30px"
								border="none"
								outline="none"
								shadow="none"
								marginTop="-12px"
								spellCheck={false}
								color={getColor(darkMode, "textPrimary")}
								placeholder={i18n(lang, "searchInput")}
								value={search}
								onChange={e => setSearch(e.target.value)}
								fontSize={14}
								disabled={notes.length === 0}
								_disabled={{
									color: getColor(darkMode, "textPrimary"),
									backgroundColor: getColor(darkMode, "backgroundSecondary"),
									cursor: "not-allowed"
								}}
								_placeholder={{
									color: getColor(darkMode, "textSecondary")
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
							/>
						</Flex>
						<Flex
							width={sizes.notes + "px"}
							maxWidth={sizes.notes + "px"}
							maxHeight={Math.round(windowHeight / 2) + "px"}
							overflowX="hidden"
							overflowY="auto"
							flexDirection="row"
							flexFlow="wrap"
							gap="5px"
							paddingLeft="15px"
							paddingRight="15px"
							paddingBottom="15px"
							borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
							ref={tagsContainerRef}
						>
							<Tag
								all={true}
								index={0}
								activeTag={activeTag}
								setActiveTag={setActiveTag}
							/>
							{tagsSorted.map((tag, index) => (
								<Tag
									tag={tag}
									key={tag.uuid}
									index={index + 1}
									activeTag={activeTag}
									setActiveTag={setActiveTag}
								/>
							))}
							<Tag
								add={true}
								index={Number.MAX_SAFE_INTEGER}
								activeTag={activeTag}
								setActiveTag={setActiveTag}
							/>
						</Flex>
						<Flex
							flexDirection="column"
							height={windowHeight - 100 - (notesTagsContainerHeight || 0) + "px"}
							width={sizes.notes}
						>
							{notesSorted.length > 0 ? (
								<Virtuoso
									data={notesSorted}
									height={windowHeight - 100 - (notesTagsContainerHeight || 0)}
									width={sizes.notes}
									itemContent={itemContent}
									computeItemKey={(_, item) => item.uuid}
									style={{
										overflowX: "hidden",
										overflowY: "auto",
										height: windowHeight - 100 - (notesTagsContainerHeight || 0) + "px",
										width: sizes.notes + "px"
									}}
								/>
							) : (
								<Flex
									justifyContent="center"
									alignItems="center"
									height={windowHeight - 100 - (notesTagsContainerHeight || 0) + "px"}
									width={sizes.notes}
									flexDirection="column"
								>
									{activeTag.length === 0 ? (
										<>
											<AppText
												darkMode={darkMode}
												isMobile={isMobile}
												noOfLines={1}
												wordBreak="break-all"
												color={getColor(darkMode, "textSecondary")}
												fontSize={16}
											>
												{i18n(lang, "notesCreateInfo")}
											</AppText>
											{creating ? (
												<Spinner
													width="16px"
													height="16px"
													color={getColor(darkMode, "textPrimary")}
													marginTop="4px"
												/>
											) : (
												<AppText
													darkMode={darkMode}
													isMobile={isMobile}
													noOfLines={1}
													wordBreak="break-all"
													color={getColor(darkMode, "linkPrimary")}
													fontSize={14}
													cursor="pointer"
													_hover={{
														textDecoration: "underline"
													}}
													onClick={() => create()}
												>
													{i18n(lang, "notesCreate")}
												</AppText>
											)}
										</>
									) : (
										<AppText
											darkMode={darkMode}
											isMobile={isMobile}
											noOfLines={1}
											wordBreak="break-all"
											color={getColor(darkMode, "textSecondary")}
											fontSize={16}
										>
											{i18n(lang, "notesNoNotesFoundUnderTag")}
										</AppText>
									)}
								</Flex>
							)}
						</Flex>
					</>
				)}
			</Flex>
		)
	}
)

export default Sidebar
