import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { noteHistory, noteHistoryRestore, Note as INote, NoteHistory } from "../../lib/api"
import { encryptMetadataPublicKey } from "../../lib/worker/worker.com"
import { safeAwait } from "../../lib/helpers"
import Input from "../Input"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { show as showToast } from "../Toast/Toast"

export const AddParticipantModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const note = useRef<INote | undefined>(undefined)

	useEffect(() => {
		const openNoteAddParticipantModalListener = eventListener.on("openNoteAddParticipantModal", (selectedNote: INote) => {
			note.current = selectedNote

			setOpen(true)
		})

		return () => {
			openNoteAddParticipantModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={history.length > 0 ? "full" : isMobile ? "xl" : "md"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius={isMobile ? "0px" : "5px"}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatAddUserToConversation")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
				></ModalBody>
				<ModalFooter></ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default AddParticipantModal
