import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { Note as INote, noteParticipantsRemove } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"
import { useNavigate } from "react-router-dom"
import { sortAndFilterNotes } from "./utils"
import db from "../../lib/db"

export const LeaveNoteModal = memo(({ setNotes, notes }: { setNotes: React.Dispatch<React.SetStateAction<INote[]>>; notes: INote[] }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [removing, setRemoving] = useState<boolean>(false)
	const [selectedNote, setSelectedNote] = useState<INote | undefined>(undefined)
	const navigate = useNavigate()
	const openRef = useRef<boolean>(false)
	const selectedNoteRef = useRef<INote | undefined>(undefined)
	const notesRef = useRef<INote[]>([])

	const remove = useCallback(async () => {
		if (!selectedNoteRef.current) {
			return
		}

		setRemoving(true)

		const userId = await db.get("userId")
		const [removeErr] = await safeAwait(noteParticipantsRemove({ uuid: selectedNoteRef.current.uuid, userId }))

		if (removeErr) {
			console.error(removeErr)

			setRemoving(false)

			showToast("error", removeErr.message, "bottom", 5000)

			return
		}

		setNotes(prev => prev.filter(n => n.uuid !== selectedNoteRef.current!.uuid))
		setRemoving(false)
		setOpen(false)

		if (notesRef.current.length > 0) {
			navigate("#/notes/" + sortAndFilterNotes(notesRef.current, "", "")[0].uuid)
		} else {
			navigate("#/notes")
		}
	}, [])

	const windowKeyDownListener = useCallback((e: KeyboardEvent) => {
		if (openRef.current && e.which === 13) {
			remove()
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

		const openLeaveNoteModalListener = eventListener.on("openLeaveNoteModal", (n: INote) => {
			setSelectedNote(n)
			setOpen(true)

			selectedNoteRef.current = n
		})

		return () => {
			window.removeEventListener("keydown", windowKeyDownListener)

			openLeaveNoteModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "leaveNote")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "leaveNoteWarning")}
					</AppText>
				</ModalBody>
				<ModalFooter>
					{removing ? (
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
							onClick={() => remove()}
						>
							{i18n(lang, "leaveNote")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default LeaveNoteModal
