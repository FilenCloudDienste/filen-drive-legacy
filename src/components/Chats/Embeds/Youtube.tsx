import { memo, useState, useEffect, useRef } from "react"
import { EmbedContainer } from "../Embed"
import { Flex, Image, Skeleton } from "@chakra-ui/react"
import { DisableEmbed } from "../Embed"
import { parseYouTubeVideoId } from "../utils"
import { getColor } from "../../../styles/colors"
import { ChatMessage } from "../../../lib/api"
import { corsGet } from "../../../lib/worker/worker.com"
import { FaPlay } from "react-icons/fa"

export interface YouTubeProps {
	darkMode: boolean
	isMobile: boolean
	link: string
	failedMessages: string[]
	message: ChatMessage
	index: number
	userId: number
	isScrollingChat: boolean
	hoveringMessage: boolean
}

export interface YouTubeInfo {
	title: string
	author_name: string
	author_url: string
	type: string
	height: number
	width: number
	version: string
	provider_name: string
	provider_url: string
	thumbnail_height: number
	thumbnail_width: number
	thumbnail_url: string
	html: string
}

export const YouTube = memo(
	({ darkMode, isMobile, link, failedMessages, message, index, userId, isScrollingChat, hoveringMessage }: YouTubeProps) => {
		const didFetchInfo = useRef<boolean>(false)
		const [info, setInfo] = useState<YouTubeInfo | undefined>(undefined)
		const [play, setPlay] = useState<boolean>(false)
		const [thumbnailLoaded, setThumbnailLoaded] = useState<boolean>(false)

		useEffect(() => {
			if (!didFetchInfo.current) {
				didFetchInfo.current = true
				;(async () => {
					const response = await corsGet(
						"https://www.youtube.com/oembed?url=https://youtube.com/watch?v=" + parseYouTubeVideoId(link) + "&format=json"
					)

					if (!response) {
						return
					}

					setInfo(response)
				})()
			}
		}, [link])

		return (
			<Flex
				flexDirection="row"
				gap="2px"
			>
				<EmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					title={info ? info.author_name + " - " + info.title : "YouTube"}
					link={link}
					borderColor={getColor(darkMode, "red")}
					failedMessages={failedMessages}
					message={message}
					height={390}
				>
					{info ? (
						<>
							{play ? (
								<Flex paddingTop="6px">
									<iframe
										width="100%"
										height="300px"
										src={"https://www.youtube.com/embed/" + parseYouTubeVideoId(link) + "?autoplay=1"}
										title={"YouTube - " + info.author_name + " - " + info.title}
										loading="eager"
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
							) : (
								<Flex
									paddingTop="6px"
									position="relative"
								>
									{thumbnailLoaded && (
										<Flex
											position="absolute"
											top="50%"
											left="50%"
											transform="translate(-50%, -50%)"
											backgroundColor="rgba(1, 1, 1, 0.6)"
											borderRadius="full"
											padding="15px"
											justifyContent="center"
											alignItems="center"
											_hover={{
												backgroundColor: "rgba(1, 1, 1, 0.75)"
											}}
											cursor="pointer"
											onClick={() => setPlay(true)}
										>
											<FaPlay
												size={20}
												color="white"
											/>
										</Flex>
									)}
									<Image
										src={"https://img.youtube.com/vi/" + parseYouTubeVideoId(link) + "/hqdefault.jpg"}
										width="100%"
										height="300px"
										borderRadius="10px"
										onLoad={() => setThumbnailLoaded(true)}
										fallback={
											<Skeleton
												startColor={getColor(darkMode, "backgroundPrimary")}
												endColor={getColor(darkMode, "backgroundSecondary")}
												width="100%"
												height="300px"
												borderRadius="10px"
											>
												<Flex
													width="100%"
													height="300px"
													borderRadius="10px"
												/>
											</Skeleton>
										}
									/>
								</Flex>
							)}
						</>
					) : (
						<Skeleton
							startColor={getColor(darkMode, "backgroundPrimary")}
							endColor={getColor(darkMode, "backgroundSecondary")}
							width="100%"
							height="300px"
							borderRadius="10px"
						>
							<Flex
								width="100%"
								height="300px"
								borderRadius="10px"
							/>
						</Skeleton>
					)}
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
		)
	}
)

export default YouTube
