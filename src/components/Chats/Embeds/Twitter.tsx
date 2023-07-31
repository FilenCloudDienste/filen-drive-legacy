import { memo, useState } from "react"
import { EmbedContainer } from "../Embed"
import { Flex, Skeleton } from "@chakra-ui/react"
import { DisableEmbed } from "../Embed"
import { parseTwitterStatusIdFromURL } from "../utils"
import { getColor } from "../../../styles/colors"
import { ChatMessage } from "../../../lib/api"
import { TwitterTweetEmbed } from "react-twitter-embed"

export interface TwitterProps {
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

export const Twitter = memo(
	({ darkMode, isMobile, link, failedMessages, message, index, userId, isScrollingChat, hoveringMessage }: TwitterProps) => {
		const [loaded, setLoaded] = useState<boolean>(false)

		return (
			<Flex
				flexDirection="row"
				gap="2px"
			>
				<EmbedContainer
					darkMode={darkMode}
					isMobile={isMobile}
					title="Twitter"
					link={link}
					borderColor={getColor(darkMode, "blue")}
					failedMessages={failedMessages}
					message={message}
					height={400}
					width={580}
				>
					<Flex
						width="100%"
						height="315px"
						overflowX="hidden"
						overflowY="auto"
						justifyContent="center"
						className="twitter-embed-parent"
						paddingTop="10px"
						position="relative"
					>
						{!loaded && (
							<Skeleton
								startColor={getColor(darkMode, "backgroundPrimary")}
								endColor={getColor(darkMode, "backgroundSecondary")}
								width="100%"
								height="315px"
								borderRadius="10px"
								position="absolute"
								zIndex={10001}
							>
								<Flex
									position="absolute"
									height="315px"
									width="100%"
									backgroundColor={getColor(darkMode, "backgroundSecondary")}
								/>
							</Skeleton>
						)}
						<TwitterTweetEmbed
							tweetId={parseTwitterStatusIdFromURL(link)}
							onLoad={() => setLoaded(true)}
							options={{
								theme: darkMode ? "dark" : "light"
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
		)
	}
)

export default Twitter
