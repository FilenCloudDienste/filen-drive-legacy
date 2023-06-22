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

export const HistoryModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [loadingHistory, setLoadingHistory] = useState<boolean>(false)
	const note = useRef<INote | undefined>(undefined)
	const [history, setHistory] = useState<NoteHistory[]>([])

	const loadHistory = useCallback(async () => {
		if (!note.current) {
			return
		}

		setLoadingHistory(true)

		const [historyErr, historyRes] = await safeAwait(noteHistory(note.current.uuid))

		if (historyErr) {
			console.error(historyErr)

			showToast("error", historyErr.toString(), "bottom", 5000)

			return
		}

		setHistory(historyRes.sort((a, b) => b.editedTimestamp - a.editedTimestamp))
		setLoadingHistory(false)
	}, [])

	useEffect(() => {
		const openNoteHistoryModalListener = eventListener.on("openNoteHistoryModal", (selectedNote: INote) => {
			note.current = selectedNote

			setHistory([])
			setLoadingHistory(true)
			setOpen(true)

			loadHistory()
		})

		return () => {
			openNoteHistoryModalListener.remove()
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
				>
					{loadingHistory ? (
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
						>
							{i18n(lang, "create")}
						</AppText>
					)}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
})

export default HistoryModal
