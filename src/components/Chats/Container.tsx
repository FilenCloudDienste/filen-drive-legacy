import { memo, useMemo, useCallback, useRef, useState, useEffect } from "react"
import { ChatSizes } from "./Chats"
import { Flex } from "@chakra-ui/react"
import {
	chatMessages as fetchChatMessages,
	ChatMessage,
	ChatConversation,
	chatConversationsRead,
	ChatConversationParticipant
} from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import db from "../../lib/db"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import Messages from "./Messages"
import Input from "./Input"
import { decryptChatMessage } from "../../lib/worker/worker.com"
import Topbar from "./Topbar"

export interface ContainerProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	lang: string
	sizes: ChatSizes
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
}

export const Container = memo(
	({ darkMode, isMobile, windowHeight, lang, sizes, currentConversation, currentConversationMe }: ContainerProps) => {
		const [messages, setMessages] = useState<ChatMessage[]>([])
		const [loading, setLoading] = useState<boolean>(true)
		const messagesTimestamp = useRef<number>(Date.now() + 3600000)
		const [failedMessages, setFailedMessages] = useState<string[]>([])
		const windowFocused = useRef<boolean>(true)

		const heights = useMemo(() => {
			const inputContainer = 85
			const topbarContainer = 50
			const messagesContainer = windowHeight - inputContainer - topbarContainer

			return {
				inputContainer,
				messagesContainer,
				topbarContainer
			}
		}, [windowHeight])

		const sortedMessages = useMemo(() => {
			return messages.sort((a, b) => a.sentTimestamp - b.sentTimestamp)
		}, [messages])

		const fetchMessages = useCallback(
			async (showLoader = true) => {
				if (!currentConversation || !currentConversationMe) {
					return
				}

				setLoading(showLoader)

				const [messagesErr, messagesRes] = await safeAwait(fetchChatMessages(currentConversation.uuid, messagesTimestamp.current))

				if (messagesErr) {
					console.error(messagesErr)

					setLoading(false)

					return
				}

				const messagesDecrypted: ChatMessage[] = []
				const privateKey = await db.get("privateKey")

				for (const message of messagesRes) {
					const messageDecrypted = await decryptChatMessage(message.message, currentConversationMe.metadata, privateKey)

					if (messageDecrypted.length === 0) {
						continue
					}

					messagesDecrypted.push({
						...message,
						message: messageDecrypted
					})
				}

				setMessages(messagesDecrypted)
				setLoading(false)
				safeAwait(chatConversationsRead(currentConversation.uuid))
			},
			[currentConversation, currentConversationMe]
		)

		const onFocus = useCallback(async () => {
			windowFocused.current = true

			if (currentConversation) {
				safeAwait(chatConversationsRead(currentConversation.uuid))
				safeAwait(fetchMessages(false))
			}
		}, [currentConversation])

		const onBlur = useCallback(() => {
			windowFocused.current = false
		}, [])

		useEffect(() => {
			window.addEventListener("focus", onFocus)
			window.addEventListener("blur", onBlur)

			return () => {
				window.removeEventListener("focus", onFocus)
				window.removeEventListener("blur", onBlur)
			}
		}, [])

		useEffect(() => {
			const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
				if (event.type === "chatMessageNew") {
					if (!currentConversation || !currentConversationMe || currentConversation.uuid !== event.data.conversation) {
						return
					}

					const privateKey = await db.get("privateKey")
					const message = await decryptChatMessage(event.data.message, currentConversationMe.metadata, privateKey)

					if (message.length > 0) {
						setMessages(prev => [
							{
								uuid: event.data.uuid,
								senderId: event.data.senderId,
								senderEmail: event.data.senderEmail,
								senderAvatar: event.data.senderAvatar,
								senderNickName: event.data.senderNickName,
								message,
								sentTimestamp: event.data.sentTimestamp
							},
							...prev.filter(message => message.uuid !== event.data.uuid)
						])
					}
				} else if (event.type === "chatMessageDelete") {
					setMessages(prev => prev.filter(message => message.uuid !== event.data.uuid))
				}
			})

			const socketAuthedListener = eventListener.on("socketAuthed", () => {
				fetchMessages(false)
			})

			const chatMessageDeleteListener = eventListener.on("chatMessageDelete", (uuid: string) => {
				setMessages(prev => prev.filter(message => message.uuid !== uuid))
			})

			const messagesTopReachedListener = eventListener.on("messagesTopReached", () => {
				console.log("load more messages")
			})

			return () => {
				socketEventListener.remove()
				socketAuthedListener.remove()
				chatMessageDeleteListener.remove()
				messagesTopReachedListener.remove()
			}
		}, [currentConversation, currentConversationMe])

		useEffect(() => {
			fetchMessages()
		}, [currentConversation?.uuid])

		return (
			<Flex
				width={sizes.chatContainer + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<Flex
					height={heights.topbarContainer + "px"}
					width={sizes.chatContainer + "px"}
					flexDirection="row"
					overflowY="hidden"
				>
					<Topbar
						darkMode={darkMode}
						isMobile={isMobile}
						currentConversation={currentConversation}
						currentConversationMe={currentConversationMe}
					/>
				</Flex>
				<Messages
					darkMode={darkMode}
					isMobile={isMobile}
					failedMessages={failedMessages}
					messages={sortedMessages}
					width={sizes.chatContainer}
					height={heights.messagesContainer}
					loading={loading}
				/>
				<Flex
					flexDirection="column"
					justifyContent="center"
					height={heights.inputContainer + "px"}
					width={sizes.chatContainer + "px"}
					paddingLeft="15px"
					paddingRight="15px"
				>
					<Input
						darkMode={darkMode}
						isMobile={isMobile}
						currentConversation={currentConversation}
						currentConversationMe={currentConversationMe}
						setMessages={setMessages}
						setFailedMessages={setFailedMessages}
						lang={lang}
						loading={loading}
					/>
				</Flex>
			</Flex>
		)
	}
)

export default Container
