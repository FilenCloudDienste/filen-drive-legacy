import { memo, useMemo, useState, useEffect, useRef } from "react"
import { Flex, Avatar, Skeleton, Link } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatMessage } from "../../lib/api"
import AppText from "../AppText"
import striptags from "striptags"
import { getRandomArbitrary, randomStringUnsafe, generateAvatarColorCode, Semaphore, SemaphoreProps } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import {
	getUserNameFromMessage,
	formatMessageDate,
	isTimestampSameDay,
	getMessageDisplayType,
	isMessageLink,
	renderContentWithLineBreaksAndEmojis
} from "./utils"
import Linkify from "react-linkify"
import { DisplayMessageAs, MessageDisplayType } from "./Container"
import Embed from "./Embed"
import { parseOGFromURL, corsHead } from "../../lib/worker/worker.com"

const corsMutex: Record<string, SemaphoreProps> = {}
const EMBED_CONTENT_TYPES_IMAGES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/svg",
	"image/gifv",
	"image/webp",
	"image/svg+xml",
	"image/bmp",
	"image/tiff",
	"image/vnd.microsoft.icon",
	"image/x-icon",
	"image/jp2",
	"image/jpx",
	"image/x-xbitmap",
	"image/avif"
]

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
		const initialDisplayAs = useRef<MessageDisplayType>(
			message.embedDisabled
				? "none"
				: typeof displayMessageAs[message.uuid] !== "undefined"
				? displayMessageAs[message.uuid]
				: getMessageDisplayType(message.message)
		).current
		const [displayAs, setDisplayAs] = useState<MessageDisplayType>(initialDisplayAs)
		const [ogData, setOGData] = useState<Record<string, string>>({})
		const didGetHeaders = useRef<boolean>(false)

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

		useEffect(() => {
			setDisplayMessageAs(prev => ({ ...prev, [message.uuid]: displayAs }))
		}, [displayAs, message])

		useEffect(() => {
			if (
				["async", "invalid", "ogEmbed"].includes(initialDisplayAs) &&
				!message.embedDisabled &&
				isMessageLink(message.message) &&
				!didGetHeaders.current
			) {
				didGetHeaders.current = true
				;(async () => {
					if (!corsMutex[message.uuid]) {
						corsMutex[message.uuid] = new Semaphore(1)
					}

					await corsMutex[message.uuid].acquire()

					try {
						const headers = await corsHead(message.message)

						if (typeof headers["content-type"] !== "string") {
							corsMutex[message.uuid].release()

							return
						}

						const contentType = headers["content-type"].split(";")[0].trim()

						if (EMBED_CONTENT_TYPES_IMAGES.includes(contentType)) {
							corsMutex[message.uuid].release()

							setDisplayAs("image")

							return
						}

						if (contentType === "text/html") {
							const og = await parseOGFromURL(message.message)

							corsMutex[message.uuid].release()

							setOGData(og)
							setDisplayAs("ogEmbed")

							return
						}
					} catch {}

					corsMutex[message.uuid].release()

					setDisplayAs("invalid")
				})()
			}
		}, [initialDisplayAs, message])

		if (groupWithPrevMessage) {
			return (
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
				>
					<Flex
						flexDirection="column"
						paddingRight="15px"
						paddingLeft="62px"
						className="user-select-text"
						userSelect="text"
						onMouseEnter={() => setHoveringMessage(true)}
						onMouseLeave={() => setHoveringMessage(false)}
						backgroundColor={hovering && !isScrollingChat ? getColor(darkMode, "backgroundSecondary") : "transparent"}
					>
						<Flex flexDirection="row">
							{displayAs !== "none" && !message.embedDisabled ? (
								<Embed
									message={message}
									isMobile={isMobile}
									darkMode={darkMode}
									displayAs={displayAs}
									hoveringMessage={hovering}
									userId={userId}
									ogData={ogData}
									isScrollingChat={isScrollingChat}
								/>
							) : (
								<Flex
									flexDirection="column"
									color={
										failedMessages.includes(message.uuid)
											? getColor(darkMode, "red")
											: getColor(darkMode, "textSecondary")
									}
									fontSize={14}
									wordBreak="break-word"
									width="100%"
									className="user-select-text"
									userSelect="text"
								>
									<Linkify
										componentDecorator={(decoratedHref, decoratedText, key) => {
											return (
												<Link
													key={key}
													color={getColor(darkMode, "linkPrimary")}
													cursor="pointer"
													href={decoratedHref}
													target="_blank"
													rel="noreferrer"
													className="user-select-text"
													userSelect="text"
													_hover={{
														textDecoration: "underline"
													}}
													onContextMenu={e => e.stopPropagation()}
												>
													{decoratedText}
												</Link>
											)
										}}
									>
										{renderContentWithLineBreaksAndEmojis(message.message)}
									</Linkify>
								</Flex>
							)}
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
				paddingBottom={!nextMessage ? "15px" : "3px"}
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
			>
				{!prevMessageSameDay && (
					<DateDivider
						timestamp={message.sentTimestamp}
						darkMode={darkMode}
						isMobile={isMobile}
					/>
				)}
				<Flex
					flexDirection="row"
					paddingTop={!prevMessage ? "15px" : "3px"}
					paddingBottom="3px"
					paddingRight="15px"
					paddingLeft="15px"
					width="100%"
					onMouseEnter={() => setHoveringMessage(true)}
					onMouseLeave={() => setHoveringMessage(false)}
					backgroundColor={hovering && !isScrollingChat ? getColor(darkMode, "backgroundSecondary") : "transparent"}
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
						<Flex flexDirection="column">
							{displayAs !== "none" ? (
								<Embed
									message={message}
									isMobile={isMobile}
									darkMode={darkMode}
									displayAs={displayAs}
									hoveringMessage={hovering}
									userId={userId}
									ogData={ogData}
									isScrollingChat={isScrollingChat}
								/>
							) : (
								<Flex
									flexDirection="column"
									color={
										failedMessages.includes(message.uuid)
											? getColor(darkMode, "red")
											: getColor(darkMode, "textSecondary")
									}
									fontSize={14}
									wordBreak="break-all"
									className="user-select-text"
									userSelect="text"
								>
									<Linkify
										componentDecorator={(decoratedHref, decoratedText, key) => {
											return (
												<Link
													key={key}
													color={getColor(darkMode, "linkPrimary")}
													cursor="pointer"
													href={decoratedHref}
													target="_blank"
													rel="noreferrer"
													_hover={{
														textDecoration: "underline"
													}}
													className="user-select-text"
													userSelect="text"
													onContextMenu={e => e.stopPropagation()}
												>
													{decoratedText}
												</Link>
											)
										}}
									>
										{renderContentWithLineBreaksAndEmojis(message.message)}
									</Linkify>
								</Flex>
							)}
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
