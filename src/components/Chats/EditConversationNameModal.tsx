import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner, Input } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { chatConversationNameEdit, ChatConversation } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"
import { encryptChatConversationName, decryptChatMessageKey } from "../../lib/worker/worker.com"
import db from "../../lib/db"

export const EditConversationNameModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [editing, setEditing] = useState<boolean>(false)
	const openRef = useRef<boolean>(false)
	const conversationRef = useRef<ChatConversation | undefined>(undefined)
	const [name, setName] = useState<string>("")
	const nameRef = useRef<string>(name)

	const edit = useCallback(async () => {
		const newName = nameRef.current.trim()

		if (!conversationRef.current || newName.length >= 512) {
			return
		}

		if (newName === conversationRef.current.name) {
			setOpen(false)

			return
		}

		setEditing(true)

		const [privateKey, userId] = await Promise.all([db.get("privateKey"), db.get("userId")])
		const metadata = conversationRef.current.participants.filter(p => p.userId === userId)

		if (metadata.length !== 1) {
			return
		}

		const keyDecrypted = await decryptChatMessageKey(metadata[0].metadata, privateKey)
		const nameEncrypted = await encryptChatConversationName(newName, keyDecrypted)

		const [editErr] = await safeAwait(chatConversationNameEdit(conversationRef.current.uuid, nameEncrypted))

		if (editErr) {
			console.error(editErr)

			setEditing(false)

			showToast("error", editErr.message, "bottom", 5000)

			return
		}

		eventListener.emit("chatConversationNameEdited", {
			uuid: conversationRef.current.uuid,
			name: newName
		})

		setEditing(false)
		setOpen(false)
	}, [])

	const windowKeyDownListener = useCallback((e: KeyboardEvent) => {
		if (openRef.current && e.which === 13) {
			edit()
		}
	}, [])

	useEffect(() => {
		openRef.current = open
		nameRef.current = name
	}, [open, name])

	useEffect(() => {
		window.addEventListener("keydown", windowKeyDownListener)

		const openChatConversationEditNameModalListener = eventListener.on(
			"openChatConversationEditNameModal",
			(convo: ChatConversation) => {
				setOpen(true)
				setName(convo.name || "")

				nameRef.current = convo.name || ""
				conversationRef.current = convo
			}
		)

		return () => {
			window.removeEventListener("keydown", windowKeyDownListener)

			openChatConversationEditNameModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatConversationEditName")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<Input
						value={name}
						onChange={e => setName(e.target.value)}
						autoFocus={false}
						spellCheck={false}
						border="none"
						borderRadius="10px"
						width="100%"
						height="40px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textPrimary")}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
						placeholder={i18n(lang, "renameNewName")}
						paddingLeft="10px"
						paddingRight="10px"
						shadow="none"
						outline="none"
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
						fontSize={15}
					/>
				</ModalBody>
				<ModalFooter>
					{editing ? (
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
							onClick={() => edit()}
						>
							{i18n(lang, "save")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default EditConversationNameModal
