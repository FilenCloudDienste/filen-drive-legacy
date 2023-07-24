import { memo } from "react"
import { Image, Flex, Link } from "@chakra-ui/react"
import { ChatMessage } from "../../lib/api"
import { getAPIV3Server } from "../../lib/helpers"
import { parseYouTubeVideoId } from "./utils"
import { DisplayMessageAs } from "./Container"
import Linkify from "react-linkify"
import { getColor } from "../../styles/colors"
import striptags from "striptags"

export interface EmbedProps {
	darkMode: boolean
	isMobile: boolean
	message: ChatMessage
	displayMessageAs: DisplayMessageAs
}

export const Embed = memo(({ isMobile, message, displayMessageAs, darkMode }: EmbedProps) => {
	return (
		<>
			{displayMessageAs[message.uuid] === "image" && (
				<Image
					marginTop="8px"
					marginBottom="6px"
					src={getAPIV3Server() + "/v3/cors?url=" + encodeURIComponent(message.message)}
					borderRadius="10px"
					maxWidth={isMobile ? "100%" : "400px"}
				/>
			)}
			{displayMessageAs[message.uuid] === "youtubeEmbed" && (
				<Flex
					flexDirection="column"
					gap="6px"
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
									wordBreak="break-word"
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
					<iframe
						width="560"
						height="315"
						src={"https://www.youtube.com/embed/" + parseYouTubeVideoId(message.message)}
						title="YouTube video player"
						frameBorder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen={true}
						style={{
							borderRadius: "10px",
							marginBottom: "6px"
						}}
					/>
				</Flex>
			)}
		</>
	)
})

export default Embed
