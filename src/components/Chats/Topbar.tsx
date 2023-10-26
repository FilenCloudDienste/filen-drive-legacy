import { memo, useMemo } from "react"
import { Flex, Avatar, Skeleton } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatConversation, ChatConversationParticipant, ChatMessage } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import AppText from "../AppText"
import { getRandomArbitrary, randomStringUnsafe, generateAvatarColorCode } from "../../lib/helpers"
import { getUserNameFromParticipant } from "./utils"
import striptags from "striptags"
import eventListener from "../../lib/eventListener"
import useMeasure from "react-use-measure"
import { AiOutlineCheck } from "react-icons/ai"
import { i18n } from "../../i18n"

export interface TopbarProps {
	darkMode: boolean
	isMobile: boolean
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
	lastFocusTimestamp: Record<string, number> | undefined
	setLastFocusTimestamp: React.Dispatch<React.SetStateAction<Record<string, number> | undefined>>
	messages: ChatMessage[]
	lang: string
}

export const Topbar = memo(
	({
		darkMode,
		isMobile,
		currentConversation,
		currentConversationMe,
		lastFocusTimestamp,
		messages,
		lang,
		setLastFocusTimestamp
	}: TopbarProps) => {
		const [userId] = useDb("userId", 0)
		const [topbarRef, topbarBounds] = useMeasure()

		const conversationParticipantsFilteredWithoutMe = useMemo(() => {
			if (!currentConversation) {
				return null
			}

			return currentConversation.participants
				.filter(participant => participant.userId !== userId)
				.sort((a, b) => a.email.localeCompare(b.email))
		}, [currentConversation, userId])

		const unreadMessages = useMemo(() => {
			if (
				!currentConversation ||
				!lastFocusTimestamp ||
				messages.length === 0 ||
				typeof lastFocusTimestamp[currentConversation.uuid] !== "number"
			) {
				return 0
			}

			return messages.filter(
				message => message.sentTimestamp > lastFocusTimestamp[currentConversation.uuid] && message.senderId !== userId
			).length
		}, [currentConversation, lastFocusTimestamp, messages, userId])

		if (!currentConversation || !currentConversationMe || !conversationParticipantsFilteredWithoutMe) {
			return (
				<Flex
					ref={topbarRef}
					width="100%"
					height="50px"
					borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
					alignItems="center"
					paddingLeft="15px"
					paddingRight="15px"
					flexDirection="row"
					justifyContent="space-between"
				>
					<Flex
						flexDirection="row"
						alignItems="center"
					>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							width="25px"
							height="25px"
							borderRadius="full"
						>
							<Avatar
								name="skeleton"
								width="25px"
								height="25px"
								borderRadius="full"
								border="none"
							/>
						</Skeleton>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
							marginLeft="10px"
							height="20px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textPrimary")}
								fontSize={14}
								marginLeft="10px"
								fontWeight="bold"
							>
								{randomStringUnsafe(getRandomArbitrary(10, 32))}
							</AppText>
						</Skeleton>
					</Flex>
				</Flex>
			)
		}

		return (
			<Flex
				ref={topbarRef}
				width="100%"
				height="50px"
				borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
				alignItems="center"
				paddingLeft="15px"
				paddingRight="15px"
				flexDirection="row"
				justifyContent="space-between"
			>
				{unreadMessages > 0 && (
					<Flex
						position="absolute"
						flexDirection="row"
						width={topbarBounds.width + "px"}
						height="30px"
						backgroundColor={getColor(darkMode, "indigo")}
						top={topbarBounds.height + "px"}
						marginLeft="-15px"
						zIndex={101}
						borderBottomRadius="5px"
						justifyContent="space-between"
						padding="10px"
						cursor="pointer"
						onClick={() =>
							setLastFocusTimestamp(prev => ({
								...prev,
								[currentConversation.uuid]: Date.now()
							}))
						}
					>
						<Flex
							flexDirection="row"
							alignItems="center"
							gap="5px"
						>
							<AppText
								isMobile={isMobile}
								darkMode={darkMode}
								fontSize={13}
								noOfLines={1}
								wordBreak="break-all"
								color="white"
							>
								{unreadMessages >= 9 ? "9+" : unreadMessages}
							</AppText>
							<AppText
								isMobile={isMobile}
								darkMode={darkMode}
								fontSize={13}
								noOfLines={1}
								wordBreak="break-all"
								color="white"
							>
								{i18n(
									lang,
									"chatUnreadMessagesSince",
									false,
									["__DATE__"],
									[new Date((lastFocusTimestamp || {})[currentConversation.uuid]).toDateString()]
								)}
							</AppText>
						</Flex>
						<Flex
							flexDirection="row"
							alignItems="center"
							gap="5px"
							color="white"
						>
							<AppText
								isMobile={isMobile}
								darkMode={darkMode}
								fontSize={13}
								noOfLines={1}
								wordBreak="break-all"
								color="white"
							>
								{i18n(lang, "chatMarkAsRead")}
							</AppText>
							<AiOutlineCheck
								size={16}
								style={{
									flexShrink: 0
								}}
							/>
						</Flex>
					</Flex>
				)}
				<Flex
					flexDirection="row"
					alignItems="center"
					cursor={userId === currentConversation.ownerId ? "pointer" : undefined}
					onClick={() => {
						if (userId !== currentConversation.ownerId) {
							return
						}

						eventListener.emit("openChatConversationEditNameModal", currentConversation)
					}}
				>
					{conversationParticipantsFilteredWithoutMe.length > 1 ? (
						<Avatar
							name={currentConversation?.participants.length + "@" + currentConversation?.uuid}
							color="white"
							bg={generateAvatarColorCode(
								currentConversation?.participants.length + "@" + currentConversation?.uuid,
								darkMode
							)}
							width="25px"
							height="25px"
							borderRadius="full"
							border="none"
						/>
					) : (
						<Avatar
							name={
								typeof conversationParticipantsFilteredWithoutMe[0]?.avatar === "string" &&
								conversationParticipantsFilteredWithoutMe[0]?.avatar.indexOf("https://") !== -1
									? undefined
									: conversationParticipantsFilteredWithoutMe[0]?.email
							}
							src={
								typeof conversationParticipantsFilteredWithoutMe[0]?.avatar === "string" &&
								conversationParticipantsFilteredWithoutMe[0]?.avatar.indexOf("https://") !== -1
									? conversationParticipantsFilteredWithoutMe[0]?.avatar
									: undefined
							}
							bg={generateAvatarColorCode(
								conversationParticipantsFilteredWithoutMe[0]?.email,
								darkMode,
								conversationParticipantsFilteredWithoutMe[0]?.avatar
							)}
							width="25px"
							height="25px"
							borderRadius="full"
							border="none"
						/>
					)}
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textPrimary")}
						fontSize={15}
						marginLeft="10px"
						fontWeight="bold"
					>
						{typeof currentConversation.name === "string" && currentConversation.name.length > 0
							? currentConversation.name
							: conversationParticipantsFilteredWithoutMe.length > 0
							? conversationParticipantsFilteredWithoutMe.map(user => striptags(getUserNameFromParticipant(user))).join(", ")
							: currentConversation.participants.map(user => striptags(getUserNameFromParticipant(user))).join(", ")}
					</AppText>
				</Flex>
			</Flex>
		)
	}
)

export default Topbar
