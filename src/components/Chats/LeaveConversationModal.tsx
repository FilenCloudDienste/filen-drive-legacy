import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { chatConversationsLeave, ChatConversation } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"

export const LeaveConversationModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [leaving, setLeaving] = useState<boolean>(false)
	const openRef = useRef<boolean>(false)
	const conversationRef = useRef<ChatConversation | undefined>(undefined)

	const leave = useCallback(async () => {
		if (!conversationRef.current) {
			return
		}

		setLeaving(true)

		const [deleteErr] = await safeAwait(chatConversationsLeave(conversationRef.current.uuid))

		if (deleteErr) {
			console.error(deleteErr)

			setLeaving(false)

			showToast("error", deleteErr.message, "bottom", 5000)

			return
		}

		eventListener.emit("chatConversationLeave", conversationRef.current)

		setLeaving(false)
		setOpen(false)
	}, [])

	const windowKeyDownListener = useCallback((e: KeyboardEvent) => {
		if (openRef.current && e.which === 13) {
			leave()
		}
	}, [])

	useEffect(() => {
		openRef.current = open
	}, [open])

	useEffect(() => {
		window.addEventListener("keydown", windowKeyDownListener)

		const openLeaveChatConversationModalListener = eventListener.on("openLeaveChatConversationModal", (convo: ChatConversation) => {
			setOpen(true)

			conversationRef.current = convo
		})

		return () => {
			window.removeEventListener("keydown", windowKeyDownListener)

			openLeaveChatConversationModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatConversationLeave")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "chatConversationLeaveWarning")}
					</AppText>
				</ModalBody>
				<ModalFooter>
					{leaving ? (
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
							onClick={() => leave()}
						>
							{i18n(lang, "leave")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default LeaveConversationModal
