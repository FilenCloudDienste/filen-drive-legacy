import { memo, useState, useCallback, useRef, useEffect, Fragment } from "react"
import { Image, Flex, Link, Spinner, Skeleton } from "@chakra-ui/react"
import { ChatMessage, messageEmbedDisable } from "../../lib/api"
import { getAPIV3Server, getRandomArbitrary, randomStringUnsafe, safeAwait, Semaphore, SemaphoreProps } from "../../lib/helpers"
import { parseFilenPublicLink, extractLinksFromString, getMessageDisplayType, isMessageLink } from "./utils"
import { MessageDisplayType } from "./Container"
import Linkify from "react-linkify"
import { getColor } from "../../styles/colors"
import striptags from "striptags"
import eventListener from "../../lib/eventListener"
import { encode as base64Encode } from "js-base64"
import AppText from "../AppText"
import { IoCloseOutline } from "react-icons/io5"
import { show as showToast } from "../Toast/Toast"
import { parseOGFromURL, corsHead } from "../../lib/worker/worker.com"
import { MessageText } from "./Message"
import YouTube from "./Embeds/Youtube"
import Twitter from "./Embeds/Twitter"

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

export interface EmbedContainerProps {
	darkMode: boolean
	isMobile: boolean
	borderColor: string
	title: string
	link: string
	children: React.ReactNode
	width?: number
	height?: number
	linkAsTitle?: boolean
	failedMessages: string[]
	message: ChatMessage
}

export const EmbedContainer = memo(
	({
		darkMode,
		isMobile,
		borderColor,
		title,
		link,
		children,
		width,
		height,
		linkAsTitle,
		failedMessages,
		message
	}: EmbedContainerProps) => {
		const [hovering, setHovering] = useState<boolean>(false)

		return (
			<Flex
				paddingTop="5px"
				paddingBottom="5px"
			>
				<Flex
					flexDirection="column"
					gap="10px"
					backgroundColor={getColor(darkMode, "backgroundTertiary")}
					padding="10px"
					borderRadius="5px"
					borderLeft={failedMessages.includes(message.uuid) ? undefined : "4px solid " + borderColor}
					border={failedMessages.includes(message.uuid) ? "1px solid " + getColor(darkMode, "red") : undefined}
					width={isMobile ? "100%" : width ? width + "px" : "600px"}
					height={height ? height + "px" : "390px"}
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
					boxShadow={hovering ? "md" : "none"}
				>
					{linkAsTitle ? (
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
										fontSize={14}
										wordBreak="break-all"
										noOfLines={1}
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
							{striptags(link)}
						</Linkify>
					) : (
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							fontSize={14}
							color={getColor(darkMode, "textSecondary")}
							textTransform="uppercase"
							as="span"
							wordBreak="break-all"
							noOfLines={1}
						>
							{title}
						</AppText>
					)}
					{!linkAsTitle && (
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
										fontSize={14}
										wordBreak="break-all"
										noOfLines={1}
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
							{striptags(link)}
						</Linkify>
					)}
					{children}
				</Flex>
			</Flex>
		)
	}
)

export interface OGEmbedContainerProps {
	darkMode: boolean
	isMobile: boolean
	link: string
	state: "async" | "invalid" | "ogEmbed"
	ogData: Record<string, string>
	failedMessages: string[]
	message: ChatMessage
}

