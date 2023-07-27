import { memo, useState, useCallback } from "react"
import { Image, Flex, Link, Spinner, Skeleton } from "@chakra-ui/react"
import { ChatMessage, messageEmbedDisable } from "../../lib/api"
import { getAPIV3Server, getRandomArbitrary, randomStringUnsafe, safeAwait } from "../../lib/helpers"
import { parseYouTubeVideoId, parseFilenPublicLink } from "./utils"
import { MessageDisplayType } from "./Container"
import Linkify from "react-linkify"
import { getColor } from "../../styles/colors"
import striptags from "striptags"
import eventListener from "../../lib/eventListener"
import { encode as base64Encode } from "js-base64"
import AppText from "../AppText"
import { IoCloseOutline } from "react-icons/io5"
import { show as showToast } from "../Toast/Toast"

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
}

export const EmbedContainer = memo(
	({ darkMode, isMobile, borderColor, title, link, children, width, height, linkAsTitle }: EmbedContainerProps) => {
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
					borderLeft={"4px solid " + borderColor}
					width={isMobile ? "100%" : width ? width + "px" : "600px"}
					height={height ? height + "px" : "390px"}
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
}

export const OGEmbedContainer = memo(({ darkMode, isMobile, link, state, ogData }: OGEmbedContainerProps) => {
	return (
		<Flex
			paddingTop="5px"
			paddingBottom="5px"
			cursor="pointer"
			onClick={() => window.open(link, "_blank")}
		>
			<Flex
				flexDirection="column"
				gap="10px"
				backgroundColor={getColor(darkMode, "backgroundTertiary")}
				padding="10px"
				borderRadius="5px"
				width={isMobile ? "100%" : "500px"}
				borderLeft={"4px solid " + getColor(darkMode, "borderPrimary")}
				height="250px"
			>
				<Flex
					flexDirection="column"
					height="50px"
					width="100%"
					gap="10px"
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
									fontSize={14}
									wordBreak="break-all"
									noOfLines={1}
									_hover={{
										textDecoration: "underline"
									}}
								>
									{decoratedText}
								</Link>
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
	)
})

export interface EmbedProps {
	darkMode: boolean
	isMobile: boolean
	message: ChatMessage
	displayAs: MessageDisplayType
	userId: number
	hoveringMessage: boolean
	ogData: Record<string, string>
}

export const Embed = memo(({ isMobile, message, displayAs, darkMode, userId, hoveringMessage, ogData }: EmbedProps) => {
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

	return (
		<Flex
			flexDirection="row"
			gap="1px"
		>
			{displayAs === "ogEmbed" && (
				<OGEmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					state="ogEmbed"
					link={message.message}
					ogData={ogData}
				/>
			)}
			{displayAs === "invalid" && (
				<OGEmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					state="invalid"
					link={message.message}
					ogData={ogData}
				/>
			)}
			{displayAs === "async" && (
				<OGEmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					state="async"
					link={message.message}
					ogData={ogData}
				/>
			)}
			{displayAs === "image" && (
				<EmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					title=""
					link={message.message}
					borderColor={getColor(darkMode, "blue")}
					height={250}
					width={500}
					linkAsTitle={true}
				>
					<Flex
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
						onClick={() => eventListener.emit("openChatPreviewModal", { type: "image", message: message.message })}
						cursor="pointer"
						backgroundColor={getColor(darkMode, "backgroundSecondary")}
						borderRadius="5px"
						height="200px"
						padding="10px"
					>
						<Image
							src={getAPIV3Server() + "/v3/cors?url=" + encodeURIComponent(message.message)}
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
			)}
			{displayAs === "youtubeEmbed" && (
				<EmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					title="YouTube"
					link={message.message}
					borderColor={getColor(darkMode, "red")}
				>
					<Flex paddingTop="6px">
						<iframe
							width="100%"
							height="300px"
							src={"https://www.youtube.com/embed/" + parseYouTubeVideoId(message.message)}
							title="YouTube"
							loading="lazy"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowFullScreen={true}
							sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation"
							style={{
								borderRadius: "10px",
								overflow: "hidden",
								border: "none"
							}}
						/>
					</Flex>
				</EmbedContainer>
			)}
			{displayAs === "filenEmbed" && (
				<EmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					title="Filen"
					link={message.message}
					borderColor={getColor(darkMode, "purple")}
				>
					<Flex paddingTop="6px">
						<iframe
							width="100%"
							height="300px"
							loading="lazy"
							src={
								(process.env.NODE_ENV === "development" ? "http://localhost:3003/d/" : "https://drive.filen.io/d/") +
								parseFilenPublicLink(message.message).uuid +
								"?embed=true&theme=" +
								(darkMode ? "dark" : "light") +
								"&bgColor=" +
								base64Encode(getColor(darkMode, "backgroundTertiary")) +
								"#" +
								parseFilenPublicLink(message.message).key
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
			)}
			{hoveringMessage && message.senderId === userId && (
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
			)}
		</Flex>
	)
})

export default Embed
