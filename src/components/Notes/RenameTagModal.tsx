import { memo, useState, useEffect, useCallback } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Input, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { notesTags, NoteTag, notesTagsRename, Note } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import db from "../../lib/db"
import { decryptNoteTagName, encryptNoteTagName } from "../../lib/worker/worker.com"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"
import striptags from "striptags"

export const RenameTagModal = memo(
	({
		setTags,
		setNotes
	}: {
		setTags: React.Dispatch<React.SetStateAction<NoteTag[]>>
		setNotes: React.Dispatch<React.SetStateAction<Note[]>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const lang = useLang()
		const [open, setOpen] = useState<boolean>(false)
		const [tag, setTag] = useState<string>("")
		const [renaming, setRenaming] = useState<boolean>(false)
		const [selectedTag, setSelectedTag] = useState<NoteTag | undefined>(undefined)

		const rename = useCallback(async () => {
			if (renaming || !selectedTag) {
				return
			}

			const name = striptags(tag.trim())

			if (!name || name.length === 0) {
				return
			}

			setRenaming(true)

			const [tagsErr, tagsRes] = await safeAwait(notesTags())

			if (tagsErr) {
				console.error(tagsErr)

				setRenaming(false)

				showToast("error", tagsErr.message, "bottom", 5000)

				return
			}

			const masterKeys = await db.get("masterKeys")
			const existingNames: string[] = []

			for (const tag of tagsRes) {
				const decryptedName = await decryptNoteTagName(tag.name, masterKeys)

				if (decryptedName.length > 0) {
					existingNames.push(decryptedName)
				}
			}

			if (existingNames.includes(name)) {
				setRenaming(false)

				showToast("error", i18n(lang, "notesTagsNameExists"), "bottom", 5000)

				return
			}

			const nameEncrypted = await encryptNoteTagName(name, masterKeys[masterKeys.length - 1])

			const [renameErr] = await safeAwait(notesTagsRename(selectedTag.uuid, nameEncrypted))

			if (renameErr) {
				console.error(renameErr)

				setRenaming(false)

				showToast("error", renameErr.message, "bottom", 5000)

				return
			}

			setTags(prev => prev.map(t => (t.uuid === selectedTag.uuid ? { ...t, name, editedTimestamp: Date.now() } : t)))
			setNotes(prev =>
				prev.map(n => ({
					...n,
					tags: n.tags.map(t =>
						t.uuid === selectedTag.uuid
							? {
									...t,
									name,
									editedTimestamp: Date.now()
							  }
							: t
					)
				}))
			)
			setRenaming(false)
			setOpen(false)
			setTag("")
			setSelectedTag(undefined)
		}, [renaming, lang, tag, selectedTag])

		useEffect(() => {
			const openRenameNotesTagModalListener = eventListener.on("openRenameNotesTagModal", (t: NoteTag) => {
				setTag(t.name)
				setSelectedTag(t)
				setOpen(true)
			})

			return () => {
				openRenameNotesTagModalListener.remove()
			}
		}, [])

		return (
			<Modal
				onClose={() => setOpen(false)}
				isOpen={open}
				isCentered={true}
				size={isMobile ? "md" : "md"}
			>
				<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
				<ModalContent
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					color={getColor(darkMode, "textSecondary")}
					borderRadius="10px"
					border={"1px solid " + getColor(darkMode, "borderPrimary")}
				>
					<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "notesTagsRename")}</ModalHeader>
					<ModalCloseButton darkMode={darkMode} />
					<ModalBody>
						<Input
							value={tag}
							onChange={e => setTag(e.target.value)}
							onKeyDown={e => {
								if (e.key === "Enter") {
									rename()
								}
							}}
							placeholder={i18n(lang, "notesTagsCreateRenamePlaceholder")}
							paddingLeft="10px"
							paddingRight="10px"
							shadow="none"
							outline="none"
							border="none"
							borderRadius="10px"
							backgroundColor={getColor(darkMode, "backgroundPrimary")}
							color={getColor(darkMode, "textPrimary")}
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
					</ModalBody>
					<ModalFooter>
						{renaming ? (
							<Spinner
								width="16px"
								height="16px"
								color={getColor(darkMode, "textPrimary")}
							/>
						) : (
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "linkPrimary")}
								cursor="pointer"
								_hover={{
									textDecoration: "underline"
								}}
								onClick={() => rename()}
							>
								{i18n(lang, "rename")}
							</AppText>
						)}
					</ModalFooter>
				</ModalContent>
			</Modal>
		)
	}
)

export default RenameTagModal
