import { memo, useState, useRef, useCallback, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import { ChatMessage } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import Message, { MessageSkeleton, ChatInfo } from "./Message"
import { DisplayMessageAs } from "./Container"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import eventListener from "../../lib/eventListener"
import { useLocation } from "react-router-dom"
import { BIG_NUMBER } from "./Container"

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
		setScrolledUp
	}: MessagesProps) => {
		const [userId] = useDb("userId", 0)
		const [isScrollingChat, setIsScrollingChat] = useState<boolean>(false)
		const isScrollingChatTimeout = useRef<NodeJS.Timeout | number | undefined>()
		const isScrollingChatRef = useRef<boolean>(false)
		const virtuosoRef = useRef<VirtuosoHandle>(null)
		const location = useLocation()
		const [initalLoadDone, setInitialLoadDone] = useState<boolean>(false)
		const initalLoadDoneTimer = useRef<ReturnType<typeof setTimeout>>()
		const [atBottom, setAtBottom] = useState<boolean>(true)
		const lastMessageUUID = useRef<string>("")

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

		const atTopStateChange = useCallback(
			(atTop: boolean) => {
				if (atTop && messages.length > 0 && initalLoadDone) {
					eventListener.emit("messagesTopReached", messages[0].sentTimestamp)
				}
			},
			[messages, initalLoadDone]
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
				contextMenuOpen
			]
		)

		useEffect(() => {
			clearTimeout(initalLoadDoneTimer.current)

			const interval = setInterval(() => {
				if (messages.length > 0 && !isScrollingChatRef.current) {
					virtuosoRef.current?.scrollTo({
						top: BIG_NUMBER
					})
				}
			}, 1)

			setTimeout(() => clearInterval(interval), 500)

			initalLoadDoneTimer.current = setTimeout(() => {
				setInitialLoadDone(true)
			}, 250)

			return () => {
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
			const scrollChatToBottomListener = eventListener.on("scrollChatToBottom", () => {
				if (virtuosoRef.current) {
					virtuosoRef.current.scrollTo({
						top: BIG_NUMBER
					})
				}
			})

			return () => {
				scrollChatToBottomListener.remove()
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
				atBottomStateChange={setAtBottom}
				rangeChanged={rangeChanged}
				atTopStateChange={atTopStateChange}
				onScroll={scrollEvent}
				atTopThreshold={300}
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
