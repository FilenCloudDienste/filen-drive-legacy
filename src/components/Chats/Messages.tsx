import { memo, useState, useRef, useCallback, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import { ChatMessage } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import Message, { MessageSkeleton } from "./Message"
import { DisplayMessageAs } from "./Container"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import eventListener from "../../lib/eventListener"
import { useLocation } from "react-router-dom"

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
		contextMenuOpen
	}: MessagesProps) => {
		const [userId] = useDb("userId", 0)
		const [isScrollingChat, setIsScrollingChat] = useState<boolean>(false)
		const isScrollingChatTimeout = useRef<NodeJS.Timeout | number | undefined>()
		const virtuosoRef = useRef<VirtuosoHandle>(null)
		const location = useLocation()
		const [initalLoadDone, setInitialLoadDone] = useState<boolean>(false)
		const initalLoadDoneTimer = useRef<ReturnType<typeof setTimeout>>()
		const [atBottom, setAtBottom] = useState<boolean>(true)
		const lastMessageUUID = useRef<string>("")

		const getItemKey = useCallback((_: number, message: ChatMessage) => JSON.stringify(message), [])

		const onScroll = useCallback((scrolling: boolean) => {
			clearTimeout(isScrollingChatTimeout.current)

			if (!scrolling) {
				isScrollingChatTimeout.current = setTimeout(() => {
					setIsScrollingChat(false)
				}, 500)
			} else {
				setIsScrollingChat(true)
			}
		}, [])

		const followOutput = useCallback((isAtBottom: boolean) => (!initalLoadDone ? true : isAtBottom), [initalLoadDone])

		const rangeChanged = useCallback(() => {
			if (!initalLoadDone) {
				virtuosoRef.current?.scrollTo({
					top: Number.MAX_SAFE_INTEGER
				})
			}
		}, [initalLoadDone])

		const itemContent = useCallback(
			(index: number, message: ChatMessage) => {
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

			if (messages.length > 0) {
				virtuosoRef.current?.scrollTo({
					top: Number.MAX_SAFE_INTEGER
				})
			}

			initalLoadDoneTimer.current = setTimeout(() => {
				if (messages.length > 0) {
					virtuosoRef.current?.scrollTo({
						top: Number.MAX_SAFE_INTEGER
					})
				}

				setTimeout(() => {
					setInitialLoadDone(true)

					if (messages.length > 0) {
						virtuosoRef.current?.scrollTo({
							top: Number.MAX_SAFE_INTEGER
						})
					}

					setTimeout(() => {
						if (messages.length > 0) {
							virtuosoRef.current?.scrollTo({
								top: Number.MAX_SAFE_INTEGER
							})
						}
					}, 250)
				}, 250)
			}, 100)

			return () => {
				clearTimeout(initalLoadDoneTimer.current)
			}
		}, [location.hash, conversationUUID, messages[0]?.conversation])

		useEffect(() => {
			virtuosoRef.current?.scrollTo({
				top: Number.MAX_SAFE_INTEGER
			})
		}, [height, location.hash, conversationUUID, messages[0]?.conversation])

		useEffect(() => {
			if (atBottom && messages.length > 0 && messages[messages.length - 1].uuid !== lastMessageUUID.current) {
				lastMessageUUID.current = messages[messages.length - 1].uuid

				virtuosoRef.current?.scrollTo({
					top: Number.MAX_SAFE_INTEGER
				})
			}
		}, [atBottom, messages])

		useEffect(() => {
			const scrollChatToBottomListener = eventListener.on("scrollChatToBottom", () => {
				if (virtuosoRef.current) {
					virtuosoRef.current.scrollTo({
						top: Number.MAX_SAFE_INTEGER
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

		return (
			<Virtuoso
				key={"chat-messages-" + messages[0]?.conversation}
				ref={virtuosoRef}
				data={messages}
				height={height}
				width={width}
				atBottomThreshold={100}
				alignToBottom={true}
				computeItemKey={getItemKey}
				initialTopMostItemIndex={9999}
				defaultItemHeight={50}
				followOutput={followOutput}
				isScrolling={onScroll}
				itemContent={itemContent}
				atBottomStateChange={setAtBottom}
				rangeChanged={rangeChanged}
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
