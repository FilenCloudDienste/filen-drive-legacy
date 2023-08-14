import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { chatConversationsDelete, ChatConversation } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"

export const DeleteConversationModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [deleting, setDeleting] = useState<boolean>(false)
	const openRef = useRef<boolean>(false)
	const conversationRef = useRef<ChatConversation | undefined>(undefined)

	const del = useCallback(async () => {
		if (!conversationRef.current) {
			return
		}

		setDeleting(true)

		const [deleteErr] = await safeAwait(chatConversationsDelete(conversationRef.current.uuid))

		if (deleteErr) {
			console.error(deleteErr)

			setDeleting(false)

			showToast("error", deleteErr.message, "bottom", 5000)

			return
		}

		eventListener.emit("chatConversationDelete", conversationRef.current)

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
		window.addEventListener("keydown", windowKeyDownListener)

		const openDeleteChatConversationModalListener = eventListener.on("openDeleteChatConversationModal", (convo: ChatConversation) => {
			setOpen(true)

			conversationRef.current = convo
		})

		return () => {
			window.removeEventListener("keydown", windowKeyDownListener)

			openDeleteChatConversationModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatConversationDelete")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "chatConversationDeleteWarning")}
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

export default DeleteConversationModal
