import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { Note as INote, deleteNote } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"
import { useNavigate } from "react-router-dom"
import { sortAndFilterNotes } from "./utils"

export const DeleteNoteModal = memo(({ setNotes, notes }: { setNotes: React.Dispatch<React.SetStateAction<INote[]>>; notes: INote[] }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [deleting, setDeleting] = useState<boolean>(false)
	const [selectedNote, setSelectedNote] = useState<INote | undefined>(undefined)
	const navigate = useNavigate()
	const openRef = useRef<boolean>(false)
	const selectedNoteRef = useRef<INote | undefined>(undefined)
	const notesRef = useRef<INote[]>([])

	const del = useCallback(async () => {
		if (!selectedNoteRef.current) {
			return
		}

		setDeleting(true)

		const [deleteErr] = await safeAwait(deleteNote(selectedNoteRef.current.uuid))

		if (deleteErr) {
			console.error(deleteErr)

			setDeleting(false)

			showToast("error", deleteErr.message, "bottom", 5000)

			return
		}

		setNotes(prev => prev.filter(n => n.uuid !== selectedNoteRef.current!.uuid))
		setDeleting(false)
		setOpen(false)

		if (notesRef.current.length > 0) {
			navigate("#/notes/" + sortAndFilterNotes(notesRef.current, "", "")[0].uuid)
		} else {
			navigate("#/notes")
		}
	}, [])

	const windowKeyDownListener = useCallback((e: KeyboardEvent) => {
		if (openRef.current && e.which === 13) {
			del()
		}
	}, [])

	useEffect(() => {
		notesRef.current = notes
	}, [notes])

	useEffect(() => {
		openRef.current = open
	}, [open])

	useEffect(() => {
		selectedNoteRef.current = selectedNote
	}, [selectedNote])

	useEffect(() => {
		window.addEventListener("keydown", windowKeyDownListener)

		const openDeleteNoteModalListener = eventListener.on("openDeleteNoteModal", (n: INote) => {
			setSelectedNote(n)
			setOpen(true)

			selectedNoteRef.current = n
		})

		return () => {
			window.removeEventListener("keydown", windowKeyDownListener)

			openDeleteNoteModalListener.remove()
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
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "notesDeleteWarning")}
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
})

export default DeleteNoteModal
