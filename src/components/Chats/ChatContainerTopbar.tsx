import { memo, useMemo, useRef, useEffect } from "react"
import { Flex, Avatar } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatConversation, ChatConversationParticipant } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import AppText from "../AppText"

export interface ChatContainerTopbarProps {
	darkMode: boolean
	isMobile: boolean
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
}

const ChatContainerTopbar = memo(({ darkMode, isMobile, currentConversation, currentConversationMe }: ChatContainerTopbarProps) => {
	const [userId] = useDb("userId", 0)
	const currentConversationRef = useRef<ChatConversation | undefined>(currentConversation)
	const currentConversationMeRef = useRef<ChatConversationParticipant | undefined>(currentConversationMe)

	const conversationParticipantsFilteredWithoutMe = useMemo(() => {
		if (!currentConversation) {
			return null
		}

		return currentConversation.participants.filter(participant => participant.userId !== userId)
	}, [currentConversation, userId])

	useEffect(() => {
		currentConversationRef.current = currentConversation
		currentConversationMeRef.current = currentConversationMe
	}, [currentConversation, currentConversationMe])

	if (!conversationParticipantsFilteredWithoutMe) {
		return null
	}

	return (
		<Flex
			width="100%"
			height="100%"
			borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
			alignItems="center"
			paddingLeft="15px"
			paddingRight="15px"
		>
			{conversationParticipantsFilteredWithoutMe.length > 1 ? (
				<Avatar
					name={currentConversation?.participants.length + "@" + currentConversation?.uuid}
					width="25px"
					height="25px"
					borderRadius="full"
					border="none"
				/>
			) : (
				<Avatar
					name={
						typeof conversationParticipantsFilteredWithoutMe[0].avatar === "string" &&
						conversationParticipantsFilteredWithoutMe[0].avatar.indexOf("https://") !== -1
							? undefined
							: conversationParticipantsFilteredWithoutMe[0].email
					}
					src={
						typeof conversationParticipantsFilteredWithoutMe[0].avatar === "string" &&
						conversationParticipantsFilteredWithoutMe[0].avatar.indexOf("https://") !== -1
							? conversationParticipantsFilteredWithoutMe[0].avatar
							: undefined
					}
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
				fontSize={14}
				marginLeft="10px"
				fontWeight="bold"
			>
				{conversationParticipantsFilteredWithoutMe.map(user => user.email).join(", ")}
			</AppText>
		</Flex>
	)
})

export default ChatContainerTopbar
