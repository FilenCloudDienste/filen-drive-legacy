import { memo, useMemo, useState, useEffect, useCallback } from "react"
import { Flex, Avatar, Popover, PopoverTrigger, Portal, Tooltip, PopoverContent, PopoverBody } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatMessage, chatDelete } from "../../lib/api"
import AppText from "../AppText"
import striptags from "striptags"
import { IoTrash } from "react-icons/io5"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDb from "../../lib/hooks/useDb"

function formatTimestamp(timestamp: number): string {
	const now = Date.now()
	const diff = now - timestamp

	// Convert milliseconds to seconds
	const seconds = Math.floor(diff / 1000)

	// Helper functions to format date and time
	const formatDate = (date: Date): string =>
		date.toLocaleDateString(window.navigator.language, { year: "numeric", month: "2-digit", day: "2-digit" })
	const formatTime = (date: Date): string => date.toLocaleTimeString(window.navigator.language, { hour: "2-digit", minute: "2-digit" })

	if (seconds <= 0) {
		return "now"
	}

	if (seconds < 60) {
		return `${seconds} seconds ago`
	} else if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60)
		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
	} else if (seconds < 86400) {
		const hours = Math.floor(seconds / 3600)
		return `${hours} hour${hours > 1 ? "s" : ""} ago`
	} else if (diff < 172800000) {
		const date = new Date(timestamp)
		const yesterday = new Date(now - 86400000) // 24 hours ago
		return `Yesterday at ${formatTime(date)}`
	} else if (diff < 2592000000) {
		const date = new Date(timestamp)
		return `Today at ${formatTime(date)}`
	} else {
		const date = new Date(timestamp)
		return `${formatDate(date)} ${formatTime(date)}`
	}
}

const MessageDate = memo(({ darkMode, isMobile, timestamp }: { darkMode: boolean; isMobile: boolean; timestamp: number }) => {
	const [date, setDate] = useState<string>(formatTimestamp(timestamp))

	useEffect(() => {
		const updateInterval = setInterval(() => {
			setDate(formatTimestamp(timestamp))
		}, 5000)

		return () => {
			clearInterval(updateInterval)
		}
	}, [])

	return (
		<AppText
			darkMode={darkMode}
			isMobile={isMobile}
			noOfLines={1}
			wordBreak="break-all"
			color={getColor(darkMode, "textSecondary")}
			marginLeft="8px"
			fontSize={11}
		>
			{date}
		</AppText>
	)
})

export interface ChatContainerMessagesMessageProps {
	darkMode: boolean
	isMobile: boolean
	message: ChatMessage
	prevMessage: ChatMessage | undefined
	nextMessage: ChatMessage | undefined
	failedMessages: string[]
	userId: number
}

