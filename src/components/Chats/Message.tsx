import { memo, useMemo, useState, useEffect } from "react"
import { Flex, Avatar, Skeleton } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatMessage, BlockedContact, ChatConversation } from "../../lib/api"
import AppText from "../AppText"
import { getRandomArbitrary, randomStringUnsafe, generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import {
	getUserNameFromMessage,
	formatMessageDate,
	isTimestampSameDay,
	ReplaceMessageWithComponents,
	extractLinksFromString,
	getUserNameFromReplyTo,
	ReplaceInlineMessageWithComponents,
	MENTION_REGEX,
	isTimestampSameMinute
} from "./utils"
import { DisplayMessageAs } from "./Container"
import Embed from "./Embed"
import { i18n } from "../../i18n"
import { AiOutlineLock, AiOutlineCheckCircle } from "react-icons/ai"
import { isMessageLink } from "./utils"
import { VscReply } from "react-icons/vsc"

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

export const ChatInfo = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	return (
		<>
			<Flex
				flexDirection="column"
				paddingLeft="8px"
				paddingBottom="25px"
				gap="15px"
				paddingRight="15px"
			>
				<Flex
					flexDirection="column"
					gap="5px"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
						paddingLeft="8px"
						fontSize={22}
						noOfLines={1}
						wordBreak="break-all"
					>
						{i18n(lang, "chatInfoTitle")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textSecondary")}
						paddingLeft="8px"
						fontSize={13}
						noOfLines={1}
						wordBreak="break-all"
					>
						{i18n(lang, "chatInfoSubtitle1")}
					</AppText>
				</Flex>
				<Flex
					flexDirection="column"
					gap="15px"
					paddingLeft="6px"
				>
					<Flex
						flexDirection="row"
						gap="5px"
						alignItems="center"
					>
						<AiOutlineLock
							size={30}
							color={getColor(darkMode, "textPrimary")}
							style={{
								flexShrink: 0
							}}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							paddingLeft="8px"
							fontSize={14}
							noOfLines={1}
							wordBreak="break-all"
						>
							{i18n(lang, "chatInfoSubtitle2")}
						</AppText>
					</Flex>
					<Flex
						flexDirection="row"
						gap="5px"
						alignItems="center"
					>
						<AiOutlineCheckCircle
							size={30}
							color={getColor(darkMode, "textPrimary")}
							style={{
								flexShrink: 0
							}}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							paddingLeft="8px"
							fontSize={14}
							noOfLines={1}
							wordBreak="break-all"
						>
							{i18n(lang, "chatInfoSubtitle3")}
						</AppText>
					</Flex>
				</Flex>
			</Flex>
		</>
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

export const NewDivider = memo(
	({
		darkMode,
		isMobile,
		paddingTop,
		lang,
		setLastFocusTimestamp,
		conversationUUID
	}: {
		darkMode: boolean
		isMobile: boolean
		paddingTop?: string
		lang: string
		setLastFocusTimestamp: React.Dispatch<React.SetStateAction<Record<string, number> | undefined>>
		conversationUUID: string
	}) => {
		return (
			<Flex
				width="100%"
				height="20px"
				flexDirection="row"
				justifyContent="space-between"
				gap="0px"
				paddingLeft="15px"
				paddingRight="15px"
				alignItems="center"
				paddingBottom="15px"
				paddingTop={paddingTop}
			>
				<Flex
					flex={5}
					height="1px"
					backgroundColor={getColor(darkMode, "red")}
				/>
				<Flex
					width="auto"
					justifyContent="center"
					paddingLeft="8px"
					paddingRight="8px"
					backgroundColor={getColor(darkMode, "red")}
					borderRadius="5px"
					cursor="pointer"
					onClick={() =>
						setLastFocusTimestamp(prev => ({
							...prev,
							[conversationUUID]: Date.now()
						}))
					}
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color="white"
						fontSize={11}
						as="span"
						fontWeight="bold"
					>
						{i18n(lang, "new").toUpperCase()}
					</AppText>
				</Flex>
			</Flex>
		)
	}
)

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

export interface ReplyToProps {
	darkMode: boolean
	isMobile: boolean
	message: ChatMessage
	hideArrow: boolean
	currentConversation: ChatConversation
}

export const ReplyTo = memo(({ darkMode, isMobile, message, hideArrow, currentConversation }: ReplyToProps) => {
	return (
		<Flex
			flexDirection="row"
			gap="7px"
			alignItems="center"
			paddingBottom="7px"
			paddingLeft={hideArrow ? "38px" : "23px"}
			paddingTop={hideArrow ? "3px" : "2px"}
		>
			{!hideArrow && (
				<VscReply
					size={17}
					color={getColor(darkMode, "textSecondary")}
					style={{
						transform: "scaleX(-1)",
						flexShrink: 0
					}}
				/>
			)}
			<Avatar
				name={
					typeof message.replyTo.senderAvatar === "string" && message.replyTo.senderAvatar.indexOf("https://") !== -1
						? undefined
						: message.replyTo.senderEmail
				}
				src={
					typeof message.replyTo.senderAvatar === "string" && message.replyTo.senderAvatar.indexOf("https://") !== -1
						? message.replyTo.senderAvatar
						: undefined
				}
				bg={generateAvatarColorCode(message.replyTo.senderEmail, darkMode)}
				width="16px"
				height="16px"
				borderRadius="full"
				border="none"
				userSelect="none"
				flexShrink={0}
			/>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				noOfLines={1}
				wordBreak="break-all"
				color={getColor(darkMode, "textPrimary")}
				fontSize={13}
				className="user-select-text"
				userSelect="text"
				as="span"
				flexShrink={0}
				cursor="pointer"
				onClick={() => eventListener.emit("openUserProfileModal", message.replyTo.senderId)}
				_hover={{
					textDecoration: "underline"
				}}
			>
				{getUserNameFromReplyTo(message)}
			</AppText>
			<Flex
				color={getColor(darkMode, "textSecondary")}
				fontSize={13}
				className="user-select-text"
				userSelect="text"
				onClick={() => eventListener.emit("scrollToMessageUUID", message.replyTo.uuid)}
				gap="4px"
				flexDirection="row"
				maxHeight="20px"
				overflow="hidden"
				textOverflow="ellipsis"
				flexGrow={0}
				flexFlow="row wrap"
			>
				<ReplaceInlineMessageWithComponents
					darkMode={darkMode}
					content={message.replyTo.message}
					participants={currentConversation.participants}
				/>
			</Flex>
		</Flex>
	)
})

export interface MessagTextProps {
	message: ChatMessage
	failedMessages: string[]
	darkMode: boolean
	isMobile: boolean
	lang: string
	currentConversation: ChatConversation
}

export const MessageText = memo(({ message, failedMessages, darkMode, isMobile, lang, currentConversation }: MessagTextProps) => {
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
			<Flex
				className="user-select-text"
				flexDirection="row"
				flexFlow="row wrap"
				flexWrap="wrap"
				whiteSpace="pre-wrap"
			>
				<ReplaceMessageWithComponents
					content={message.message}
					darkMode={darkMode}
					participants={currentConversation.participants}
					failed={failedMessages.includes(message.uuid)}
				/>
				{message.edited && (
					<Flex
						fontSize={11}
						color={getColor(darkMode, "textSecondary")}
						fontWeight="400"
						paddingLeft="6px"
						paddingTop="2px"
						alignItems="center"
					>
						({i18n(lang, "chatEdited").toLowerCase()})
					</Flex>
				)}
			</Flex>
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
	isBlocked: boolean
	lang: string
	currentConversation: ChatConversation
}

export const MessageContent = memo(
	({
		message,
		isMobile,
		darkMode,
		hovering,
		userId,
		isScrollingChat,
		failedMessages,
		isBlocked,
		lang,
		currentConversation
	}: MessageContentProps) => {
		return (
			<Flex
				flexDirection="row"
				wordBreak="break-all"
				className="user-select-text"
				userSelect="text"
				paddingTop="2px"
				paddingBottom="2px"
			>
				{isBlocked ? (
					<Flex
						flexDirection="row"
						gap="4px"
						color={getColor(darkMode, "textSecondary")}
						fontSize={14}
						wordBreak="break-all"
						className="user-select-text"
						userSelect="text"
						fontStyle="italic"
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
							{i18n(lang, "chatMessageHiddenUserBlocked")}
						</pre>
					</Flex>
				) : (
					<>
						{extractLinksFromString(message.message).length > 0 && !message.embedDisabled ? (
							<Flex flexDirection="column">
								<Embed
									darkMode={darkMode}
									isMobile={isMobile}
									message={message}
									userId={userId}
									hoveringMessage={hovering}
									isScrollingChat={isScrollingChat}
									failedMessages={failedMessages}
									lang={lang}
									currentConversation={currentConversation}
								/>
								{message.edited && isMessageLink(message.message) && (
									<Flex
										fontSize={11}
										color={getColor(darkMode, "textSecondary")}
										fontWeight="400"
										alignItems="center"
									>
										({i18n(lang, "chatEdited").toLowerCase()})
									</Flex>
								)}
							</Flex>
						) : (
							<MessageText
								message={message}
								failedMessages={failedMessages}
								darkMode={darkMode}
								isMobile={isMobile}
								lang={lang}
								currentConversation={currentConversation}
							/>
						)}
					</>
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
	blockedContacts: BlockedContact[]
	lastFocusTimestamp: Record<string, number> | undefined
	setLastFocusTimestamp: React.Dispatch<React.SetStateAction<Record<string, number> | undefined>>
	editingMessageUUID: string
	replyMessageUUID: string
	currentConversation: ChatConversation
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
		contextMenuOpen,
		blockedContacts,
		lastFocusTimestamp,
		setLastFocusTimestamp,
		editingMessageUUID,
		replyMessageUUID,
		currentConversation
	}: MessageProps) => {
		const [hoveringMessage, setHoveringMessage] = useState<boolean>(false)

		const hovering = useMemo(() => {
			return (
				hoveringMessage ||
				contextMenuOpen === message.uuid ||
				editingMessageUUID === message.uuid ||
				replyMessageUUID === message.uuid
			)
		}, [message, contextMenuOpen, hoveringMessage, editingMessageUUID, replyMessageUUID])

		const blockedContactsIds = useMemo(() => {
			return blockedContacts.map(c => c.userId)
		}, [blockedContacts])

		const isBlocked = useMemo(() => {
			return blockedContactsIds.includes(message.senderId) && message.senderId !== userId
		}, [blockedContactsIds, message, userId])

		const groupWithPrevMessage = useMemo(() => {
			if (!prevMessage) {
				return false
			}

			return prevMessage.senderId === message.senderId && isTimestampSameMinute(message.sentTimestamp, prevMessage.sentTimestamp)
		}, [message, prevMessage])

		const groupWithNextMessage = useMemo(() => {
			if (!nextMessage) {
				return false
			}

			return nextMessage.senderId === message.senderId && isTimestampSameMinute(message.sentTimestamp, nextMessage.sentTimestamp)
		}, [message, nextMessage])

		const dontGroupWithNextMessage = useMemo(() => {
			if (!nextMessage) {
				return true
			}

			return nextMessage.senderId !== message.senderId || !isTimestampSameMinute(message.sentTimestamp, nextMessage.sentTimestamp)
		}, [message, nextMessage])

		const prevMessageSameDay = useMemo(() => {
			if (!prevMessage) {
				return true
			}

			return isTimestampSameDay(prevMessage.sentTimestamp, message.sentTimestamp)
		}, [prevMessage, message])

		const mentioningMe = useMemo(() => {
			const matches = message.message.match(MENTION_REGEX)

			if (!matches || matches.length === 0) {
				return false
			}

			const userEmail = currentConversation.participants.filter(p => p.userId === userId)

			if (userEmail.length === 0) {
				return false
			}

			return (
				matches.filter(match => {
					const email = match.trim().slice(1)

					if (email === "everyone") {
						return true
					}

					if (email.startsWith("@") || email.endsWith("@")) {
						return false
					}

					return userEmail[0].email === email
				}).length > 0
			)
		}, [message, userId, currentConversation])

		const isNewMessage = useMemo(() => {
			return (
				lastFocusTimestamp &&
				typeof lastFocusTimestamp[message.conversation] === "number" &&
				message.sentTimestamp > lastFocusTimestamp[message.conversation] &&
				message.senderId !== userId
			)
		}, [message, lastFocusTimestamp, userId])

		if (groupWithPrevMessage) {
			return (
				<Flex
					flexDirection="column"
					paddingBottom={!nextMessage ? "15px" : undefined}
				>
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
						onMouseEnter={() => setHoveringMessage(true)}
						onMouseLeave={() => setHoveringMessage(false)}
						backgroundColor={
							hovering && !isScrollingChat
								? getColor(darkMode, "backgroundSecondary")
								: getColor(darkMode, "backgroundPrimary")
						}
					>
						<Flex
							flexDirection="column"
							paddingLeft="25px"
							paddingRight="15px"
							paddingBottom="3px"
							backgroundColor={
								(message.replyTo.uuid.length > 0 &&
									message.replyTo.message.length > 0 &&
									message.replyTo.senderId === userId) ||
								mentioningMe
									? darkMode
										? "rgba(255, 255, 0, 0.04)"
										: "rgba(255, 255, 0, 0.2)"
									: isNewMessage
									? darkMode
										? "rgba(255, 255, 255, 0.02)"
										: "rgba(1, 1, 1, 0.04)"
									: undefined
							}
							borderLeft={
								(message.replyTo.uuid.length > 0 &&
									message.replyTo.message.length > 0 &&
									message.replyTo.senderId === userId) ||
								mentioningMe
									? "3px solid " + getColor(darkMode, "yellow")
									: isNewMessage
									? "3px solid " + getColor(darkMode, "red")
									: "3px solid transparent"
							}
						>
							{message.replyTo.uuid.length > 0 && message.replyTo.message.length > 0 && (
								<ReplyTo
									darkMode={darkMode}
									isMobile={isMobile}
									message={message}
									hideArrow={true}
									currentConversation={currentConversation}
								/>
							)}
							<Flex flexDirection="row">
								<Flex
									color={getColor(darkMode, "textSecondary")}
									fontSize={10}
									width="37px"
									flexShrink={0}
									paddingTop="6px"
								>
									{hovering &&
										!isScrollingChat &&
										new Date(message.sentTimestamp).toLocaleTimeString("de-DE", {
											hour: "2-digit",
											minute: "2-digit"
										})}
								</Flex>
								<Flex
									flexDirection="column"
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
										isBlocked={isBlocked}
										lang={lang}
										currentConversation={currentConversation}
									/>
								</Flex>
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
				</Flex>
			)
		}

		return (
			<Flex
				flexDirection="column"
				width="100%"
				paddingBottom={!nextMessage ? "15px" : undefined}
			>
				{lastFocusTimestamp &&
					typeof lastFocusTimestamp[message.conversation] === "number" &&
					message.sentTimestamp > lastFocusTimestamp[message.conversation] &&
					message.senderId !== userId &&
					!(prevMessage && prevMessage.sentTimestamp > lastFocusTimestamp[message.conversation]) && (
						<NewDivider
							darkMode={darkMode}
							isMobile={isMobile}
							lang={lang}
							setLastFocusTimestamp={setLastFocusTimestamp}
							conversationUUID={message.conversation}
						/>
					)}
				{!prevMessage && (
					<Flex
						flexDirection="column"
						paddingTop="10px"
					>
						<ChatInfo
							darkMode={darkMode}
							isMobile={isMobile}
							lang={lang}
						/>
						<DateDivider
							timestamp={message.sentTimestamp}
							darkMode={darkMode}
							isMobile={isMobile}
						/>
					</Flex>
				)}
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
					backgroundColor={
						hovering && !isScrollingChat ? getColor(darkMode, "backgroundSecondary") : getColor(darkMode, "backgroundPrimary")
					}
				>
					<Flex
						flexDirection="column"
						paddingTop={!prevMessage ? "15px" : "3px"}
						paddingBottom="3px"
						paddingRight="15px"
						paddingLeft="15px"
						width="100%"
						className="user-select-text"
						userSelect="text"
						backgroundColor={
							(message.replyTo.uuid.length > 0 &&
								message.replyTo.message.length > 0 &&
								message.replyTo.senderId === userId) ||
							mentioningMe
								? darkMode
									? "rgba(255, 255, 0, 0.04)"
									: "rgba(255, 255, 0, 0.2)"
								: isNewMessage
								? darkMode
									? "rgba(255, 255, 255, 0.02)"
									: "rgba(1, 1, 1, 0.04)"
								: undefined
						}
						borderLeft={
							(message.replyTo.uuid.length > 0 &&
								message.replyTo.message.length > 0 &&
								message.replyTo.senderId === userId) ||
							mentioningMe
								? "3px solid " + getColor(darkMode, "yellow")
								: isNewMessage
								? "3px solid " + getColor(darkMode, "red")
								: "3px solid transparent"
						}
					>
						{message.replyTo.uuid.length > 0 && message.replyTo.message.length > 0 && (
							<ReplyTo
								darkMode={darkMode}
								isMobile={isMobile}
								message={message}
								hideArrow={false}
								currentConversation={currentConversation}
							/>
						)}
						<Flex flexDirection="row">
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
										cursor="pointer"
										onClick={() => eventListener.emit("openUserProfileModal", message.senderId)}
										_hover={{
											textDecoration: "underline"
										}}
									>
										{getUserNameFromMessage(message)}
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
									isBlocked={isBlocked}
									lang={lang}
									currentConversation={currentConversation}
								/>
							</Flex>
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
			</Flex>
		)
	}
)

export default Message
