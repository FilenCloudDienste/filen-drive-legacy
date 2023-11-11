import { memo, useState, useEffect, useCallback, useMemo } from "react"
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
	noteParticipantsAdd,
	createNote,
	editNoteContent,
	noteHistory,
	NoteTag,
	notesTag,
	notesUntag,
	notesTagsFavorite
} from "../../lib/api"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import eventListener from "../../lib/eventListener"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { safeAwait, downloadObjectAsTextWithExt, downloadObjectAsTextWithoutExt, getFileExt, generateRandomString } from "../../lib/helpers"
import { IoChevronForward } from "react-icons/io5"
import {
	decryptNoteKeyParticipant,
	encryptNotePreview,
	encryptNoteContent,
	encryptMetadata,
	encryptMetadataPublicKey,
	encryptNoteTitle,
	decryptNoteContent
} from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { createNotePreviewFromContentText, sortAndFilterTags, fetchNoteContent } from "./utils"
import { useNavigate } from "react-router-dom"
import useDb from "../../lib/hooks/useDb"
import striptags from "striptags"
import { Flex, Spinner } from "@chakra-ui/react"
import { v4 as uuidv4 } from "uuid"
import { getColor } from "../../styles/colors"
import { i18n } from "../../i18n"

const ContextMenus = memo(
	({
		setNotes,
		tags,
		setTags
	}: {
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
		tags: NoteTag[]
		setTags: React.Dispatch<React.SetStateAction<NoteTag[]>>
	}) => {
		const darkMode = useDarkMode()
		const lang = useLang()
		const [selectedNote, setSelectedNote] = useState<INote | undefined>(undefined)
		const navigate = useNavigate()
		const [userId] = useDb("userId", 0)
		const [dupliating, setDuplicating] = useState<boolean>(false)
		const [loadingHistory, setLoadingHistory] = useState<boolean>(false)
		const [selectedTag, setSelectedTag] = useState<NoteTag | undefined>(undefined)

		const userHasWritePermissions = useMemo(() => {
			if (!selectedNote) {
				return false
			}

			return selectedNote.participants.filter(participant => participant.userId === userId && participant.permissionsWrite).length > 0
		}, [selectedNote, userId])

		const tagsSorted = useMemo(() => {
			return sortAndFilterTags(tags)
		}, [tags])

		const trash = useCallback(async () => {
			if (!selectedNote) {
				return
			}

			const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

			const [err] = await safeAwait(trashNote(selectedNote.uuid))

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, trash: true, archive: false } : note)))
		}, [selectedNote, lang])

		const archive = useCallback(async () => {
			if (!selectedNote) {
				return
			}

			const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

			const [err] = await safeAwait(archiveNote(selectedNote.uuid))

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, archive: true, trash: false } : note)))
		}, [selectedNote, lang])

		const restore = useCallback(async () => {
			if (!selectedNote) {
				return
			}

			const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

			const [err] = await safeAwait(restoreNote(selectedNote.uuid))

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, archive: false, trash: false } : note)))
		}, [selectedNote, lang])

		const favorite = useCallback(
			async (favorite: boolean) => {
				if (!selectedNote) {
					return
				}

				const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

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
			[selectedNote, lang]
		)

		const pinned = useCallback(
			async (pinned: boolean) => {
				if (!selectedNote) {
					return
				}

				const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

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
			[selectedNote, lang]
		)

		const changeType = useCallback(
			async (type: NoteType) => {
				if (!selectedNote || type === selectedNote.type) {
					return
				}

				const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

				const userId = await db.get("userId")
				const privateKey = await db.get("privateKey")
				const noteKey = await decryptNoteKeyParticipant(
					selectedNote.participants.filter(participant => participant.userId === userId)[0].metadata,
					privateKey
				)

				const [contentErr, contentRes] = await safeAwait(fetchNoteContent(selectedNote, true))

				if (contentErr) {
					console.error(contentErr)

					dismissToast(loadingToast)

					showToast("error", contentErr.message, "bottom", 5000)

					return
				}

				const preview = createNotePreviewFromContentText(contentRes.content, selectedNote.type)
				const contentEncrypted = await encryptNoteContent(contentRes.content, noteKey)
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

				setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, type } : note)))

				eventListener.emit("refreshNoteContent", selectedNote.uuid)

				dismissToast(loadingToast)
			},
			[selectedNote, lang]
		)

		const exportText = useCallback(async () => {
			if (!selectedNote) {
				return
			}

			const [contentErr, contentRes] = await safeAwait(fetchNoteContent(selectedNote, true))

			if (contentErr) {
				console.error(contentErr)

				showToast("error", contentErr.message, "bottom", 5000)

				return
			}

			let content = contentRes.content

			if (content.length === 0) {
				return
			}

			const ext = getFileExt(selectedNote.title)

			try {
				if (selectedNote.type === "rich") {
					content = striptags(content.split("<p><br></p>").join("\n"))
				}

				if (selectedNote.type === "checklist") {
					let list: string[] = []
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
							list.push(listPointEx[0].trim())
						}
					}

					content = list.join("\n")
				}

				if (ext.length === 0) {
					downloadObjectAsTextWithExt(content, selectedNote.title.slice(0, 64), ext.length === 0 ? ".txt" : ext)
				} else {
					downloadObjectAsTextWithoutExt(content, selectedNote.title.slice(0, 64))
				}
			} catch (e) {
				console.error(e)

				if (ext.length === 0) {
					downloadObjectAsTextWithExt(content, selectedNote.title.slice(0, 64), ext.length === 0 ? ".txt" : ext)
				} else {
					downloadObjectAsTextWithoutExt(content, selectedNote.title.slice(0, 64))
				}
			}
		}, [selectedNote])

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

			const [contentErr, contentRes] = await safeAwait(fetchNoteContent(selectedNote, true))

			if (contentErr) {
				console.error(contentErr)

				setDuplicating(false)

				showToast("error", contentErr.message, "bottom", 5000)

				return
			}

			const preview = createNotePreviewFromContentText(contentRes.content, selectedNote.type)
			const contentEncrypted = await encryptNoteContent(contentRes.content, key)
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

			eventListener.emit("refreshNotes")

			navigate("#/notes/" + uuid)
			setDuplicating(false)

			contextMenu.hideAll()
		}, [selectedNote])

		const loadHistory = useCallback(async () => {
			if (!selectedNote) {
				return
			}

			setLoadingHistory(true)

			const [historyErr, historyRes] = await safeAwait(noteHistory(selectedNote.uuid))

			if (historyErr) {
				console.error(historyErr)

				showToast("error", historyErr.toString(), "bottom", 5000)

				return
			}

			const privateKey = await db.get("privateKey")
			const userId = await db.get("userId")

			for (let i = 0; i < historyRes.length; i++) {
				const noteKey = await decryptNoteKeyParticipant(
					selectedNote.participants.filter(participant => participant.userId === userId)[0].metadata,
					privateKey
				)
				const contentDecrypted = await decryptNoteContent(historyRes[i].content, noteKey)

				historyRes[i].content = contentDecrypted
			}

			setLoadingHistory(false)

			contextMenu.hideAll()

			eventListener.emit("openNoteHistoryModal", {
				note: selectedNote,
				history: historyRes.sort((a, b) => b.editedTimestamp - a.editedTimestamp).filter(h => h.content.length > 0)
			})
		}, [selectedNote])

		const tagNote = useCallback(
			async (tag: NoteTag) => {
				if (!selectedNote) {
					return
				}

				const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

				const included = selectedNote.tags.map(t => t.uuid).includes(tag.uuid)

				const [err] = await safeAwait(included ? notesUntag(selectedNote.uuid, tag.uuid) : notesTag(selectedNote.uuid, tag.uuid))

				if (err) {
					console.error(err)

					dismissToast(loadingToast)

					showToast("error", err.message, "bottom", 5000)

					return
				}

				dismissToast(loadingToast)

				if (included) {
					setNotes(prev =>
						prev.map(note =>
							note.uuid === selectedNote.uuid ? { ...note, tags: note.tags.filter(t => t.uuid !== tag.uuid) } : note
						)
					)
				} else {
					setNotes(prev => prev.map(note => (note.uuid === selectedNote.uuid ? { ...note, tags: [...note.tags, tag] } : note)))
				}
			},
			[selectedNote, lang]
		)

		const tagFavorite = useCallback(
			async (favorite: boolean) => {
				if (!selectedTag) {
					return
				}

				const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

				const [err] = await safeAwait(notesTagsFavorite(selectedTag.uuid, favorite))

				if (err) {
					console.error(err)

					dismissToast(loadingToast)

					showToast("error", err.message, "bottom", 5000)

					return
				}

				dismissToast(loadingToast)

				setTags(prev => prev.map(tag => (tag.uuid === selectedTag.uuid ? { ...tag, favorite, editedTimestamp: Date.now() } : tag)))
			},
			[selectedTag, lang]
		)

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

			const openNoteTagContextMenuListener = eventListener.on(
				"openNoteTagContextMenu",
				({ tag, position, event }: { tag: NoteTag; position: { x: number; y: number }; event: KeyboardEvent }) => {
					setSelectedTag(tag)

					contextMenu.show({
						id: "noteTagContextMenu",
						event,
						position
					})
				}
			)

			return () => {
				openNoteContextMenuListener.remove()
				openNoteTagContextMenuListener.remove()
			}
		}, [])

		return (
			<>
				<ContextMenu
					id="noteTagContextMenu"
					animation={{
						enter: animation.fade,
						exit: false
					}}
					theme={darkMode ? "filendark" : "filenlight"}
				>
					{selectedTag && (
						<>
							<ContextMenuItem onClick={() => eventListener.emit("openRenameNotesTagModal", selectedTag)}>
								{i18n(lang, "rename")}
							</ContextMenuItem>
							{selectedTag.favorite ? (
								<ContextMenuItem onClick={() => tagFavorite(false)}>{i18n(lang, "noteUnfavorite")}</ContextMenuItem>
							) : (
								<ContextMenuItem onClick={() => tagFavorite(true)}>{i18n(lang, "noteFavorite")}</ContextMenuItem>
							)}
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => eventListener.emit("openDeleteNotesTagModal", selectedTag)}>
								<Flex color={getColor(darkMode, "red")}>{i18n(lang, "delete")}</Flex>
							</ContextMenuItem>
						</>
					)}
				</ContextMenu>
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
									<ContextMenuItem
										onClick={params => {
											params.event.preventDefault()
											params.event.stopPropagation()

											loadHistory()
										}}
									>
										<Flex
											flexDirection="row"
											justifyContent="space-between"
											gap="25px"
											alignItems="center"
											width="100%"
										>
											<Flex>{i18n(lang, "noteHistory")}</Flex>
											{loadingHistory && (
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
									<ContextMenuSeparator />
								</>
							)}
							{userId === selectedNote.ownerId && (
								<>
									<ContextMenuItem onClick={() => eventListener.emit("openNoteAddParticipantModal", selectedNote)}>
										{i18n(lang, "participants")}
									</ContextMenuItem>
									<ContextMenuSeparator />
								</>
							)}
							{userHasWritePermissions && (
								<>
									<ContextMenuSubmenu
										label={i18n(lang, "notesType")}
										arrow={<IoChevronForward fontSize={16} />}
									>
										<ContextMenuItem onClick={() => changeType("text")}>
											<Flex color={selectedNote.type === "text" ? getColor(darkMode, "purple") : undefined}>
												{i18n(lang, "noteTypeText")}
											</Flex>
										</ContextMenuItem>
										<ContextMenuItem onClick={() => changeType("rich")}>
											<Flex color={selectedNote.type === "rich" ? getColor(darkMode, "purple") : undefined}>
												{i18n(lang, "noteTypeRich")}
											</Flex>
										</ContextMenuItem>
										<ContextMenuItem onClick={() => changeType("checklist")}>
											<Flex color={selectedNote.type === "checklist" ? getColor(darkMode, "purple") : undefined}>
												{i18n(lang, "noteTypeChecklist")}
											</Flex>
										</ContextMenuItem>
										<ContextMenuItem onClick={() => changeType("md")}>
											<Flex color={selectedNote.type === "md" ? getColor(darkMode, "purple") : undefined}>
												{i18n(lang, "noteTypeMd")}
											</Flex>
										</ContextMenuItem>
										<ContextMenuItem onClick={() => changeType("code")}>
											<Flex color={selectedNote.type === "code" ? getColor(darkMode, "purple") : undefined}>
												{i18n(lang, "noteTypeCode")}
											</Flex>
										</ContextMenuItem>
									</ContextMenuSubmenu>
									<ContextMenuSeparator />
								</>
							)}
							{selectedNote.pinned ? (
								<ContextMenuItem onClick={() => pinned(false)}>{i18n(lang, "noteUnpin")}</ContextMenuItem>
							) : (
								<ContextMenuItem onClick={() => pinned(true)}>{i18n(lang, "notePin")}</ContextMenuItem>
							)}
							{selectedNote.favorite ? (
								<ContextMenuItem onClick={() => favorite(false)}>{i18n(lang, "noteUnfavorite")}</ContextMenuItem>
							) : (
								<ContextMenuItem onClick={() => favorite(true)}>{i18n(lang, "noteFavorite")}</ContextMenuItem>
							)}
							{tagsSorted.length > 0 && (
								<ContextMenuSubmenu
									label={i18n(lang, "notesTags")}
									arrow={<IoChevronForward fontSize={16} />}
								>
									{tagsSorted.map(tag => {
										return (
											<ContextMenuItem
												onClick={() => tagNote(tag)}
												key={tag.uuid}
											>
												<Flex
													flexDirection="row"
													gap="10px"
													alignItems="center"
													width="100%"
												>
													<Flex
														color={
															selectedNote.tags.map(t => t.uuid).includes(tag.uuid)
																? getColor(darkMode, "purple")
																: undefined
														}
													>
														#
													</Flex>
													<Flex>{tag.name}</Flex>
												</Flex>
											</ContextMenuItem>
										)
									})}
								</ContextMenuSubmenu>
							)}
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={params => {
									params.event.preventDefault()
									params.event.stopPropagation()

									duplicate()
								}}
							>
								<Flex
									flexDirection="row"
									justifyContent="space-between"
									gap="25px"
									alignItems="center"
									width="100%"
								>
									<Flex>{i18n(lang, "noteDuplicate")}</Flex>
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
							<ContextMenuItem onClick={() => exportText()}>{i18n(lang, "noteExport")}</ContextMenuItem>
							{!selectedNote.archive && !selectedNote.trash && userId === selectedNote.ownerId && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem onClick={() => archive()}>{i18n(lang, "noteArchive")}</ContextMenuItem>
								</>
							)}
							{!selectedNote.trash && userId === selectedNote.ownerId && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem onClick={() => trash()}>
										<Flex color={getColor(darkMode, "red")}>{i18n(lang, "noteTrash")}</Flex>
									</ContextMenuItem>
								</>
							)}
							{(selectedNote.trash || selectedNote.archive) && userId === selectedNote.ownerId && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem onClick={() => restore()}>{i18n(lang, "noteRestore")}</ContextMenuItem>
								</>
							)}
							{selectedNote.trash && userId === selectedNote.ownerId && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem onClick={() => eventListener.emit("openDeleteNoteModal", selectedNote)}>
										<Flex color={getColor(darkMode, "red")}>{i18n(lang, "noteDelete")}</Flex>
									</ContextMenuItem>
								</>
							)}
							{userId !== selectedNote.ownerId && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem onClick={() => eventListener.emit("openLeaveNoteModal", selectedNote)}>
										<Flex color={getColor(darkMode, "red")}>{i18n(lang, "leave")}</Flex>
									</ContextMenuItem>
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
