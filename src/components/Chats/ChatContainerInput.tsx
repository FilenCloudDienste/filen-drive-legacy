import { memo, useCallback, useState, useRef, useEffect } from "react"
import { Input, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { i18n } from "../../i18n"
import { ChatMessage, sendChatMessage, ChatConversation, chatSendTyping, ChatConversationParticipant } from "../../lib/api"
import db from "../../lib/db"
import { v4 as uuidv4 } from "uuid"
import { encryptChatMessage, decryptChatMessageKey } from "../../lib/worker/worker.worker"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import AppText from "../AppText"

export interface ChatContainerInputTypingProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
	currentConversation: ChatConversation | undefined
}

const TYPING_TIMEOUT = 2000
const TYPING_TIMEOUT_LAG = 300000

const ChatContainerInputTyping = memo(({ darkMode, isMobile, lang, currentConversation }: ChatContainerInputTypingProps) => {
	const [usersTyping, setUsersTyping] = useState<ChatConversationParticipant[]>([])
	const usersTypingTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
	const currentConversationRef = useRef<ChatConversation | undefined>(currentConversation)

	useEffect(() => {
		currentConversationRef.current = currentConversation
	}, [currentConversation])

	useEffect(() => {
		const chatTypingListener = eventListener.on("socketEvent", (event: SocketEvent) => {
			if (
				event.type === "chatTyping" &&
				currentConversationRef.current &&
				currentConversationRef.current.uuid === event.data.conversation
			) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				if (event.data.type === "down") {
					setUsersTyping(prev =>
						[
							...prev.filter(user => user.userId !== event.data.senderId),
							{
								userId: event.data.senderId,
								email: event.data.senderEmail,
								avatar: event.data.senderAvatar,
								firstName: event.data.senderFirstName,
								lastName: event.data.senderLastName,
								metadata: "",
								permissionsAdd: false,
								addedTimestamp: 0
							}
						].sort((a, b) => a.email.localeCompare(b.email))
					)

					usersTypingTimeout.current[event.data.senderId] = setTimeout(() => {
						setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
					}, TYPING_TIMEOUT_LAG)
				} else {
					setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
				}
			}

			if (
				event.type === "chatMessageNew" &&
				currentConversationRef.current &&
				currentConversationRef.current.uuid === event.data.conversation
			) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
			}
		})

		return () => {
			chatTypingListener.remove()
		}
	}, [])

	return (
		<Flex
			marginTop="5px"
			marginBottom="3px"
			flexDirection="row"
		>
			{usersTyping.length === 0 ? (
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					color="transparent"
					fontSize={12}
					wordBreak="break-word"
				>
					&nsbp;
				</AppText>
			) : (
				<>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
						fontSize={12}
						wordBreak="break-word"
						fontWeight="bold"
					>
						{usersTyping.map(user => user.email).join(", ")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textSecondary")}
						fontSize={12}
						wordBreak="break-word"
						marginLeft="3px"
					>
						{" is typing.."}
					</AppText>
				</>
			)}
		</Flex>
	)
})

export interface ChatContainerInputProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
	setFailedMessages: React.Dispatch<React.SetStateAction<string[]>>
	setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

const ChatContainerInput = memo(
	({ darkMode, isMobile, lang, currentConversation, currentConversationMe, setFailedMessages, setMessages }: ChatContainerInputProps) => {
		const [messageInput, setMessageInput] = useState<string>("")
		const isTyping = useRef<boolean>(false)
		const isTypingTimer = useRef<ReturnType<typeof setTimeout>>()
		const lastTypingType = useRef<string>("")
		const currentConversationRef = useRef<ChatConversation | undefined>(currentConversation)
		const currentConversationMeRef = useRef<ChatConversationParticipant | undefined>(currentConversationMe)

		const sendTypingEvents = useCallback(async () => {
			if (!currentConversationRef.current) {
				return
			}

			const type = isTyping.current ? "down" : "up"

			if (lastTypingType.current === type) {
				return
			}

			lastTypingType.current = type

			const [sendErr] = await safeAwait(chatSendTyping(currentConversationRef.current.uuid, type))

			if (sendErr) {
				console.error(sendErr)
			}
		}, [])

		const onKeyDownOrUp = useCallback(async () => {
			isTyping.current = true

			sendTypingEvents()

			clearTimeout(isTypingTimer.current)

			isTypingTimer.current = setTimeout(() => {
				isTyping.current = false

				sendTypingEvents()
			}, TYPING_TIMEOUT)
		}, [])

		const sendMessage = useCallback(async () => {
			const message = messageInput.trim()

			if (message.length === 0 || !currentConversationRef.current || !currentConversationMeRef.current) {
				return
			}

			const uuid = uuidv4()

			setMessageInput("")
			setMessages(prev => [
				{
					uuid,
					senderId: currentConversationMeRef.current!.userId,
					senderEmail: currentConversationMeRef.current!.email,
					senderAvatar: currentConversationMeRef.current!.avatar,
					senderFirstName: currentConversationMeRef.current!.firstName,
					senderLastName: currentConversationMeRef.current!.lastName,
					message,
					sentTimestamp: Date.now()
				},
				...prev
			])

			const privateKey = await db.get("privateKey")
			const key = await decryptChatMessageKey(currentConversationMeRef.current.metadata, privateKey)

			if (key.length === 0) {
				setFailedMessages(prev => [...prev, uuid])

				return
			}

			const messageEncrypted = await encryptChatMessage(message, key)

			if (messageEncrypted.length === 0) {
				setFailedMessages(prev => [...prev, uuid])

				return
			}

			const [sendErr] = await safeAwait(sendChatMessage(currentConversationRef.current.uuid, uuid, messageEncrypted))

			if (sendErr) {
				setFailedMessages(prev => [...prev, uuid])

				console.error(sendErr)

				return
			}

			clearTimeout(isTypingTimer.current)

			isTyping.current = false

			sendTypingEvents()
		}, [messageInput])

		useEffect(() => {
			currentConversationRef.current = currentConversation
			currentConversationMeRef.current = currentConversationMe
		}, [currentConversation, currentConversationMe])

		return (
			<>
				<Input
					placeholder={i18n(lang, "searchInThisFolder")}
					width="100%"
					height="40px"
					marginTop="5px"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					borderRadius="8px"
					fontWeight="350"
					fontSize={13}
					paddingLeft="10px"
					paddingRight="10px"
					border="none"
					outline="none"
					value={messageInput}
					onChange={e => setMessageInput(e.target.value)}
					onKeyDown={e => {
						if (e.key === "Enter") {
							sendMessage()
						}

						onKeyDownOrUp()
					}}
					onKeyUp={() => onKeyDownOrUp()}
					color={getColor(darkMode, "textSecondary")}
					_placeholder={{
						color: getColor(darkMode, "textSecondary")
					}}
				/>
				<ChatContainerInputTyping
					darkMode={darkMode}
					isMobile={isMobile}
					lang={lang}
					currentConversation={currentConversation}
				/>
			</>
		)
	}
)

export default ChatContainerInput
