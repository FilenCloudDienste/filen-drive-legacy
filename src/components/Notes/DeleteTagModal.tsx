import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { NoteTag, notesTagsDelete, Note as INote } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"

export const DeleteTagModal = memo(
	({
		setTags,
		setNotes
	}: {
		setTags: React.Dispatch<React.SetStateAction<NoteTag[]>>
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const lang = useLang()
		const [open, setOpen] = useState<boolean>(false)
		const [deleting, setDeleting] = useState<boolean>(false)
		const [selectedTag, setSelectedTag] = useState<NoteTag | undefined>(undefined)
		const openRef = useRef<boolean>(false)
		const selectedTagRef = useRef<NoteTag | undefined>(undefined)

		const del = useCallback(async () => {
			if (!selectedTagRef.current) {
				return
			}

			setDeleting(true)

			const [deleteErr] = await safeAwait(notesTagsDelete(selectedTagRef.current.uuid))

			if (deleteErr) {
				console.error(deleteErr)

				setDeleting(false)

				showToast("error", deleteErr.message, "bottom", 5000)

				return
			}

			setTags(prev => prev.filter(t => t.uuid !== selectedTagRef.current!.uuid))
			setNotes(prev => prev.map(n => ({ ...n, tags: n.tags.filter(t => t.uuid !== selectedTagRef.current!.uuid) })))
			setDeleting(false)
			setOpen(false)
		}, [])

		const windowKeyDownListener = useCallback((e: KeyboardEvent) => {
			if (openRef.current && e.which === 13) {
				del()
			}
		}, [])

		useEffect(() => {
			openRef.current = open
		}, [open])

		useEffect(() => {
			selectedTagRef.current = selectedTag
		}, [selectedTag])

		useEffect(() => {
			window.addEventListener("keydown", windowKeyDownListener)

			const openDeleteTagModalListener = eventListener.on("openDeleteNotesTagModal", (tag: NoteTag) => {
				setSelectedTag(tag)
				setOpen(true)

				selectedTagRef.current = tag
			})

			return () => {
				window.removeEventListener("keydown", windowKeyDownListener)

				openDeleteTagModalListener.remove()
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
					<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "notesTagsDelete")}</ModalHeader>
					<ModalCloseButton darkMode={darkMode} />
					<ModalBody>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textPrimary")}
						>
							{i18n(lang, "notesTagDeleteWarning")}
						</AppText>
					</ModalBody>
					<ModalFooter>
						{deleting ? (
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
								color={getColor(darkMode, "red")}
								cursor="pointer"
								_hover={{
									textDecoration: "underline"
								}}
								onClick={() => del()}
							>
								{i18n(lang, "delete")}
							</AppText>
						)}
					</ModalFooter>
				</ModalContent>
			</Modal>
		)
	}
)

export default DeleteTagModal
