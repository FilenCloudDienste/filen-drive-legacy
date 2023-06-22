import { memo, useState, useCallback, useRef } from "react"
import { Flex } from "@chakra-ui/react"
import { ChatMessage } from "../../lib/api"
import eventListener from "../../lib/eventListener"
import useDb from "../../lib/hooks/useDb"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import Message, { MessageSkeleton } from "./Message"

export interface MessagesProps {
	darkMode: boolean
	isMobile: boolean
	messages: ChatMessage[]
	failedMessages: string[]
	width: number
	height: number
	loading: boolean
}

const loadingMessages = new Array(32).fill(1).map(() => ({
	uuid: "",
	senderId: 0,
	senderEmail: "",
	senderAvatar: null,
	senderFirstName: null,
	senderLastName: null,
	message: "",
	sentTimestamp: 0
})) as ChatMessage[]

export const Messages = memo(({ darkMode, isMobile, messages, failedMessages, width, height, loading }: MessagesProps) => {
	const windowHeight = useWindowHeight()
	const [userId] = useDb("userId", 0)
	const [isScrollingChat, setIsScrollingChat] = useState<boolean>(false)
	const [isAtBottom, setIsAtBottom] = useState<boolean>(false)
	const virtuosoRef = useRef<VirtuosoHandle>(null)

	const followOutput = useCallback(
		(atBottom: boolean) => {
			if (loading) {
				return false
			}

			return atBottom ? "smooth" : false
		},
		[loading]
	)

	const atTopStateChange = useCallback(
		(atTop: boolean) => {
			if (loading) {
				return
			}

			if (atTop) {
				eventListener.emit("messagesTopReached")
			}
		},
		[loading]
	)

	const atBottomStateChange = useCallback((atBottom: boolean) => {
		setIsAtBottom(atBottom)
	}, [])

	const itemContent = useCallback(
		(index: number, message: ChatMessage) => {
			return (
				<Message
					key={message.uuid}
					darkMode={darkMode}
					isMobile={isMobile}
					failedMessages={failedMessages}
					message={message}
					prevMessage={messages[index - 1]}
					nextMessage={messages[index + 1]}
					userId={userId}
					isScrollingChat={isScrollingChat}
					index={index}
				/>
			)
		},
		[darkMode, isMobile, userId, failedMessages, messages, isScrollingChat]
	)

	if (loading) {
		return (
			<Flex
				flexDirection="column-reverse"
				height={windowHeight - 50 + "px"}
				width={width + "px"}
				overflow="hidden"
				transition="200ms"
			>
				{loadingMessages.map((_, index) => {
					return (
						<MessageSkeleton
							key={index}
							index={index}
						/>
					)
				})}
			</Flex>
		)
	}

	return (
		<Virtuoso
			data={messages}
			ref={virtuosoRef}
			height={height}
			atBottomStateChange={atBottomStateChange}
			isScrolling={setIsScrollingChat}
			width={width}
			followOutput={followOutput}
			itemContent={itemContent}
			totalCount={messages.length}
			initialTopMostItemIndex={999}
			atTopStateChange={atTopStateChange}
			overscan={8}
			style={{
				overflowX: "hidden",
				overflowY: loading ? "hidden" : "auto",
				transition: "200ms"
			}}
		/>
	)
})

export default Messages
