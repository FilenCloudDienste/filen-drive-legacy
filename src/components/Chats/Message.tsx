import { memo, useMemo, useState, useEffect } from "react"
import { Flex, Avatar, Skeleton, Link } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatMessage } from "../../lib/api"
import AppText from "../AppText"
import striptags from "striptags"
import { getRandomArbitrary, randomStringUnsafe, generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import {
	getUserNameFromMessage,
	formatMessageDate,
	isTimestampSameDay,
	ReplaceMessageWithComponents,
	extractLinksFromString
} from "./utils"
import Linkify from "react-linkify"
import { DisplayMessageAs } from "./Container"
import Embed from "./Embed"

export const MessageSkeleton = memo(({ index, darkMode, isMobile }: { index: number; darkMode: boolean; isMobile: boolean }) => {
	return (
		<Flex
			flexDirection="column"
			width="100%"
			paddingTop="5px"
		>
			<Flex
				flexDirection="row"
				paddingTop={index === 0 ? "15px" : "3px"}
				paddingBottom="3px"
				paddingRight="15px"
				paddingLeft="15px"
				width="100%"
			>
				<Flex>
					<Skeleton
						startColor={getColor(darkMode, "backgroundSecondary")}
						endColor={getColor(darkMode, "backgroundTertiary")}
						width="32px"
						height="32px"
						borderRadius="full"
					>
						<Avatar
							name="skeleton"
							width="32px"
							height="32px"
							borderRadius="full"
						/>
					</Skeleton>
				</Flex>
				<Flex
					flexDirection="column"
					paddingLeft="15px"
				>
					<Flex
						flexDirection="row"
						alignItems="center"
						justifyContent="center"
					>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
							paddingLeft="10px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textPrimary")}
								fontSize={15}
								as="span"
							>
								{randomStringUnsafe(getRandomArbitrary(8, 128))}
							</AppText>
						</Skeleton>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	)
})

