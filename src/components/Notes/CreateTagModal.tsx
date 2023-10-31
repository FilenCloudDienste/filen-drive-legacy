import { memo, useState, useEffect, useCallback } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Input, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { notesTags, notesTagsCreate, NoteTag } from "../../lib/api"
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

export const CreateTagModal = memo(({ setTags }: { setTags: React.Dispatch<React.SetStateAction<NoteTag[]>> }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [tag, setTag] = useState<string>("")
	const [creating, setCreating] = useState<boolean>(false)

	const create = useCallback(async () => {
		if (creating) {
			return
		}

		const name = striptags(tag.trim())

		if (!name || name.length === 0) {
			return
		}

		setCreating(true)

		const [tagsErr, tagsRes] = await safeAwait(notesTags())

		if (tagsErr) {
			console.error(tagsErr)

			setCreating(false)

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
			setCreating(false)

			showToast("error", i18n(lang, "notesTagsNameExists"), "bottom", 5000)

			return
		}

		const nameEncrypted = await encryptNoteTagName(name, masterKeys[masterKeys.length - 1])

		const [createErr, createRes] = await safeAwait(notesTagsCreate(nameEncrypted))

		if (createErr) {
			console.error(createErr)

			setCreating(false)

			showToast("error", createErr.message, "bottom", 5000)

			return
		}

		setTags(prev => [
			...prev,
			{ uuid: createRes.uuid, name, favorite: false, editedTimestamp: Date.now(), createdTimestamp: Date.now() }
		])

		setCreating(false)
		setOpen(false)
		setTag("")
	}, [creating, lang, tag])

	useEffect(() => {
		const openCreateNoteTagModalListener = eventListener.on("openCreateNoteTagModal", () => {
			setTag("")
			setOpen(true)
		})

		return () => {
			openCreateNoteTagModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "notesTagsCreate")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<Input
						value={tag}
						onChange={e => setTag(e.target.value)}
						onKeyDown={e => {
							if (e.key === "Enter") {
								create()
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
					{creating ? (
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
							onClick={() => create()}
						>
							{i18n(lang, "create")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default CreateTagModal
