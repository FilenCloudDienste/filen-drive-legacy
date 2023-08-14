import { memo, useMemo, useCallback, useRef, useState, useEffect } from "react"
import { ChatSizes } from "./Chats"
import { Flex } from "@chakra-ui/react"
import { ChatMessage, ChatConversation, chatConversationsRead, ChatConversationParticipant } from "../../lib/api"
import { safeAwait, getCurrentParent } from "../../lib/helpers"
import db from "../../lib/db"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import Messages from "./Messages"
import Input from "./Input"
import { decryptChatMessage } from "../../lib/worker/worker.com"
import Topbar from "./Topbar"
import { fetchChatMessages } from "./utils"
import { validate } from "uuid"

export interface ContainerProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	lang: string
	sizes: ChatSizes
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
	contextMenuOpen: string
	emojiInitDone: boolean
}

export type MessageDisplayType = "image" | "ogEmbed" | "youtubeEmbed" | "twitterEmbed" | "filenEmbed" | "async" | "none" | "invalid"
export type DisplayMessageAs = Record<string, MessageDisplayType>

export const BIG_NUMBER = 99999999999

export const Container = memo(
	({
		darkMode,
		isMobile,
		windowHeight,
		lang,
		sizes,
		currentConversation,
		currentConversationMe,
		contextMenuOpen,
		emojiInitDone
	}: ContainerProps) => {
		const [messages, setMessages] = useState<ChatMessage[]>([])
		const [loading, setLoading] = useState<boolean>(true)
		const [failedMessages, setFailedMessages] = useState<string[]>([])
		const [displayMessageAs, setDisplayMessageAs] = useState<DisplayMessageAs>({})
		const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false)
		const [loadingPrevMessages, setLoadingPrevMessages] = useState<boolean>(false)
		const lastPreviousFetchTimestamp = useRef<number>(0)
		const [firstMessageIndex, setFirstMessageIndex] = useState<number>(0)
		const [scrolledUp, setScrolledUp] = useState<boolean>(false)
		const scrolledUpRef = useRef<boolean>(false)
		const windowFocused = useRef<boolean>(true)

		const heights = useMemo(() => {
			const inputContainer = 32 + 41
			const topbarContainer = 50
			const messagesContainer = windowHeight - inputContainer - topbarContainer

			return {
				inputContainer,
				messagesContainer,
				topbarContainer
			}
		}, [windowHeight])

		const sortedMessages = useMemo(() => {
			const exists: Record<string, boolean> = {}

			return messages
				.sort((a, b) => a.sentTimestamp - b.sentTimestamp)
				.filter(message => {
					if (!exists[message.uuid]) {
						exists[message.uuid] = true

						return true
					}

					return false
				})
		}, [messages])

		const fetchPreviousMessages = useCallback(
			async (lastTimestamp: number) => {
				if (
					!currentConversation ||
					!currentConversationMe ||
					currentConversation.uuid !== getCurrentParent(window.location.href) ||
					lastPreviousFetchTimestamp.current === lastTimestamp
				) {
					return
				}

				lastPreviousFetchTimestamp.current = lastTimestamp

				const startURL = window.location.href

				setLoadingPrevMessages(true)

				const [messagesErr, messagesRes] = await safeAwait(
					fetchChatMessages(currentConversation.uuid, currentConversationMe.metadata, lastTimestamp, true, false)
				)

				if (messagesErr) {
					console.error(messagesErr)

					lastPreviousFetchTimestamp.current = 0

					setLoadingPrevMessages(false)

					return
				}

				if (window.location.href !== startURL || messagesRes.messages.length === 0) {
					lastPreviousFetchTimestamp.current = 0

					setLoadingPrevMessages(false)

					return
				}

				setFirstMessageIndex(prev => prev - messagesRes.messages.length)
				setMessages(prev => [...messagesRes.messages, ...prev])
				setLoadingPrevMessages(false)
			},
			[currentConversation, currentConversationMe]
		)

		const fetchMessages = useCallback(
			async (refresh: boolean = false) => {
				if (!currentConversation || !currentConversationMe || currentConversation.uuid !== getCurrentParent(window.location.href)) {
					return
				}

				const startURL = window.location.href

				const cache = await db.get("chatMessages:" + currentConversation.uuid, "chats")
				const hasCache = cache && Array.isArray(cache)

				if (!hasCache) {
					setLoading(true)
					setMessages([])
				}

				const [messagesErr, messagesRes] = await safeAwait(
					fetchChatMessages(currentConversation.uuid, currentConversationMe.metadata, Date.now() + 3600000, refresh)
				)

				if (messagesErr) {
					console.error(messagesErr)

					setLoading(false)

					return
				}

				if (window.location.href !== startURL) {
					return
				}

				setMessages(prev => [...prev, ...messagesRes.messages])
				setLoading(false)

				if (messagesRes.cache) {
					fetchMessages(true)
				}
			},
			[currentConversation, currentConversationMe]
		)

		const onFocus = useCallback(async () => {
			windowFocused.current = true

			const uuid = getCurrentParent(window.location.href)

			if (validate(uuid)) {
				if (!scrolledUp) {
					safeAwait(chatConversationsRead(uuid))
				}

				safeAwait(fetchMessages())
			}
		}, [currentConversation, scrolledUp])

		const onBlur = useCallback(() => {
			windowFocused.current = false
		}, [])

		useEffect(() => {
			if (messages.length > 0) {
				db.set("chatMessages:" + messages[0].conversation, sortedMessages, "chats").catch(console.error)
			}
		}, [messages])

		useEffect(() => {
			const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
				if (event.type === "chatMessageNew") {
					if (
						!currentConversation ||
						!currentConversationMe ||
						currentConversation.uuid !== event.data.conversation ||
						currentConversation.uuid !== getCurrentParent(window.location.href)
					) {
						return
					}

					const privateKey = await db.get("privateKey")
					const message = await decryptChatMessage(event.data.message, currentConversationMe.metadata, privateKey)

					if (message.length > 0) {
						setMessages(prev => [
							{
								conversation: event.data.conversation,
								uuid: event.data.uuid,
								senderId: event.data.senderId,
								senderEmail: event.data.senderEmail,
								senderAvatar: event.data.senderAvatar,
								senderNickName: event.data.senderNickName,
								message,
								embedDisabled: event.data.embedDisabled,
								sentTimestamp: event.data.sentTimestamp
							},
							...prev.filter(message => message.uuid !== event.data.uuid)
						])
					}
				} else if (event.type === "chatMessageDelete") {
					setMessages(prev => prev.filter(message => message.uuid !== event.data.uuid))
				} else if (event.type === "chatMessageEmbedDisabled") {
					setMessages(prev =>
						prev.map(message => (message.uuid === event.data.uuid ? { ...message, embedDisabled: true } : message))
					)
				}
			})

			const socketAuthedListener = eventListener.on("socketAuthed", () => {
				fetchMessages()
			})

			const chatMessageDeleteListener = eventListener.on("chatMessageDelete", (uuid: string) => {
				setMessages(prev => prev.filter(message => message.uuid !== uuid))
			})

			const messagesTopReachedListener = eventListener.on("messagesTopReached", (lastTimestamp: number) => {
				fetchPreviousMessages(lastTimestamp)
			})

			const chatMessageEmbedDisabledListener = eventListener.on("chatMessageEmbedDisabled", (uuid: string) => {
				setMessages(prev => prev.map(message => (message.uuid === uuid ? { ...message, embedDisabled: true } : message)))
			})

			return () => {
				socketEventListener.remove()
				socketAuthedListener.remove()
				chatMessageDeleteListener.remove()
				messagesTopReachedListener.remove()
				chatMessageEmbedDisabledListener.remove()
			}
		}, [currentConversation, currentConversationMe])

		useEffect(() => {
			if (messages.length > 0) {
				db.set("chatMessages:" + messages[0].conversation, sortedMessages, "chats").catch(console.error)
			}
		}, [messages])

		useEffect(() => {
			window.addEventListener("focus", onFocus)
			window.addEventListener("blur", onBlur)

			return () => {
				window.removeEventListener("focus", onFocus)
				window.removeEventListener("blur", onBlur)
			}
		}, [])

		useEffect(() => {
			scrolledUpRef.current = scrolledUp
		}, [scrolledUp])

		useEffect(() => {
			windowFocused.current = true
			lastPreviousFetchTimestamp.current = 0

			setMessages([])
			setFirstMessageIndex(BIG_NUMBER)
			fetchMessages()
		}, [currentConversation?.uuid])

		return (
			<Flex
				width={sizes.chatContainer + "px"}
				flexDirection="column"
				overflow="hidden"
			>
				<Flex
					minHeight={heights.topbarContainer + "px"}
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
				<Flex
					width={sizes.chatContainer + "px"}
					flexDirection="column"
					overflowY="auto"
					overflowX="hidden"
				>
					{currentConversation && emojiInitDone && (
						<Messages
							darkMode={darkMode}
							isMobile={isMobile}
							failedMessages={failedMessages}
							messages={sortedMessages}
							width={sizes.chatContainer}
							height={heights.messagesContainer}
							loading={loading}
							displayMessageAs={displayMessageAs}
							setDisplayMessageAs={setDisplayMessageAs}
							emojiPickerOpen={emojiPickerOpen}
							lang={lang}
							conversationUUID={currentConversation.uuid}
							contextMenuOpen={contextMenuOpen}
							firstMessageIndex={firstMessageIndex}
							setScrolledUp={setScrolledUp}
						/>
					)}
				</Flex>
				<Flex
					flexDirection="column"
					width={sizes.chatContainer + "px"}
					paddingLeft="15px"
					paddingRight="15px"
				>
					{currentConversation && emojiInitDone && (
						<Input
							darkMode={darkMode}
							isMobile={isMobile}
							currentConversation={currentConversation}
							currentConversationMe={currentConversationMe}
							setMessages={setMessages}
							setFailedMessages={setFailedMessages}
							lang={lang}
							setEmojiPickerOpen={setEmojiPickerOpen}
							conversationUUID={currentConversation.uuid}
						/>
					)}
				</Flex>
			</Flex>
		)
	}
)

export default Container
