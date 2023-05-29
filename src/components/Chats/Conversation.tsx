import { memo, useEffect, useState, useMemo } from "react"
import { ChatConversation } from "../../lib/api"
import { getColor } from "../../styles/colors"
import { Flex, Avatar, AvatarBadge } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"
import AppText from "../AppText"
import { decryptChatMessage } from "../../lib/worker/worker.worker"
import db from "../../lib/db"
import { getCurrentParent } from "../../lib/helpers"

export interface ConversationProps {
	darkMode: boolean
	isMobile: boolean
	conversation: ChatConversation
	userId: number
	setCurrentConversation: React.Dispatch<React.SetStateAction<ChatConversation | undefined>>
	unreadConversationsMessages: Record<string, number>
	setUnreadConversationsMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>
	index: number
}

const Conversation = memo(
	({
		darkMode,
		isMobile,
		conversation,
		setCurrentConversation,
		userId,
		unreadConversationsMessages,
		setUnreadConversationsMessages,
		index
	}: ConversationProps) => {
		const navigate = useNavigate()
		const [lastMessageDecrypted, setLastMessageDecrypted] = useState<string>("")

		const conversationParticipantsFilteredWithoutMe = useMemo(() => {
			return conversation.participants.filter(participant => participant.userId !== userId)
		}, [conversation.participants, userId])

		const conversationMe = useMemo(() => {
			const filtered = conversation.participants.filter(participant => participant.userId === userId)

			if (filtered.length === 0) {
				return null
			}

			return filtered[0]
		}, [conversation.participants, userId])

		useEffect(() => {
			;(async () => {
				if (!conversationMe || typeof conversation.lastMessage !== "string" || conversation.lastMessage.length === 0) {
					return
				}

				const privateKey = await db.get("privateKey")
				const decryptedMessage = await decryptChatMessage(conversation.lastMessage, conversationMe.metadata, privateKey)

				if (decryptedMessage.length === 0) {
					return
				}

				setLastMessageDecrypted(decryptedMessage)
			})()
		}, [conversation.lastMessage, conversationMe])

		return (
			<Flex
				padding="10px"
				paddingTop={index <= 0 ? "10px" : "5px"}
				paddingBottom="0px"
			>
				<Flex
					flexDirection="row"
					alignItems="center"
					padding="10px"
					cursor="pointer"
					borderRadius="10px"
					width="100%"
					backgroundColor={
						getCurrentParent(window.location.href) === conversation.uuid
							? getColor(darkMode, "backgroundSecondary")
							: "transparent"
					}
					onClick={() => {
						setCurrentConversation(conversation)

						navigate("#/chats/" + conversation.uuid)

						setUnreadConversationsMessages(prev => ({
							...prev,
							[conversation.uuid]: 0
						}))
					}}
					_hover={{
						backgroundColor: getColor(darkMode, "backgroundSecondary")
					}}
				>
					<Flex>
						{conversationParticipantsFilteredWithoutMe.length > 1 ? (
							<Avatar
								name={conversation.participants.length + "@" + conversation.uuid}
								width="30px"
								height="30px"
								borderRadius="full"
							>
								{typeof unreadConversationsMessages[conversation.uuid] === "number" &&
									unreadConversationsMessages[conversation.uuid] > 0 && (
										<AvatarBadge
											boxSize="16px"
											border="none"
											backgroundColor={getColor(darkMode, "red")}
											fontSize={10}
											color="white"
											fontWeight="bold"
											justifyContent="center"
											alignItems="center"
										>
											{unreadConversationsMessages[conversation.uuid] >= 99
												? 99
												: unreadConversationsMessages[conversation.uuid]}
										</AvatarBadge>
									)}
							</Avatar>
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
								width="30px"
								height="30px"
								borderRadius="full"
							>
								{typeof unreadConversationsMessages[conversation.uuid] === "number" &&
									unreadConversationsMessages[conversation.uuid] > 0 && (
										<AvatarBadge
											boxSize="16px"
											border="none"
											backgroundColor={getColor(darkMode, "red")}
											fontSize={10}
											color="white"
											fontWeight="bold"
											justifyContent="center"
											alignItems="center"
										>
											{unreadConversationsMessages[conversation.uuid] >= 99
												? 99
												: unreadConversationsMessages[conversation.uuid]}
										</AvatarBadge>
									)}
							</Avatar>
						)}
					</Flex>
					<Flex flexDirection="column">
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={
								getCurrentParent(window.location.href) === conversation.uuid
									? getColor(darkMode, "textPrimary")
									: getColor(darkMode, "textSecondary")
							}
							marginLeft="10px"
							fontSize={15}
						>
							{conversationParticipantsFilteredWithoutMe
								.map(participant =>
									typeof participant.firstName === "string" &&
									participant.firstName.length > 0 &&
									typeof participant.lastName === "string" &&
									participant.lastName.length > 0
										? participant.firstName + " " + participant.lastName
										: participant.email
								)
								.join(", ")}
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "textSecondary")}
							marginLeft="10px"
							fontSize={11}
						>
							{conversation.lastMessageSender === userId ? "You: " : "Others: "}
							{typeof conversation.lastMessage === "string" &&
							conversation.lastMessage.length > 0 &&
							lastMessageDecrypted.length > 0
								? lastMessageDecrypted
								: "No messages yet"}
						</AppText>
					</Flex>
				</Flex>
			</Flex>
		)
	}
)

export default Conversation
