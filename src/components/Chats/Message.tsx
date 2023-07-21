import { memo, useMemo, useState, useEffect, useCallback } from "react"
import {
	Flex,
	Avatar,
	Popover,
	PopoverTrigger,
	Portal,
	Tooltip,
	PopoverContent,
	PopoverBody,
	Skeleton,
	Link,
	Image
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatMessage, chatDelete } from "../../lib/api"
import AppText from "../AppText"
import striptags from "striptags"
import { IoTrash } from "react-icons/io5"
import { safeAwait, getRandomArbitrary, randomStringUnsafe, generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { getUserNameFromMessage, formatMessageDate, isTimestampSameDay } from "./utils"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import Linkify from "react-linkify"
import axios from "axios"

export const MessageSkeleton = memo(({ index, darkMode, isMobile }: { index: number; darkMode: boolean; isMobile: boolean }) => {
	return (
		<Flex
			flexDirection="column"
			width="100%"
			marginTop="5px"
		>
			<Flex
				flexDirection="row"
				paddingTop={index === 0 ? "10px" : "2px"}
				paddingBottom="2px"
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
							marginLeft="10px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textPrimary")}
								fontSize={15}
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
			marginLeft="8px"
			fontSize={11}
		>
			{date}
		</AppText>
	)
})

export const DateDivider = memo(({ timestamp }: { timestamp: number }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()

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
			marginBottom="15px"
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

export const OuterMessage = memo(
	({
		message,
		isScrollingChat,
		userId,
		darkMode,
		children,
		hoveringMessage,
		setHoveringMessage
	}: {
		message: ChatMessage
		isScrollingChat: boolean
		userId: number
		darkMode: boolean
		children: React.ReactNode
		hoveringMessage: boolean
		setHoveringMessage: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const [hoveringPopover, setHoveringPopover] = useState<boolean>(false)
		const lang = useLang()

		const deleteMessage = useCallback(async () => {
			const [err] = await safeAwait(chatDelete(message.uuid))

			if (err) {
				console.error(err)

				return
			}

			eventListener.emit("chatMessageDelete", message.uuid)
		}, [message.uuid])

		return (
			<Popover
				placement="top-end"
				isOpen={hoveringMessage && !isScrollingChat}
			>
				<PopoverTrigger>{children}</PopoverTrigger>
				{message.senderId === userId && (
					<Portal>
						<PopoverContent
							marginBottom="-20px"
							marginRight="15px"
							onMouseEnter={() => {
								setHoveringMessage(true)
								setHoveringPopover(true)
							}}
							onMouseLeave={() => {
								setHoveringMessage(false)
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
									label={i18n(lang, "delete")}
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
	index: number
}

export const Message = memo(
	({ darkMode, isMobile, message, failedMessages, prevMessage, nextMessage, userId, isScrollingChat, index }: MessageProps) => {
		const [hoveringMessage, setHoveringMessage] = useState<boolean>(false)
		const [displayMessageAsImage, setDisplayMessageAsImage] = useState<boolean>(false)

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

		const isMessageImageLink = useMemo(() => {
			const trimmed = message.message.trim()

			return trimmed.startsWith("https://") && trimmed.endsWith(".png")
		}, [message.message])

		useEffect(() => {
			if (isMessageImageLink) {
				;(async () => {
					const response = await axios.head(message.message)

					if (response.headers["content-type"] && response.headers["content-type"] === "image/png") {
						setDisplayMessageAsImage(true)
					}
				})()
			}
		}, [isMessageImageLink, message.message])

		if (groupWithPrevMessage) {
			return (
				<>
					{nextMessage && (!groupWithNextMessage || dontGroupWithNextMessage) && (
						<Flex
							flexDirection="row"
							width="100%"
							height="15px"
							backgroundColor="transparent"
						/>
					)}
					<OuterMessage
						darkMode={darkMode}
						isScrollingChat={isScrollingChat}
						message={message}
						userId={userId}
						hoveringMessage={hoveringMessage}
						setHoveringMessage={setHoveringMessage}
					>
						<Flex
							transform="rotate(180deg) scaleX(-1)"
							flexDirection="column"
							paddingTop="2px"
							paddingBottom="2px"
							paddingRight="15px"
							paddingLeft="62px"
							className="user-select-text"
							userSelect="text"
							onMouseEnter={() => {
								setHoveringMessage(true)
							}}
							onMouseLeave={() => {
								setHoveringMessage(false)
							}}
							backgroundColor={
								hoveringMessage && !isScrollingChat ? getColor(darkMode, "backgroundSecondary") : "transparent"
							}
						>
							<Flex flexDirection="row">
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									color={
										failedMessages.includes(message.uuid)
											? getColor(darkMode, "red")
											: getColor(darkMode, "textSecondary")
									}
									fontSize={14}
									wordBreak="break-word"
									marginTop="1px"
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
												>
													{decoratedText}
												</Link>
											)
										}}
									>
										{striptags(message.message)}
									</Linkify>
								</AppText>
							</Flex>
						</Flex>
					</OuterMessage>
				</>
			)
		}

		return (
			<Flex
				flexDirection="column"
				width="100%"
				transform="rotate(180deg) scaleX(-1)"
			>
				{!prevMessageSameDay && <DateDivider timestamp={message.sentTimestamp} />}
				<OuterMessage
					darkMode={darkMode}
					isScrollingChat={isScrollingChat}
					message={message}
					userId={userId}
					hoveringMessage={hoveringMessage}
					setHoveringMessage={setHoveringMessage}
				>
					<Flex
						flexDirection="row"
						paddingTop={!prevMessage ? "10px" : "2px"}
						paddingBottom="2px"
						paddingRight="15px"
						paddingLeft="15px"
						width="100%"
						onMouseEnter={() => setHoveringMessage(true)}
						onMouseLeave={() => setHoveringMessage(false)}
						backgroundColor={hoveringMessage && !isScrollingChat ? getColor(darkMode, "backgroundSecondary") : "transparent"}
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
							<Flex
								flexDirection="column"
								className="user-select-text"
								userSelect="text"
							>
								{displayMessageAsImage ? (
									<Image src={message.message} />
								) : (
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										color={
											failedMessages.includes(message.uuid)
												? getColor(darkMode, "red")
												: getColor(darkMode, "textSecondary")
										}
										fontSize={14}
										wordBreak="break-word"
										marginTop="2px"
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
													>
														{decoratedText}
													</Link>
												)
											}}
										>
											{striptags(message.message)}
										</Linkify>
									</AppText>
								)}
							</Flex>
						</Flex>
					</Flex>
				</OuterMessage>
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
