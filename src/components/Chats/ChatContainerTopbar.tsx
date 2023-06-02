import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react"
import { Flex, Avatar } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatConversation, ChatConversationParticipant } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import AppText from "../AppText"
import { IoPersonAddOutline, IoPersonAdd } from "react-icons/io5"
import eventListener from "../../lib/eventListener"
import db from "../../lib/db"
import { decryptChatMessageKey } from "../../lib/worker/worker.com"

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
	const [hoveringAddUser, setHoveringAddUser] = useState<boolean>(false)

	const conversationParticipantsFilteredWithoutMe = useMemo(() => {
		if (!currentConversation) {
			return null
		}

		return currentConversation.participants.filter(participant => participant.userId !== userId)
	}, [currentConversation, userId])

	const addUser = useCallback(async () => {
		if (!currentConversation || !currentConversationMe) {
			return
		}

		const privateKey = await db.get("privateKey")
		const key = await decryptChatMessageKey(currentConversationMe.metadata, privateKey)

		eventListener.emit("openAddUserToConversationModal", {
			uuid: currentConversation.uuid,
			key
		})
	}, [currentConversation, currentConversationMe])

	useEffect(() => {
		currentConversationRef.current = currentConversation
		currentConversationMeRef.current = currentConversationMe
	}, [currentConversation, currentConversationMe])

	if (!currentConversation || !currentConversationMe || !conversationParticipantsFilteredWithoutMe) {
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
			flexDirection="row"
			justifyContent="space-between"
		>
			<Flex
				flexDirection="row"
				alignItems="center"
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
			<Flex>
				{currentConversationMe.permissionsAdd && (
					<IoPersonAdd
						size={18}
						cursor="pointer"
						onMouseEnter={() => setHoveringAddUser(true)}
						onMouseLeave={() => setHoveringAddUser(false)}
						color={hoveringAddUser ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
						onClick={() => addUser()}
					/>
				)}
			</Flex>
		</Flex>
	)
})

export default ChatContainerTopbar