const ChatContainerMessagesMessage = memo(
	({ darkMode, isMobile, message, failedMessages, prevMessage, nextMessage, userId }: ChatContainerMessagesMessageProps) => {
		const [hovering, setHovering] = useState<boolean>(false)
		const [hoveringPopover, setHoveringPopover] = useState<boolean>(false)

		const groupWithPrevMessage = useMemo(() => {
			if (!prevMessage) {
				return false
			}

			return (
				prevMessage.senderId === message.senderId &&
				Math.floor(prevMessage.sentTimestamp / 60000) === Math.floor(message.sentTimestamp / 60000)
			)
		}, [message, prevMessage])

		const groupWithNextMessage = useMemo(() => {
			if (!nextMessage) {
				return false
			}

			return (
				nextMessage.senderId === message.senderId &&
				Math.floor(nextMessage.sentTimestamp / 60000) === Math.floor(message.sentTimestamp / 60000)
			)
		}, [message, nextMessage])

		const deleteMessage = useCallback(async () => {
			const [err] = await safeAwait(chatDelete(message.uuid))

			if (err) {
				console.error(err)

				return
			}

			eventListener.emit("chatMessageDelete", message.uuid)
		}, [message.uuid])

		if (groupWithPrevMessage) {
			return (
				<Popover
					placement="top-end"
					isOpen={hovering}
				>
					<PopoverTrigger>
						<Flex
							flexDirection="row"
							paddingTop="1px"
							paddingBottom="1px"
							paddingRight="15px"
							paddingLeft="60px"
							className="user-select-text"
							userSelect="text"
							onMouseEnter={() => setHovering(true)}
							onMouseLeave={() => setHovering(false)}
							backgroundColor={hovering ? getColor(darkMode, "backgroundSecondary") : "transparent"}
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={
									failedMessages.includes(message.uuid) ? getColor(darkMode, "red") : getColor(darkMode, "textSecondary")
								}
								fontSize={14}
								wordBreak="break-word"
								marginTop="1px"
								className="user-select-text"
								userSelect="text"
							>
								{striptags(message.message)}
							</AppText>
						</Flex>
					</PopoverTrigger>
					{message.senderId === userId && (
						<Portal>
							<PopoverContent
								marginBottom="-20px"
								marginRight="15px"
								onMouseEnter={() => {
									setHovering(true)
									setHoveringPopover(true)
								}}
								onMouseLeave={() => {
									setHovering(false)
									setHoveringPopover(false)
								}}
								backgroundColor={getColor(darkMode, "backgroundSecondary")}
								boxShadow="md"
								width="auto"
								border="none"
								borderRadius="5px"
							>
								<PopoverBody
									border={"1px solid " + getColor(darkMode, "borderSecondary")}
									borderRadius="5px"
									padding="8px"
									flexDirection="row"
								>
									<Tooltip
										label="Delete"
										placement="top"
										borderRadius="5px"
										backgroundColor={getColor(darkMode, "backgroundSecondary")}
										boxShadow="md"
										color={getColor(darkMode, "textSecondary")}
										marginBottom="5px"
										hasArrow={true}
									>
										<Flex>
											<IoTrash
												size={20}
												cursor="pointer"
												color={getColor(darkMode, "textSecondary")}
												onClick={() => deleteMessage()}
											/>
										</Flex>
									</Tooltip>
								</PopoverBody>
							</PopoverContent>
						</Portal>
					)}
				</Popover>
			)
		}

		return (
			<Flex
				flexDirection="column"
				width="100%"
			>
				<Flex
					flexDirection="row"
					paddingTop="5px"
					paddingBottom={groupWithNextMessage ? "2px" : "5px"}
					paddingRight="15px"
					paddingLeft="15px"
					width="100%"
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
					backgroundColor={hovering ? getColor(darkMode, "backgroundSecondary") : "transparent"}
					className="user-select-text"
					userSelect="text"
				>
					<Flex>
						<Avatar
							name={
								typeof message.senderAvatar === "string" && message.senderAvatar.indexOf("https://") !== -1
									? undefined
									: message.senderEmail
							}
							src={
								typeof message.senderAvatar === "string" && message.senderAvatar.indexOf("https://") !== -1
									? message.senderAvatar
									: undefined
							}
							width="30px"
							height="30px"
							borderRadius="full"
							border="none"
							userSelect="none"
						/>
					</Flex>
					<Flex
						flexDirection="column"
						paddingLeft="15px"
						className="user-select-text"
						userSelect="text"
					>
						<Flex
							flexDirection="row"
							alignItems="center"
							className="user-select-text"
							userSelect="text"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textPrimary")}
								fontSize={15}
							>
								{typeof message.senderFirstName === "string" &&
								message.senderFirstName.length > 0 &&
								typeof message.senderLastName === "string" &&
								message.senderLastName.length > 0
									? message.senderFirstName + " " + message.senderLastName
									: message.senderEmail}
							</AppText>
							{!isMobile && (
								<MessageDate
									darkMode={darkMode}
									isMobile={isMobile}
									timestamp={message.sentTimestamp}
								/>
							)}
						</Flex>
						<Flex
							flexDirection="column"
							className="user-select-text"
							userSelect="text"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={
									failedMessages.includes(message.uuid) ? getColor(darkMode, "red") : getColor(darkMode, "textSecondary")
								}
								fontSize={14}
								wordBreak="break-word"
								marginTop="2px"
								className="user-select-text"
								userSelect="text"
							>
								{striptags(message.message)}
							</AppText>
						</Flex>
					</Flex>
				</Flex>
				<Flex
					flexDirection="row"
					width="100%"
					height="5px"
					backgroundColor="transparent"
				>
					&nbsp;
				</Flex>
			</Flex>
		)
	}
)

export interface ChatContainerMessagesProps {
	darkMode: boolean
	isMobile: boolean
	messages: ChatMessage[]
	failedMessages: string[]
}

const ChatContainerMessages = memo(({ darkMode, isMobile, messages, failedMessages }: ChatContainerMessagesProps) => {
	const [userId] = useDb("userId", 0)

	return (
		<>
			{messages.map((message, index) => {
				return (
					<ChatContainerMessagesMessage
						key={message.uuid}
						darkMode={darkMode}
						isMobile={isMobile}
						failedMessages={failedMessages}
						message={message}
						prevMessage={messages[index + 1]}
						nextMessage={messages[index - 1]}
						userId={userId}
					/>
				)
			})}
		</>
	)
})

export default ChatContainerMessages