export const OGEmbedContainer = memo(({ darkMode, isMobile, link, state, ogData, failedMessages, message }: OGEmbedContainerProps) => {
	const [hovering, setHovering] = useState<boolean>(false)

	return (
		<a
			href={link}
			target="_blank"
			rel="noreferrer"
		>
			<Flex
				paddingTop="5px"
				paddingBottom="5px"
				cursor="pointer"
			>
				<Flex
					flexDirection="column"
					gap="10px"
					backgroundColor={getColor(darkMode, "backgroundTertiary")}
					padding="10px"
					borderRadius="5px"
					width={isMobile ? "100%" : "500px"}
					borderLeft={failedMessages.includes(message.uuid) ? undefined : "4px solid " + getColor(darkMode, "borderPrimary")}
					border={failedMessages.includes(message.uuid) ? "1px solid " + getColor(darkMode, "red") : undefined}
					height="250px"
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
					boxShadow={hovering ? "md" : "none"}
				>
					<Flex
						flexDirection="column"
						height="50px"
						width="100%"
						gap="10px"
					>
						<Linkify
							componentDecorator={(_, decoratedText, key) => {
								return (
									<AppText
										key={key}
										darkMode={darkMode}
										isMobile={isMobile}
										color={getColor(darkMode, "linkPrimary")}
										cursor="pointer"
										className="user-select-text"
										userSelect="text"
										fontSize={14}
										wordBreak="break-all"
										noOfLines={1}
										_hover={{
											textDecoration: "underline"
										}}
										onContextMenu={e => e.stopPropagation()}
										as="span"
									>
										{decoratedText}
									</AppText>
								)
							}}
						>
							{striptags(link)}
						</Linkify>
						{state === "async" && (
							<Skeleton
								startColor={getColor(darkMode, "backgroundPrimary")}
								endColor={getColor(darkMode, "backgroundSecondary")}
								borderRadius="5px"
								width="80%"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									fontSize={14}
									color={getColor(darkMode, "textPrimary")}
									textTransform="uppercase"
									as="span"
								>
									{randomStringUnsafe(10)}
								</AppText>
							</Skeleton>
						)}
						{state === "invalid" && (
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								fontSize={14}
								color={getColor(darkMode, "textPrimary")}
								textTransform="uppercase"
								noOfLines={1}
								wordBreak="break-all"
								as="span"
							>
								No title available
							</AppText>
						)}
						{state === "ogEmbed" && (
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								fontSize={14}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textPrimary")}
								textTransform="uppercase"
								as="span"
							>
								{typeof ogData["og:title"] === "string"
									? ogData["og:title"]
									: typeof ogData["meta:title"] === "string"
									? ogData["meta:title"]
									: typeof ogData["title"] === "string"
									? ogData["title"]
									: "No title available"}
							</AppText>
						)}
					</Flex>
					<Flex
						flexDirection="row"
						height="200px"
						width="100%"
						justifyContent="space-between"
						gap="15px"
					>
						{state === "async" && (
							<Flex
								flexDirection="column"
								width="100%"
								gap="5px"
							>
								{new Array(getRandomArbitrary(4, 8)).fill(1).map((_, index) => {
									return (
										<Skeleton
											key={index}
											startColor={getColor(darkMode, "backgroundPrimary")}
											endColor={getColor(darkMode, "backgroundSecondary")}
											borderRadius="5px"
											width={index === 0 ? "100%" : getRandomArbitrary(60, 100) + "%"}
											height="15px"
										/>
									)
								})}
							</Flex>
						)}
						{state === "invalid" && (
							<Flex
								flexDirection="column"
								width="100%"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									fontSize={14}
									color={getColor(darkMode, "textSecondary")}
									as="span"
								>
									No description available
								</AppText>
							</Flex>
						)}
						{state === "ogEmbed" && (
							<Flex
								flexDirection="column"
								width="100%"
								height="100%"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									fontSize={14}
									wordBreak="break-word"
									noOfLines={8}
									color={getColor(darkMode, "textSecondary")}
									as="span"
								>
									{typeof ogData["og:description"] === "string"
										? ogData["og:description"]
										: typeof ogData["meta:description"] === "string"
										? ogData["meta:description"]
										: typeof ogData["description"] === "string"
										? ogData["description"]
										: "No description available"}
								</AppText>
							</Flex>
						)}
						<Flex
							backgroundColor={getColor(darkMode, "backgroundSecondary")}
							width="170px"
							height="170px"
							borderRadius="5px"
							flexShrink={0}
							justifyContent="center"
							alignItems="center"
							boxShadow="md"
						>
							{state === "async" && (
								<Spinner
									width="32px"
									height="32px"
									color={getColor(darkMode, "textSecondary")}
								/>
							)}
							{state === "invalid" && (
								<Flex
									backgroundColor="gray"
									width="170px"
									height="170px"
									borderRadius="5px"
									flexShrink={0}
									justifyContent="center"
									alignItems="center"
								>
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										fontSize={14}
										color="white"
										wordBreak="break-word"
										as="span"
									>
										No image available
									</AppText>
								</Flex>
							)}
							{state === "ogEmbed" && (
								<>
									{typeof ogData["og:image"] === "string" ? (
										<Image
											width="170px"
											height="170px"
											borderRadius="5px"
											flexShrink={0}
											src={ogData["og:image"]}
											fallback={
												<Flex
													backgroundColor="gray"
													width="170px"
													height="170px"
													borderRadius="5px"
													flexShrink={0}
													justifyContent="center"
													alignItems="center"
												>
													<AppText
														darkMode={darkMode}
														isMobile={isMobile}
														fontSize={14}
														color="white"
														wordBreak="break-word"
														as="span"
													>
														No image available
													</AppText>
												</Flex>
											}
										/>
									) : typeof ogData["twitter:image"] === "string" ? (
										<Image
											width="170px"
											height="170px"
											borderRadius="5px"
											flexShrink={0}
											src={ogData["twitter:image"]}
											fallback={
												<Flex
													backgroundColor="gray"
													width="170px"
													height="170px"
													borderRadius="5px"
													flexShrink={0}
													justifyContent="center"
													alignItems="center"
												>
													<AppText
														darkMode={darkMode}
														isMobile={isMobile}
														fontSize={14}
														color="white"
														wordBreak="break-word"
														as="span"
													>
														No image available
													</AppText>
												</Flex>
											}
										/>
									) : (
										<Flex
											backgroundColor="gray"
											width="170px"
											height="170px"
											borderRadius="5px"
											flexShrink={0}
											justifyContent="center"
											alignItems="center"
										>
											<AppText
												darkMode={darkMode}
												isMobile={isMobile}
												fontSize={14}
												color="white"
												wordBreak="break-word"
												as="span"
											>
												No image available
											</AppText>
										</Flex>
									)}
								</>
							)}
						</Flex>
					</Flex>
				</Flex>
			</Flex>
		</a>
	)
})

