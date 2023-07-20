import { memo, useState, useCallback, useRef, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import { ChatMessage } from "../../lib/api"
import eventListener from "../../lib/eventListener"
import useDb from "../../lib/hooks/useDb"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import Message, { MessageSkeleton } from "./Message"
import db from "../../lib/db"

export interface MessagesProps {
	darkMode: boolean
	isMobile: boolean
	messages: ChatMessage[]
	failedMessages: string[]
	width: number
	height: number
	loading: boolean
	conversationUUID: string
}

const loadingMessages = new Array(32).fill(1).map(() => ({
	uuid: "",
	senderId: 0,
	senderEmail: "",
	senderAvatar: null,
	senderNickName: "",
	message: "",
	sentTimestamp: 0
})) as ChatMessage[]

export const Messages = memo(
	({ darkMode, isMobile, messages, failedMessages, width, height, loading, conversationUUID }: MessagesProps) => {
		const [userId] = useDb("userId", 0)
		const [isScrollingChat, setIsScrollingChat] = useState<boolean>(false)
		const [isAtBottom, setIsAtBottom] = useState<boolean>(false)
		const virtuosoRef = useRef<VirtuosoHandle>(null)
		const [firstLoadMessageUUID, setFirstLoadMessageUUID] = useState<string>("")
		const firstLoadConvoUUID = useRef<string>("")

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

		useEffect(() => {
			if (conversationUUID !== firstLoadConvoUUID.current && messages.length > 0) {
				firstLoadConvoUUID.current = conversationUUID

				setFirstLoadMessageUUID(messages[messages.length - 1].uuid)
			}

			if (messages.length > 0) {
				db.set("chatMessages:" + conversationUUID, messages.slice(-100), "chats").catch(console.error)
			}
		}, [conversationUUID, messages])

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
							/>
						)
					})}
				</Flex>
			)
		}

		return (
			<Virtuoso
				key={"messages-" + conversationUUID + "-" + firstLoadMessageUUID}
				data={messages}
				ref={virtuosoRef}
				height={height}
				atBottomStateChange={atBottomStateChange}
				isScrolling={setIsScrollingChat}
				width={width}
				followOutput={followOutput}
				itemContent={itemContent}
				totalCount={messages.length}
				initialTopMostItemIndex={99999}
				atTopStateChange={atTopStateChange}
				overscan={8}
				style={{
					overflowX: "hidden",
					overflowY: loading ? "hidden" : "auto",
					transition: "200ms",
					height: height + "px",
					width: width + "px"
				}}
			/>
		)
	}
)

export default Messages
