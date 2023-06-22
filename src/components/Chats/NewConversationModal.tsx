import { memo, useState, useEffect, useCallback } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { getPublicKeyFromEmail, chatConversationsCreate, chatConversationsParticipantsAdd, chatConversations } from "../../lib/api"
import { encryptMetadataPublicKey } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { v4 as uuidv4 } from "uuid"
import { safeAwait, generateRandomString } from "../../lib/helpers"
import Input from "../Input"
import { useNavigate } from "react-router-dom"
import eventListener from "../../lib/eventListener"

const NewConversationModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	const [open, setOpen] = useState<boolean>(false)
	const [emails, setEmails] = useState<string>("")
	const [loading, setLoading] = useState<boolean>(false)
	const navigate = useNavigate()

	const createConversation = useCallback(async () => {
		const to = emails.trim()

		const [toErr, toRes] = await safeAwait(getPublicKeyFromEmail(to))

		if (toErr) {
			return
		}

		const key = generateRandomString(32)
		const publicKey = await db.get("publicKey")
		const metadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKey)
		const uuid = uuidv4()

		const [conversationErr] = await safeAwait(chatConversationsCreate(uuid, metadata))

		if (conversationErr) {
			return
		}

		const participantMetadata = await encryptMetadataPublicKey(JSON.stringify({ key }), toRes)

		const [addErr] = await safeAwait(chatConversationsParticipantsAdd(uuid, to, participantMetadata))

		if (addErr) {
			return
		}

		const [conversationsErr, conversationsRes] = await safeAwait(chatConversations(Date.now() + 86400000))

		if (conversationsErr) {
			return
		}

		eventListener.emit("updateChatConversations", conversationsRes)

		setEmails("")
		navigate("#/chats/" + uuid)
		setOpen(false)
	}, [emails])

	useEffect(() => {
		const openNewConversationModalListener = eventListener.on("openNewConversationModal", () => {
			setEmails("")
			setLoading(false)
			setOpen(true)
		})

		return () => {
			openNewConversationModalListener.remove()
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
				borderRadius={isMobile ? "0px" : "5px"}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatNew")}</ModalHeader>
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
								createConversation()
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
							onClick={() => createConversation()}
						>
							{i18n(lang, "create")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default NewConversationModal
