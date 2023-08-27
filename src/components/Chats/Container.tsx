import { memo, useMemo, useCallback, useRef, useState, useEffect } from "react"
import { ChatSizes } from "./Chats"
import { Flex } from "@chakra-ui/react"
import { ChatMessage, ChatConversation, ChatConversationParticipant, updateChatLastFocus, getChatLastFocus } from "../../lib/api"
import { safeAwait, getCurrentParent, Semaphore } from "../../lib/helpers"
import db from "../../lib/db"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import Messages from "./Messages"
import Input from "./Input"
import { decryptChatMessage } from "../../lib/worker/worker.com"
import Topbar from "./Topbar"
import { fetchChatMessages } from "./utils"
import { validate } from "uuid"
import { useNavigate } from "react-router-dom"
import { useLocalStorage } from "react-use"
import useWindowFocus from "use-window-focus"
import useDb from "../../lib/hooks/useDb"

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
	unreadConversationsMessages: Record<string, number>
	setUnreadConversationsMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

export type MessageDisplayType = "image" | "ogEmbed" | "youtubeEmbed" | "twitterEmbed" | "filenEmbed" | "async" | "none" | "invalid"
export type DisplayMessageAs = Record<string, MessageDisplayType>

export const BIG_NUMBER = 99999999999

const updateLastFocusMutex = new Semaphore(1)

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
		emojiInitDone,
		unreadConversationsMessages,
		setUnreadConversationsMessages
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
		const isFocused = useWindowFocus()
		const scrolledUpRef = useRef<boolean>(false)
		const windowFocused = useRef<boolean>(isFocused)
		const [editingMessageUUID, setEditingMessageUUID] = useState<string>("")
		const navigate = useNavigate()
		const [replyMessageUUID, setReplyMessageUUID] = useState<string>("")
		const [lastFocusTimestamp, setLastFocusTimestamp] = useLocalStorage<Record<string, number>>("chatsLastFocusTimestamp", {})
		const currentConversationRef = useRef<ChatConversation | undefined>(currentConversation)
		const currentConversationMeRef = useRef<ChatConversationParticipant | undefined>(currentConversationMe)
		const lastFocusTimestampRef = useRef<string>("")
		const [lastFocusInitDone, setLastFocusInitDone] = useState<boolean>(false)
		const initDoneRef = useRef<boolean>(false)
		const [userId] = useDb("userId", 0)
		const userIdRef = useRef<number>(0)
		const [atBottom, setAtBottom] = useState<boolean>(true)
		const atBottomRef = useRef<boolean>(true)

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

		const fetchPreviousMessages = useCallback(async (lastTimestamp: number) => {
			if (
				!currentConversationRef.current ||
				!currentConversationMeRef.current ||
				currentConversationRef.current.uuid !== getCurrentParent(window.location.href) ||
				lastPreviousFetchTimestamp.current === lastTimestamp
			) {
				return
			}

			lastPreviousFetchTimestamp.current = lastTimestamp

			const startURL = window.location.href

			setLoadingPrevMessages(true)

			const [messagesErr, messagesRes] = await safeAwait(
				fetchChatMessages(
					currentConversationRef.current.uuid,
					currentConversationMeRef.current.metadata,
					lastTimestamp,
					true,
					false
				)
			)

			if (messagesErr) {
				console.error(messagesErr)

				lastPreviousFetchTimestamp.current = 0

				setLoadingPrevMessages(false)

				if (messagesErr.toString().toLowerCase().indexOf("conversation not found") !== -1) {
					navigate("/#/chats")
				}

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
		}, [])

		const fetchMessages = useCallback(async (refresh: boolean = false) => {
			if (
				!currentConversationRef.current ||
				!currentConversationMeRef.current ||
				currentConversationRef.current.uuid !== getCurrentParent(window.location.href)
			) {
				return
			}

			const startURL = window.location.href

			const cache = await db.get("chatMessages:" + currentConversationRef.current.uuid, "chats")
			const hasCache = cache && Array.isArray(cache)

			if (!hasCache) {
				setLoading(true)
				setMessages([])
			}

			const [messagesErr, messagesRes] = await safeAwait(
				fetchChatMessages(
					currentConversationRef.current.uuid,
					currentConversationMeRef.current.metadata,
					Date.now() + 3600000,
					refresh
				)
			)

			if (messagesErr) {
				console.error(messagesErr)

				setLoading(false)

				if (messagesErr.toString().toLowerCase().indexOf("conversation not found") !== -1) {
					navigate("/#/chats")
				}

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

			setTimeout(() => eventListener.emit("scrollChatToBottom"), 250)
		}, [])

		const fetchLastFocus = useCallback(async () => {
			const [err, res] = await safeAwait(getChatLastFocus())

			if (err) {
				console.error(err)

				return
			}

			if (res.length > 0) {
				setLastFocusTimestamp(res.reduce((prev, current) => ({ ...prev, [current.uuid]: current.lastFocus }), {}))
			}
		}, [])

		const initLastFocus = useCallback(async () => {
			setLastFocusInitDone(false)

			const [err, res] = await safeAwait(getChatLastFocus())

			if (err) {
				console.error(err)

				return
			}

			if (res.length > 0) {
				setLastFocusTimestamp(res.reduce((prev, current) => ({ ...prev, [current.uuid]: current.lastFocus }), {}))
			}

			setTimeout(() => setLastFocusInitDone(true), 100)
		}, [])

		const onFocus = useCallback(() => {
			const uuid = getCurrentParent(window.location.href)

			if (validate(uuid)) {
				safeAwait(fetchMessages(true))
			}
		}, [])

		useEffect(() => {
			if (typeof lastFocusTimestamp !== "undefined" && currentConversationRef.current) {
				const convoUUID = currentConversationRef.current.uuid
				const currentLastFocus = lastFocusTimestamp[convoUUID]

				if (typeof currentLastFocus === "number") {
					const current = JSON.stringify(currentLastFocus)

					if (current !== lastFocusTimestampRef.current) {
						lastFocusTimestampRef.current = current
						;(async () => {
							await updateLastFocusMutex.acquire()

							try {
								await updateChatLastFocus([
									{
										uuid: convoUUID,
										lastFocus: currentLastFocus
									}
								])
							} catch (e) {
								console.error(e)
							}

							updateLastFocusMutex.release()
						})()
					}
				}
			}
		}, [JSON.stringify(lastFocusTimestamp)])

		useEffect(() => {
			if (messages.length > 0) {
				const failed: Record<string, boolean> = failedMessages.reduce((prev, current) => ({ ...prev, [current]: true }), {})

				db.set(
					"chatMessages:" + messages[0].conversation,
					sortedMessages.filter(message => !failed[message.uuid]),
					"chats"
				).catch(console.error)
			}
		}, [JSON.stringify(messages), failedMessages])

		useEffect(() => {
			const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
				const currentConvoUUID = getCurrentParent(window.location.href)

				if (
					event.type === "chatMessageNew" &&
					event.data.senderId === userIdRef.current &&
					event.data.conversation === currentConvoUUID
				) {
					setLastFocusTimestamp(prev => ({
						...prev,
						[event.data.conversation]: event.data.sentTimestamp
					}))
				}

				if (
					event.type === "chatMessageNew" &&
					event.data.senderId !== userIdRef.current &&
					windowFocused.current &&
					atBottomRef.current &&
					event.data.conversation === currentConvoUUID
				) {
					setLastFocusTimestamp(prev => ({
						...prev,
						[event.data.conversation]: event.data.sentTimestamp
					}))
				}

				if (event.type === "chatMessageNew" && event.data.senderId !== userIdRef.current) {
					if (currentConvoUUID !== event.data.conversation || !windowFocused.current || atBottomRef.current) {
						setUnreadConversationsMessages(prev => ({
							...prev,
							[event.data.conversation]:
								typeof prev[event.data.conversation] !== "number" ? 1 : prev[event.data.conversation] + 1
						}))
					}
				}

				if (event.type === "chatMessageNew") {
					if (!currentConversationMeRef.current || event.data.conversation !== currentConvoUUID) {
						return
					}

					const privateKey = await db.get("privateKey")
					const message = await decryptChatMessage(event.data.message, currentConversationMeRef.current.metadata, privateKey)
					const replyToMessageDecrypted =
						event.data.replyTo.uuid.length > 0 && event.data.replyTo.message.length > 0
							? await decryptChatMessage(event.data.replyTo.message, currentConversationMeRef.current.metadata, privateKey)
							: ""

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
								replyTo: {
									...event.data.replyTo,
									message: replyToMessageDecrypted
								},
								embedDisabled: event.data.embedDisabled,
								edited: false,
								editedTimestamp: 0,
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
				} else if (event.type === "chatMessageEdited") {
					if (!currentConversationMeRef.current || event.data.conversation !== currentConvoUUID) {
						return
					}

					const privateKey = await db.get("privateKey")
					const message = await decryptChatMessage(event.data.message, currentConversationMeRef.current.metadata, privateKey)

					setMessages(prev =>
						prev.map(m =>
							m.uuid === event.data.uuid ? { ...m, message, edited: true, editedTimestamp: event.data.editedTimestamp } : m
						)
					)
				}
			})

			const socketAuthedListener = eventListener.on("socketAuthed", () => {
				fetchMessages(true)
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
		}, [])

		useEffect(() => {
			if (messages.length > 0) {
				db.set("chatMessages:" + messages[0].conversation, sortedMessages, "chats").catch(console.error)
			}
		}, [JSON.stringify(messages)])

		useEffect(() => {
			scrolledUpRef.current = scrolledUp
			windowFocused.current = isFocused
			currentConversationMeRef.current = currentConversationMe
			currentConversationRef.current = currentConversation
			userIdRef.current = userId
			atBottomRef.current = atBottom
		}, [scrolledUp, isFocused, currentConversationMe, currentConversation, userId, atBottom])

		useEffect(() => {
			if (!initDoneRef.current) {
				initDoneRef.current = true

				initLastFocus()
			}

			window.addEventListener("focus", onFocus)

			return () => {
				window.removeEventListener("focus", onFocus)
			}
		}, [])

		useEffect(() => {
			fetchLastFocus()

			lastPreviousFetchTimestamp.current = 0

			setMessages([])
			setFirstMessageIndex(BIG_NUMBER)
			fetchMessages()
		}, [location.hash, currentConversation?.uuid])

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
						currentConversation={!lastFocusInitDone ? undefined : currentConversation}
						currentConversationMe={currentConversationMe}
						lastFocusTimestamp={lastFocusTimestamp}
						messages={sortedMessages}
						setLastFocusTimestamp={setLastFocusTimestamp}
						lang={lang}
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
							loading={!lastFocusInitDone ? true : loading}
							displayMessageAs={displayMessageAs}
							setDisplayMessageAs={setDisplayMessageAs}
							emojiPickerOpen={emojiPickerOpen}
							lang={lang}
							conversationUUID={currentConversation.uuid}
							contextMenuOpen={contextMenuOpen}
							firstMessageIndex={firstMessageIndex}
							setScrolledUp={setScrolledUp}
							unreadConversationsMessages={unreadConversationsMessages}
							setUnreadConversationsMessages={setUnreadConversationsMessages}
							editingMessageUUID={editingMessageUUID}
							replyMessageUUID={replyMessageUUID}
							lastFocusTimestamp={lastFocusTimestamp}
							setLastFocusTimestamp={setLastFocusTimestamp}
							currentConversation={currentConversation}
							atBottom={atBottom}
							setAtBottom={setAtBottom}
						/>
					)}
				</Flex>
				<Flex
					flexDirection="column"
					width={sizes.chatContainer + "px"}
					paddingLeft="15px"
					paddingRight="15px"
				>
					{currentConversation && emojiInitDone && lastFocusInitDone && (
						<Input
							darkMode={darkMode}
							isMobile={isMobile}
							currentConversation={currentConversation}
							currentConversationMe={currentConversationMe}
							messages={sortedMessages}
							setMessages={setMessages}
							setFailedMessages={setFailedMessages}
							lang={lang}
							setEmojiPickerOpen={setEmojiPickerOpen}
							conversationUUID={currentConversation.uuid}
							setEditingMessageUUID={setEditingMessageUUID}
							setReplyMessageUUID={setReplyMessageUUID}
						/>
					)}
				</Flex>
			</Flex>
		)
	}
)

export default Container
