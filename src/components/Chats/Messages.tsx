import { memo, useState, useRef, useCallback, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import { ChatMessage, chatConversationsRead, contactsBlocked, BlockedContact } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import Message, { MessageSkeleton, ChatInfo } from "./Message"
import { DisplayMessageAs } from "./Container"
import { Virtuoso, VirtuosoHandle, ListItem } from "react-virtuoso"
import eventListener from "../../lib/eventListener"
import { useLocation } from "react-router-dom"
import { BIG_NUMBER } from "./Container"
import { SocketEvent } from "../../lib/services/socket"
import { getCurrentParent, Semaphore, safeAwait } from "../../lib/helpers"
import { useLocalStorage } from "react-use"
import useWindowFocus from "use-window-focus"
import useWindowHeight from "../../lib/hooks/useWindowHeight"

const markNotificationsAsReadMutex = new Semaphore(1)

const loadingMessages = new Array(32).fill(1).map(() => ({
	uuid: "",
	senderId: 0,
	senderEmail: "",
	senderAvatar: null,
	senderNickName: "",
	message: "",
	sentTimestamp: 0
})) as ChatMessage[]

export interface MessagesProps {
	darkMode: boolean
	isMobile: boolean
	messages: ChatMessage[]
	failedMessages: string[]
	width: number
	height: number
	loading: boolean
	displayMessageAs: DisplayMessageAs
	setDisplayMessageAs: React.Dispatch<React.SetStateAction<DisplayMessageAs>>
	emojiPickerOpen: boolean
	lang: string
	conversationUUID: string
	contextMenuOpen: string
	firstMessageIndex: number
	setScrolledUp: React.Dispatch<React.SetStateAction<boolean>>
	unreadConversationsMessages: Record<string, number>
	setUnreadConversationsMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>
	editingMessageUUID: string
}

export const Messages = memo(
	({
		darkMode,
		isMobile,
		messages,
		failedMessages,
		width,
		height,
		loading,
		displayMessageAs,
		setDisplayMessageAs,
		emojiPickerOpen,
		lang,
		conversationUUID,
		contextMenuOpen,
		firstMessageIndex,
		setScrolledUp,
		unreadConversationsMessages,
		setUnreadConversationsMessages,
		editingMessageUUID
	}: MessagesProps) => {
		const [userId] = useDb("userId", 0)
		const [isScrollingChat, setIsScrollingChat] = useState<boolean>(false)
		const isScrollingChatTimeout = useRef<ReturnType<typeof setTimeout>>()
		const isScrollingChatRef = useRef<boolean>(false)
		const virtuosoRef = useRef<VirtuosoHandle>(null)
		const location = useLocation()
		const [initalLoadDone, setInitialLoadDone] = useState<boolean>(false)
		const initalLoadDoneTimer = useRef<ReturnType<typeof setTimeout>>()
		const [atBottom, setAtBottom] = useState<boolean>(true)
		const isFocused = useWindowFocus()
		const lastMessageUUID = useRef<string>("")
		const atBottomRef = useRef<boolean>(atBottom)
		const isFocusedRef = useRef<boolean>(isFocused)
		const userIdRef = useRef<number>(userId)
		const markNotificationsAsReadLastMessageRef = useRef<string>("")
		const messagesRef = useRef<ChatMessage[]>(messages)
		const [blockedContacts, setBlockedContacts] = useState<BlockedContact[]>([])
		const mountedRef = useRef<boolean>(false)
		const [lastFocusTimestamp, setLastFocusTimestamp] = useLocalStorage<Record<string, number>>("chatsLastFocusTimestamp", {
			[conversationUUID]: Date.now() + 1000
		})
		const lastFocusTimestampTimerRef = useRef<ReturnType<typeof setTimeout>>()
		const windowHeight = useWindowHeight()

		const getItemKey = useCallback((_: number, message: ChatMessage) => JSON.stringify(message), [])

		const onScroll = useCallback((scrolling: boolean) => {
			clearTimeout(isScrollingChatTimeout.current)

			isScrollingChatRef.current = scrolling

			if (!scrolling) {
				isScrollingChatTimeout.current = setTimeout(() => {
					setIsScrollingChat(false)
				}, 500)
			} else {
				setIsScrollingChat(true)
			}
		}, [])

		const scrollEvent = useCallback((e: React.UIEvent<HTMLDivElement, UIEvent>) => {
			const target = e.target as HTMLDivElement

			if (target && target.scrollTop + target.clientHeight < target.scrollHeight) {
				setScrolledUp(true)
			} else {
				setScrolledUp(false)
			}
		}, [])

		const followOutput = useCallback((isAtBottom: boolean) => (!initalLoadDone ? true : isAtBottom), [initalLoadDone])

		const rangeChanged = useCallback(() => {
			if (!initalLoadDone) {
				virtuosoRef.current?.scrollTo({
					top: BIG_NUMBER
				})
			}
		}, [initalLoadDone])

		const atBottomStateChange = useCallback((bottom: boolean) => {
			setAtBottom(bottom)

			atBottomRef.current = bottom
		}, [])

		const atTopStateChange = useCallback(
			(atTop: boolean) => {
				if (atTop && messages.length > 0 && initalLoadDone) {
					eventListener.emit("messagesTopReached", messages[0].sentTimestamp)
				}
			},
			[messages, initalLoadDone]
		)

		const itemsRendered = useCallback(
			(items: ListItem<ChatMessage>[]) => {
				if (items.length > 0 && messages.length > 0) {
					eventListener.emit("showChatScrollDownBtn", messages.length - (items[items.length - 1].originalIndex || 0) > 150)
				}
			},
			[messages]
		)

		const itemContent = useCallback(
			(_: number, message: ChatMessage) => {
				const index = messages.findIndex(m => m.uuid === message.uuid)

				return (
					<div
						key={getItemKey(index, message)}
						style={{
							overflowAnchor: "none"
						}}
					>
						<Message
							darkMode={darkMode}
							isMobile={isMobile}
							failedMessages={failedMessages}
							message={message}
							prevMessage={messages[index - 1]}
							nextMessage={messages[index + 1]}
							userId={userId}
							isScrollingChat={isScrollingChat}
							displayMessageAs={displayMessageAs}
							setDisplayMessageAs={setDisplayMessageAs}
							emojiPickerOpen={emojiPickerOpen}
							lang={lang}
							contextMenuOpen={contextMenuOpen}
							blockedContacts={blockedContacts}
							lastFocusTimestamp={lastFocusTimestamp}
							setLastFocusTimestamp={setLastFocusTimestamp}
							editingMessageUUID={editingMessageUUID}
						/>
					</div>
				)
			},
			[
				darkMode,
				isMobile,
				failedMessages,
				messages,
				userId,
				isScrollingChat,
				displayMessageAs,
				setDisplayMessageAs,
				emojiPickerOpen,
				lang,
				contextMenuOpen,
				blockedContacts,
				lastFocusTimestamp,
				setLastFocusTimestamp,
				editingMessageUUID
			]
		)

		const fetchBlockedContacts = useCallback(async () => {
			const [err, res] = await safeAwait(contactsBlocked())

			if (err) {
				console.error(err)

				return
			}

			setBlockedContacts(res)
		}, [])

		const markNotificationsAsRead = useCallback(async (convo: string) => {
			try {
				await chatConversationsRead(convo)

				eventListener.emit("sidebarUpdateChatNotifications")

				setUnreadConversationsMessages(prev => ({
					...prev,
					[convo]: 0
				}))
			} catch (e) {
				console.error(e)
			}
		}, [])

		const onFocus = useCallback(() => {
			clearTimeout(lastFocusTimestampTimerRef.current)

			lastFocusTimestampTimerRef.current = setTimeout(() => {
				setLastFocusTimestamp(prev => ({
					...prev,
					[conversationUUID]: Date.now() - 1000
				}))
			}, 30000)
		}, [conversationUUID])

		const onBlur = useCallback(() => {
			clearTimeout(lastFocusTimestampTimerRef.current)

			setLastFocusTimestamp(prev => ({
				...prev,
				[conversationUUID]: Date.now() - 1000
			}))
		}, [conversationUUID])

		useEffect(() => {
			clearTimeout(lastFocusTimestampTimerRef.current)
		}, [(lastFocusTimestamp || {})[conversationUUID]])

		useEffect(() => {
			;(async () => {
				await markNotificationsAsReadMutex.acquire()

				if (
					messages.length > 0 &&
					markNotificationsAsReadLastMessageRef.current !== messages[messages.length - 1].uuid &&
					isFocused &&
					atBottom
				) {
					try {
						await markNotificationsAsRead(conversationUUID)

						markNotificationsAsReadLastMessageRef.current = messages[messages.length - 1].uuid
					} catch (e) {
						console.error(e)
					}
				}

				markNotificationsAsReadMutex.release()
			})()
		}, [messages, atBottom, isFocused, conversationUUID, userId])

		useEffect(() => {
			clearTimeout(initalLoadDoneTimer.current)
			clearTimeout(lastFocusTimestampTimerRef.current)

			setAtBottom(true)
			onFocus()

			eventListener.emit("showChatScrollDownBtn", false)

			const interval = setInterval(() => {
				if (messages.length > 0 && !isScrollingChatRef.current) {
					virtuosoRef.current?.scrollTo({
						top: BIG_NUMBER
					})
				}
			}, 1)

			setTimeout(() => clearInterval(interval), 1000)

			initalLoadDoneTimer.current = setTimeout(() => {
				setInitialLoadDone(true)
			}, 250)

			return () => {
				clearTimeout(lastFocusTimestampTimerRef.current)

				setLastFocusTimestamp(prev => ({
					...prev,
					[conversationUUID]: Date.now() - 1000
				}))

				clearTimeout(initalLoadDoneTimer.current)
			}
		}, [location.hash, conversationUUID, messages[0]?.conversation])

		useEffect(() => {
			virtuosoRef.current?.scrollTo({
				top: BIG_NUMBER
			})
		}, [height, location.hash, conversationUUID, messages[0]?.conversation])

		useEffect(() => {
			if (atBottom && messages.length > 0 && messages[messages.length - 1].uuid !== lastMessageUUID.current) {
				lastMessageUUID.current = messages[messages.length - 1].uuid

				virtuosoRef.current?.scrollTo({
					top: BIG_NUMBER
				})
			}
		}, [atBottom, messages])

		useEffect(() => {
			atBottomRef.current = atBottom
			isFocusedRef.current = isFocused
			userIdRef.current = userId
			messagesRef.current = messages
		}, [atBottom, isFocused, userId, messages])

		useEffect(() => {
			if (!lastFocusTimestamp || typeof lastFocusTimestamp[conversationUUID] !== "number") {
				setLastFocusTimestamp(prev => ({
					...prev,
					[conversationUUID]: Date.now() - 1000
				}))
			}

			window.addEventListener("blur", onBlur)
			window.addEventListener("focus", onFocus)

			const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
				if (
					event.type === "chatMessageNew" &&
					event.data.senderId === userIdRef.current &&
					event.data.conversation === conversationUUID
				) {
					setLastFocusTimestamp(prev => ({
						...prev,
						[conversationUUID]: Date.now() - 1000
					}))
				}

				if (event.type === "chatMessageNew" && event.data.senderId !== userIdRef.current) {
					if (getCurrentParent(window.location.href) !== event.data.conversation) {
						setUnreadConversationsMessages(prev => ({
							...prev,
							[event.data.conversation]:
								typeof prev[event.data.conversation] !== "number" ? 1 : prev[event.data.conversation] + 1
						}))
					} else {
						if (!atBottomRef.current || !isFocusedRef.current) {
							setUnreadConversationsMessages(prev => ({
								...prev,
								[event.data.conversation]:
									typeof prev[event.data.conversation] !== "number" ? 1 : prev[event.data.conversation] + 1
							}))
						}
					}
				}
			})

			const scrollChatToBottomListener = eventListener.on("scrollChatToBottom", (behavior?: any | undefined) => {
				if (virtuosoRef.current) {
					virtuosoRef.current.scrollTo({
						top: BIG_NUMBER,
						behavior
					})
				}
			})

			const chatMessageSentListener = eventListener.on("chatMessageSent", (sentMessage: ChatMessage) => {
				if (sentMessage.conversation === conversationUUID && sentMessage.senderId === userIdRef.current) {
					setLastFocusTimestamp(prev => ({
						...prev,
						[conversationUUID]: Date.now() - 1000
					}))
				}
			})

			return () => {
				clearTimeout(lastFocusTimestampTimerRef.current)

				window.removeEventListener("blur", onBlur)
				window.removeEventListener("focus", onFocus)

				scrollChatToBottomListener.remove()
				socketEventListener.remove()
				chatMessageSentListener.remove()
			}
		}, [])

		useEffect(() => {
			if (!mountedRef.current) {
				mountedRef.current = true

				fetchBlockedContacts()
			}

			const fetchBlockedContactsInterval = setInterval(fetchBlockedContacts, 60000)

			const contactBlockedListener = eventListener.on("contactBlocked", () => fetchBlockedContacts())

			return () => {
				clearInterval(fetchBlockedContactsInterval)

				contactBlockedListener.remove()
			}
		}, [])

		if (loading) {
			return (
				<Flex
					flexDirection="column-reverse"
					height={height + "px"}
					width={width + "px"}
					overflow="hidden"
					transition="200ms"
				>
					{loadingMessages.map((_, index) => {
						return (
							<MessageSkeleton
								key={index}
								index={index}
								darkMode={darkMode}
								isMobile={isMobile}
							/>
						)
					})}
				</Flex>
			)
		}

		if (messages.length === 0) {
			return (
				<Flex
					flexDirection="column-reverse"
					height={height + "px"}
					width={width + "px"}
					overflow="hidden"
					transition="200ms"
				>
					<ChatInfo
						darkMode={darkMode}
						isMobile={isMobile}
						lang={lang}
					/>
				</Flex>
			)
		}

		return (
			<Virtuoso
				key={"chat-messages-" + messages[0]?.conversation}
				ref={virtuosoRef}
				data={messages}
				totalCount={messages.length}
				height={height}
				width={width}
				atBottomThreshold={100}
				alignToBottom={true}
				computeItemKey={getItemKey}
				initialTopMostItemIndex={9999}
				firstItemIndex={firstMessageIndex}
				defaultItemHeight={50}
				followOutput={followOutput}
				isScrolling={onScroll}
				itemContent={itemContent}
				atBottomStateChange={atBottomStateChange}
				rangeChanged={rangeChanged}
				atTopStateChange={atTopStateChange}
				onScroll={scrollEvent}
				atTopThreshold={300}
				itemsRendered={itemsRendered}
				overscan={Math.round(windowHeight * 2)}
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: height + "px",
					width: width + "px"
				}}
			/>
		)
	}
)

export default Messages