export interface DisableEmbedProps {
	message: ChatMessage
	userId: number
	isScrollingChat: boolean
	darkMode: boolean
	hoveringMessage: boolean
	failedMessages: string[]
}

export const DisableEmbed = memo(({ message, userId, isScrollingChat, darkMode, hoveringMessage, failedMessages }: DisableEmbedProps) => {
	const [hoveringEmbedDisable, setHoveringEmbedDisable] = useState<boolean>(false)
	const [disablingEmbed, setDisablingEmbed] = useState<boolean>(false)

	const disableEmbed = useCallback(async () => {
		if (disablingEmbed || userId !== message.senderId) {
			return
		}

		setDisablingEmbed(true)

		const [err] = await safeAwait(messageEmbedDisable(message.uuid))

		if (err) {
			console.error(err)

			setDisablingEmbed(false)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		eventListener.emit("chatMessageEmbedDisabled", message.uuid)

		setDisablingEmbed(false)
	}, [message, disablingEmbed, userId])

	if (!hoveringMessage || message.senderId !== userId || isScrollingChat || failedMessages.includes(message.uuid)) {
		return null
	}

	return (
		<Flex paddingTop="2px">
			{disablingEmbed ? (
				<Spinner
					width="16px"
					height="16px"
					color={getColor(darkMode, "textPrimary")}
				/>
			) : (
				<IoCloseOutline
					size={24}
					color={hoveringEmbedDisable ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
					cursor="pointer"
					onClick={() => disableEmbed()}
					onMouseEnter={() => setHoveringEmbedDisable(true)}
					onMouseLeave={() => setHoveringEmbedDisable(false)}
				/>
			)}
		</Flex>
	)
})

export interface EmbedProps {
	darkMode: boolean
	isMobile: boolean
	message: ChatMessage
	userId: number
	hoveringMessage: boolean
	isScrollingChat: boolean
	failedMessages: string[]
}

export const Embed = memo(({ isMobile, message, darkMode, userId, hoveringMessage, isScrollingChat, failedMessages }: EmbedProps) => {
	const links = useRef<string[]>(extractLinksFromString(message.message)).current
	const initialDisplayAs = useRef<Record<string, MessageDisplayType>>(
		links.reduce((obj, link) => ({ ...obj, [link]: getMessageDisplayType(link) }), {})
	).current
	const [ogData, setOGData] = useState<Record<string, Record<string, string>>>({})
	const [displayAs, setDisplayAs] = useState<Record<string, MessageDisplayType>>(initialDisplayAs)
	const didGetHeaders = useRef<Record<string, boolean>>({})
	const didFetchInfo = useRef<boolean>(false)

	useEffect(() => {
		if (!didFetchInfo.current) {
			didFetchInfo.current = true

			for (const link of links) {
				if (
					["async", "invalid", "ogEmbed"].includes(initialDisplayAs[link]) &&
					!message.embedDisabled &&
					!didGetHeaders.current[link]
				) {
					didGetHeaders.current[link] = true

					const mutexKey = message.uuid + ":" + link

					;(async () => {
						if (!corsMutex[mutexKey]) {
							corsMutex[mutexKey] = new Semaphore(1)
						}

						await corsMutex[mutexKey].acquire()

						try {
							const headers = await corsHead(link)

							if (typeof headers["content-type"] !== "string") {
								corsMutex[mutexKey].release()

								return
							}

							const contentType = headers["content-type"].split(";")[0].trim()

							if (EMBED_CONTENT_TYPES_IMAGES.includes(contentType)) {
								corsMutex[mutexKey].release()

								setDisplayAs(prev => ({ ...prev, [link]: "image" }))

								return
							}

							if (contentType === "text/html") {
								const og = await parseOGFromURL(link)

								corsMutex[mutexKey].release()

								setOGData(prev => ({ ...prev, [link]: og }))
								setDisplayAs(prev => ({ ...prev, [link]: "ogEmbed" }))

								return
							}
						} catch {}

						corsMutex[mutexKey].release()

						setDisplayAs(prev => ({ ...prev, [link]: "invalid" }))
					})()
				}
			}
		}
	}, [message, initialDisplayAs])

	return (
		<Flex flexDirection="column">
			{!isMessageLink(message.message) && (
				<MessageText
					message={message}
					failedMessages={failedMessages}
					darkMode={darkMode}
					isMobile={isMobile}
				/>
			)}
			{Object.keys(displayAs).map((link, index) => {
				return (
					<Fragment key={link}>
						{displayAs[link] === "ogEmbed" && (
							<Flex
								flexDirection="row"
								gap="2px"
							>
								<OGEmbedContainer
									darkMode={darkMode}
									isMobile={isMobile}
									state="ogEmbed"
									link={link}
									ogData={ogData[link]}
									failedMessages={failedMessages}
									message={message}
								/>
								{index === 0 && (
									<DisableEmbed
										darkMode={darkMode}
										message={message}
										userId={userId}
										isScrollingChat={isScrollingChat}
										hoveringMessage={hoveringMessage}
										failedMessages={failedMessages}
									/>
								)}
							</Flex>
						)}
						{displayAs[link] === "invalid" && (
							<Flex
								flexDirection="row"
								gap="2px"
							>
								<OGEmbedContainer
									darkMode={darkMode}
									isMobile={isMobile}
									state="invalid"
									link={link}
									ogData={ogData[link]}
									failedMessages={failedMessages}
									message={message}
								/>
								{index === 0 && (
									<DisableEmbed
										darkMode={darkMode}
										message={message}
										userId={userId}
										isScrollingChat={isScrollingChat}
										hoveringMessage={hoveringMessage}
										failedMessages={failedMessages}
									/>
								)}
							</Flex>
						)}
						{displayAs[link] === "async" && (
							<Flex
								flexDirection="row"
								gap="2px"
							>
								<OGEmbedContainer
									darkMode={darkMode}
									isMobile={isMobile}
									state="async"
									link={link}
									ogData={ogData[link]}
									failedMessages={failedMessages}
									message={message}
								/>
								{index === 0 && (
									<DisableEmbed
										darkMode={darkMode}
										message={message}
										userId={userId}
										isScrollingChat={isScrollingChat}
										hoveringMessage={hoveringMessage}
										failedMessages={failedMessages}
									/>
								)}
							</Flex>
						)}
						{displayAs[link] === "image" && (
							<Flex
								flexDirection="row"
								gap="2px"
							>
								<EmbedContainer
									darkMode={darkMode}
									isMobile={isMobile}
									title="Image"
									link={link}
									borderColor={getColor(darkMode, "blue")}
									height={250}
									width={500}
									linkAsTitle={true}
									failedMessages={failedMessages}
									message={message}
								>
									<Flex
										flexDirection="column"
										justifyContent="center"
										alignItems="center"
										onClick={() => eventListener.emit("openChatPreviewModal", { type: "image", message: link })}
										cursor="pointer"
										backgroundColor={getColor(darkMode, "backgroundSecondary")}
										borderRadius="5px"
										height="200px"
										padding="10px"
									>
										<Image
											src={getAPIV3Server() + "/v3/cors?url=" + encodeURIComponent(link)}
											maxHeight="200px"
											fallback={
												<Spinner
													width="32px"
													height="32px"
													color={getColor(darkMode, "textPrimary")}
												/>
											}
											onContextMenu={e => {
												e.preventDefault()
												e.stopPropagation()
											}}
										/>
									</Flex>
								</EmbedContainer>
								{index === 0 && (
									<DisableEmbed
										darkMode={darkMode}
										message={message}
										userId={userId}
										isScrollingChat={isScrollingChat}
										hoveringMessage={hoveringMessage}
										failedMessages={failedMessages}
									/>
								)}
							</Flex>
						)}
						{displayAs[link] === "youtubeEmbed" && (
							<YouTube
								darkMode={darkMode}
								isMobile={isMobile}
								message={message}
								failedMessages={failedMessages}
								link={link}
								index={index}
								userId={userId}
								isScrollingChat={isScrollingChat}
								hoveringMessage={hoveringMessage}
							/>
						)}
						{displayAs[link] === "twitterEmbed" && (
							<Twitter
								darkMode={darkMode}
								isMobile={isMobile}
								message={message}
								failedMessages={failedMessages}
								link={link}
								index={index}
								userId={userId}
								isScrollingChat={isScrollingChat}
								hoveringMessage={hoveringMessage}
							/>
						)}
						{displayAs[link] === "filenEmbed" && (
							<Flex
								flexDirection="row"
								gap="2px"
							>
								<EmbedContainer
									darkMode={darkMode}
									isMobile={isMobile}
									title="Filen"
									link={link}
									borderColor={getColor(darkMode, "purple")}
									failedMessages={failedMessages}
									message={message}
								>
									<Flex paddingTop="6px">
										<iframe
											width="100%"
											height="300px"
											loading="lazy"
											src={
												(process.env.NODE_ENV === "development"
													? "http://localhost:3003/d/"
													: "https://drive.filen.io/d/") +
												parseFilenPublicLink(link).uuid +
												"?embed=true&theme=" +
												(darkMode ? "dark" : "light") +
												"&bgColor=" +
												base64Encode(getColor(darkMode, "backgroundTertiary")) +
												"#" +
												parseFilenPublicLink(link).key
											}
											//sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation"
											title="Filen"
											style={{
												borderRadius: "10px",
												overflow: "hidden",
												border: "none"
											}}
										/>
									</Flex>
								</EmbedContainer>
								{index === 0 && (
									<DisableEmbed
										darkMode={darkMode}
										message={message}
										userId={userId}
										isScrollingChat={isScrollingChat}
										hoveringMessage={hoveringMessage}
										failedMessages={failedMessages}
									/>
								)}
							</Flex>
						)}
					</Fragment>
				)
			})}
		</Flex>
	)
})

export default Embed
