import { memo } from "react"
import { Image, Flex, Link } from "@chakra-ui/react"
import { ChatMessage } from "../../lib/api"
import { getAPIV3Server } from "../../lib/helpers"
import { parseYouTubeVideoId, parseFilenPublicLink } from "./utils"
import { DisplayMessageAs } from "./Container"
import Linkify from "react-linkify"
import { getColor } from "../../styles/colors"
import striptags from "striptags"
import eventListener from "../../lib/eventListener"
import { encode as base64Encode } from "js-base64"
import AppText from "../AppText"

export interface EmbedContainerProps {
	darkMode: boolean
	isMobile: boolean
	borderColor: string
	title: string
	link: string
	children: React.ReactNode
}

export const EmbedContainer = memo(({ darkMode, isMobile, borderColor, title, link, children }: EmbedContainerProps) => {
	return (
		<Flex
			flexDirection="column"
			gap="5px"
			backgroundColor={getColor(darkMode, "backgroundTertiary")}
			padding="10px"
			borderRadius="5px"
			marginTop="5px"
			marginBottom="5px"
			borderLeft={"4px solid " + borderColor}
			maxWidth={isMobile ? "100%" : "600px"}
		>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				fontSize={14}
				color={getColor(darkMode, "textSecondary")}
				textTransform="uppercase"
			>
				{title}
			</AppText>
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
							fontSize={16}
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
			{children}
		</Flex>
	)
})

export interface EmbedProps {
	darkMode: boolean
	isMobile: boolean
	message: ChatMessage
	displayMessageAs: DisplayMessageAs
	hoveringMessage: boolean
	isScrollingChat: boolean
}

export const Embed = memo(({ isMobile, message, displayMessageAs, darkMode, hoveringMessage, isScrollingChat }: EmbedProps) => {
	return (
		<>
			{displayMessageAs[message.uuid] === "image" && (
				<Image
					marginTop="8px"
					marginBottom="6px"
					src={getAPIV3Server() + "/v3/cors?url=" + encodeURIComponent(message.message)}
					borderRadius="10px"
					maxWidth={isMobile ? "100%" : "400px"}
					onClick={() => eventListener.emit("openChatPreviewModal", { type: "image", message: message.message })}
					cursor="pointer"
					onContextMenu={e => {
						e.preventDefault()
						e.stopPropagation()
					}}
				/>
			)}
			{displayMessageAs[message.uuid] === "youtubeEmbed" && (
				<EmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					title="YouTube"
					link={message.message}
					borderColor={getColor(darkMode, "red")}
				>
					<iframe
						width="560"
						height="315"
						src={"https://www.youtube.com/embed/" + parseYouTubeVideoId(message.message)}
						title="YouTube"
						loading="lazy"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen={true}
						sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation"
						onContextMenu={e => {
							e.preventDefault()

							return false
						}}
						frameBorder="0"
						onWheel={e => e.preventDefault()}
						style={{
							borderRadius: "10px",
							marginBottom: "6px",
							overflow: "hidden",
							pointerEvents: hoveringMessage && !isScrollingChat ? "auto" : "none",
							border: "none"
						}}
					/>
				</EmbedContainer>
			)}
			{displayMessageAs[message.uuid] === "filenEmbed" && (
				<EmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					title="Filen"
					link={message.message}
					borderColor={getColor(darkMode, "purple")}
				>
					<iframe
						width="100%"
						height="300px"
						loading="lazy"
						onContextMenu={e => {
							e.preventDefault()

							return false
						}}
						src={
							(process.env.NODE_ENV === "development" ? "http://localhost:3003/d/" : "https://drive.filen.io/d/") +
							parseFilenPublicLink(message.message).uuid +
							"?embed=true&bgColor=" +
							base64Encode(getColor(darkMode, "backgroundTertiary")) +
							"#" +
							parseFilenPublicLink(message.message).key
						}
						//sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation"
						title="Filen"
						onWheel={e => e.preventDefault()}
						frameBorder="0"
						style={{
							borderRadius: "10px",
							marginTop: "5px",
							overflow: "hidden",
							pointerEvents: hoveringMessage && !isScrollingChat ? "auto" : "none",
							border: "none"
						}}
					/>
				</EmbedContainer>
			)}
		</>
	)
})

export default Embed
