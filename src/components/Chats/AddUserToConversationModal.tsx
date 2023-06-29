import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { getPublicKeyFromEmail, chatConversationsParticipantsAdd, chatConversations } from "../../lib/api"
import { encryptMetadataPublicKey } from "../../lib/worker/worker.com"
import { safeAwait } from "../../lib/helpers"
import Input from "../Input"
import eventListener from "../../lib/eventListener"

const AddUserConversationModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	const [open, setOpen] = useState<boolean>(false)
	const [emails, setEmails] = useState<string>("")
	const [loading, setLoading] = useState<boolean>(false)
	const conversationUUID = useRef<string>("")
	const conversationKey = useRef<string>("")

	const addUser = useCallback(async () => {
		if (conversationUUID.current.length === 0 || conversationKey.current.length === 0) {
			return
		}

		const to = emails.trim()

		const [toErr, toRes] = await safeAwait(getPublicKeyFromEmail(to))

		if (toErr) {
			return
		}

		const participantMetadata = await encryptMetadataPublicKey(JSON.stringify({ key: conversationKey.current }), toRes)

		const [addErr] = await safeAwait(chatConversationsParticipantsAdd(conversationUUID.current, to, participantMetadata))

		if (addErr) {
			return
		}

		eventListener.emit("updateChatConversations")

		setEmails("")
		setOpen(false)
	}, [emails])

	useEffect(() => {
		const openAddUserToConversationModalListener = eventListener.on(
			"openAddUserToConversationModal",
			({ uuid, key }: { uuid: string; key: string }) => {
				conversationUUID.current = uuid
				conversationKey.current = key

				setEmails("")
				setLoading(false)
				setOpen(true)
			}
		)

		return () => {
			openAddUserToConversationModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "md"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatAddUserToConversation")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					<Input
						darkMode={darkMode}
						isMobile={isMobile}
						value={emails}
						placeholder={i18n(lang, "chatNewInviteEmail")}
						autoFocus={true}
						onChange={e => setEmails(e.target.value)}
						color={getColor(darkMode, "textSecondary")}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
						onKeyDown={e => {
							if (e.which == 13) {
								addUser()
							}
						}}
					/>
				</ModalBody>
				<ModalFooter>
					{loading ? (
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
							onClick={() => addUser()}
						>
							{i18n(lang, "add")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default AddUserConversationModal
