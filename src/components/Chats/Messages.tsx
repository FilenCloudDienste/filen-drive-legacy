import { memo, useState, useRef, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import { ChatMessage } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import Message, { MessageSkeleton } from "./Message"
import db from "../../lib/db"
import { useVirtualizer } from "@tanstack/react-virtual"
import { DisplayMessageAs } from "./Container"

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
		emojiPickerOpen
	}: MessagesProps) => {
		const [userId] = useDb("userId", 0)
		const [isScrollingChat, setIsScrollingChat] = useState<boolean>(false)
		const isScrollingChatTimeout = useRef<NodeJS.Timeout | number | undefined>()
		const parentRef = useRef<HTMLDivElement>(null)

		const rowVirtualizer = useVirtualizer({
			count: messages.length,
			getScrollElement: () => parentRef.current,
			estimateSize: () => 40,
			overscan: 25,
			getItemKey: index => messages[index].uuid,
			onChange: instance => {
				clearTimeout(isScrollingChatTimeout.current)

				if (!instance.isScrolling) {
					isScrollingChatTimeout.current = setTimeout(() => {
						setIsScrollingChat(false)
					}, 500)

					return
				} else {
					setIsScrollingChat(true)
				}
			}
		})

		const virtualItems = rowVirtualizer.getVirtualItems()

		useEffect(() => {
			const scroller = parentRef.current as HTMLElement

			const handleScroll = (e: WheelEvent) => {
				e.preventDefault()

				const currentTarget = e.currentTarget as HTMLElement

				if (currentTarget) {
					currentTarget.scrollTop -= e.deltaY
				}
			}

			scroller?.addEventListener("wheel", handleScroll, {
				passive: false
			})

			return () => {
				scroller?.removeEventListener("wheel", handleScroll)
			}
		}, [parentRef.current])

		useEffect(() => {
			if (messages.length > 0) {
				db.set("chatMessages:" + messages[0].conversation, messages.slice(-100), "chats").catch(console.error)
			}
		}, [messages])

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
			<div
				style={{
					width: width + "px",
					height: height + "px",
					overflowX: "hidden",
					overflowY: "auto",
					transform: "rotate(180deg) scaleX(-1)"
				}}
				ref={parentRef}
			>
				<div
					style={{
						height: rowVirtualizer.getTotalSize() + "px",
						width: "100%",
						position: "relative"
					}}
				>
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: "translateY(" + virtualItems[0]?.start + "px)"
						}}
					>
						{virtualItems.map(item => {
							const message = messages[item.index]

							return (
								<div
									key={item.key}
									data-index={item.index}
									ref={rowVirtualizer.measureElement}
								>
									<Message
										darkMode={darkMode}
										isMobile={isMobile}
										failedMessages={failedMessages}
										message={message}
										prevMessage={messages[item.index + 1]}
										nextMessage={messages[item.index - 1]}
										userId={userId}
										isScrollingChat={isScrollingChat}
										displayMessageAs={displayMessageAs}
										setDisplayMessageAs={setDisplayMessageAs}
										emojiPickerOpen={emojiPickerOpen}
									/>
								</div>
							)
						})}
					</div>
				</div>
			</div>
		)
	}
)

export default Messages