export const MessageDate = memo(({ darkMode, isMobile, timestamp }: { darkMode: boolean; isMobile: boolean; timestamp: number }) => {
	const [date, setDate] = useState<string>(formatMessageDate(timestamp))

	useEffect(() => {
		const updateInterval = setInterval(() => {
			setDate(formatMessageDate(timestamp))
		}, getRandomArbitrary(10000, 15000))

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
			paddingLeft="8px"
			fontSize={11}
			as="span"
		>
			{date}
		</AppText>
	)
})

export const DateDivider = memo(({ timestamp, darkMode, isMobile }: { timestamp: number; darkMode: boolean; isMobile: boolean }) => {
	return (
		<Flex
			width="100%"
			height="30px"
			flexDirection="row"
			justifyContent="space-between"
			gap="1px"
			paddingLeft="15px"
			paddingRight="15px"
			alignItems="center"
			paddingBottom="15px"
		>
			<Flex
				flex={4}
				height="1px"
				backgroundColor={getColor(darkMode, "borderPrimary")}
			/>
			<Flex
				width="auto"
				justifyContent="center"
				paddingLeft="8px"
				paddingRight="8px"
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					color={getColor(darkMode, "textSecondary")}
					fontSize={11}
					as="span"
				>
					{new Date(timestamp).toDateString()}
				</AppText>
			</Flex>
			<Flex
				flex={4}
				height="1px"
				backgroundColor={getColor(darkMode, "borderPrimary")}
			/>
		</Flex>
	)
})

export interface MessagTextProps {
	message: ChatMessage
	failedMessages: string[]
	darkMode: boolean
	isMobile: boolean
}

export const MessageText = memo(({ message, failedMessages, darkMode, isMobile }: MessagTextProps) => {
	return (
		<Flex
			flexDirection="row"
			gap="4px"
			color={failedMessages.includes(message.uuid) ? getColor(darkMode, "red") : getColor(darkMode, "textSecondary")}
			fontSize={14}
			wordBreak="break-all"
			className="user-select-text"
			userSelect="text"
		>
			<pre
				className="user-select-text"
				style={{
					maxWidth: "100%",
					whiteSpace: "pre-wrap",
					overflow: "hidden",
					margin: "0px",
					textIndent: 0,
					userSelect: "text"
				}}
			>
				<ReplaceMessageWithComponents
					content={message.message}
					darkMode={darkMode}
				/>
			</pre>
		</Flex>
	)
})

export interface MessageContentProps {
	message: ChatMessage
	isMobile: boolean
	darkMode: boolean
	hovering: boolean
	userId: number
	isScrollingChat: boolean
	failedMessages: string[]
}

export const MessageContent = memo(
	({ message, isMobile, darkMode, hovering, userId, isScrollingChat, failedMessages }: MessageContentProps) => {
		return (
			<Flex
				flexDirection="row"
				wordBreak="break-all"
				className="user-select-text"
				userSelect="text"
			>
				{extractLinksFromString(message.message).length > 0 && !message.embedDisabled ? (
					<Embed
						darkMode={darkMode}
						isMobile={isMobile}
						message={message}
						userId={userId}
						hoveringMessage={hovering}
						isScrollingChat={isScrollingChat}
						failedMessages={failedMessages}
					/>
				) : (
					<MessageText
						message={message}
						failedMessages={failedMessages}
						darkMode={darkMode}
						isMobile={isMobile}
					/>
				)}
			</Flex>
		)
	}
)

export interface MessageProps {
	darkMode: boolean
	isMobile: boolean
	message: ChatMessage
	prevMessage: ChatMessage | undefined
	nextMessage: ChatMessage | undefined
	failedMessages: string[]
	userId: number
	isScrollingChat: boolean
	displayMessageAs: DisplayMessageAs
	setDisplayMessageAs: React.Dispatch<React.SetStateAction<DisplayMessageAs>>
	emojiPickerOpen: boolean
	lang: string
	contextMenuOpen: string
}

export const Message = memo(
	({
		darkMode,
		isMobile,
		message,
		failedMessages,
		prevMessage,
		nextMessage,
		userId,
		isScrollingChat,
		displayMessageAs,
		setDisplayMessageAs,
		emojiPickerOpen,
		lang,
		contextMenuOpen
	}: MessageProps) => {
		const [hoveringMessage, setHoveringMessage] = useState<boolean>(false)

		const hovering = useMemo(() => {
			return hoveringMessage || contextMenuOpen === message.uuid
		}, [message, contextMenuOpen, hoveringMessage])

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

		const dontGroupWithNextMessage = useMemo(() => {
			if (!nextMessage) {
				return true
			}

			return (
				nextMessage.senderId !== message.senderId ||
				Math.floor(nextMessage.sentTimestamp / 60000) !== Math.floor(message.sentTimestamp / 60000)
			)
		}, [message, nextMessage])

		const prevMessageSameDay = useMemo(() => {
			if (!prevMessage) {
				return true
			}

			return isTimestampSameDay(prevMessage.sentTimestamp, message.sentTimestamp)
		}, [prevMessage, message])

		if (groupWithPrevMessage) {
			return (
				<>
					<Flex
						onContextMenu={e => {
							e.preventDefault()

							eventListener.emit("openChatMessageContextMenu", {
								message,
								event: e,
								position: {
									x: e.nativeEvent.clientX,
									y: e.nativeEvent.clientY
								}
							})
						}}
						flexDirection="column"
						paddingTop="3px"
						paddingBottom={!nextMessage ? "15px" : "3px"}
						onMouseEnter={() => setHoveringMessage(true)}
						onMouseLeave={() => setHoveringMessage(false)}
						backgroundColor={hovering && !isScrollingChat ? getColor(darkMode, "backgroundSecondary") : "transparent"}
					>
						<Flex
							flexDirection="column"
							paddingRight="15px"
							paddingLeft="62px"
							className="user-select-text"
							userSelect="text"
						>
							<MessageContent
								message={message}
								darkMode={darkMode}
								isMobile={isMobile}
								failedMessages={failedMessages}
								hovering={hovering}
								userId={userId}
								isScrollingChat={isScrollingChat}
							/>
						</Flex>
					</Flex>
					{nextMessage && (!groupWithNextMessage || dontGroupWithNextMessage) && (
						<Flex
							flexDirection="row"
							width="100%"
							height="15px"
							backgroundColor="transparent"
						/>
					)}
				</>
			)
		}

		return (
			<>
				{!prevMessageSameDay && (
					<DateDivider
						timestamp={message.sentTimestamp}
						darkMode={darkMode}
						isMobile={isMobile}
					/>
				)}
				<Flex
					flexDirection="column"
					width="100%"
					paddingBottom={!nextMessage ? "15px" : undefined}
					className="user-select-text"
					userSelect="text"
					onContextMenu={e => {
						e.preventDefault()

						eventListener.emit("openChatMessageContextMenu", {
							message,
							event: e,
							position: {
								x: e.nativeEvent.clientX,
								y: e.nativeEvent.clientY
							}
						})
					}}
					onMouseEnter={() => setHoveringMessage(true)}
					onMouseLeave={() => setHoveringMessage(false)}
					backgroundColor={hovering && !isScrollingChat ? getColor(darkMode, "backgroundSecondary") : "transparent"}
				>
					<Flex
						flexDirection="row"
						paddingTop={!prevMessage ? "15px" : "3px"}
						paddingBottom="3px"
						paddingRight="15px"
						paddingLeft="15px"
						width="100%"
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
								bg={generateAvatarColorCode(message.senderEmail, darkMode)}
								width="32px"
								height="32px"
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
									className="user-select-text"
									userSelect="text"
									as="span"
								>
									{striptags(getUserNameFromMessage(message))}
								</AppText>
								{!isMobile && (
									<MessageDate
										darkMode={darkMode}
										isMobile={isMobile}
										timestamp={message.sentTimestamp}
									/>
								)}
							</Flex>
							<MessageContent
								message={message}
								darkMode={darkMode}
								isMobile={isMobile}
								failedMessages={failedMessages}
								hovering={hovering}
								userId={userId}
								isScrollingChat={isScrollingChat}
							/>
						</Flex>
					</Flex>
				</Flex>
				{nextMessage && (!groupWithNextMessage || dontGroupWithNextMessage) && (
					<Flex
						flexDirection="row"
						width="100%"
						height="15px"
						backgroundColor="transparent"
					/>
				)}
			</>
		)
	}
)

export default Message
