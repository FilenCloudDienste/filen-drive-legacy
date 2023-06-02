import { memo, useEffect, useState, useMemo, useCallback } from "react"
import { ChatConversation } from "../../lib/api"
import { getColor } from "../../styles/colors"
import { Flex, Avatar, AvatarBadge } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"
import AppText from "../AppText"
import { decryptChatMessage } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { getCurrentParent } from "../../lib/helpers"
import { getUserNameFromParticipant } from "./utils"
import { IoCloseOutline, IoTrashOutline } from "react-icons/io5"

export interface ConversationProps {
	darkMode: boolean
	isMobile: boolean
	conversation: ChatConversation
	userId: number
	setCurrentConversation: React.Dispatch<React.SetStateAction<ChatConversation | undefined>>
	unreadConversationsMessages: Record<string, number>
	setUnreadConversationsMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>
	index: number
	lang: string
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
		index,
		lang
	}: ConversationProps) => {
		const navigate = useNavigate()
		const [lastMessageDecrypted, setLastMessageDecrypted] = useState<string>("")
		const [hovering, setHovering] = useState<boolean>(false)
		const [hoveringDelete, setHoveringDelete] = useState<boolean>(false)

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

		const lastMessageInlcudingSender = useMemo(() => {
			let message = ""

			if (conversation.lastMessageSender === userId) {
				message = "You: "
			} else {
				const senderFromList = conversationParticipantsFilteredWithoutMe.filter(
					participant => participant.userId === conversation.lastMessageSender
				)

				if (senderFromList.length === 1) {
					message = getUserNameFromParticipant(senderFromList[0]) + ": "
				}
			}

			if (typeof conversation.lastMessage === "string" && conversation.lastMessage.length > 0 && lastMessageDecrypted.length > 0) {
				message = message + lastMessageDecrypted
			} else {
				message = message + "No messages yet"
			}

			return message
		}, [lang, conversationParticipantsFilteredWithoutMe, lastMessageDecrypted])

		const deleteConversation = useCallback(async () => {
			console.log("delete convo")
		}, [conversation])

		const leaveConversation = useCallback(async () => {
			console.log("leave convo")
		}, [conversation])

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
				onMouseEnter={() => setHovering(true)}
				onMouseLeave={() => setHovering(false)}
			>
				<Flex
					flexDirection="row"
					alignItems="center"
					justifyContent="space-between"
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
					<Flex
						alignItems="center"
						flexDirection="row"
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
									.map(participant => getUserNameFromParticipant(participant))
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
								{lastMessageInlcudingSender}
							</AppText>
						</Flex>
					</Flex>
					<Flex>
						{hovering && (
							<>
								{conversation.ownerId === userId ? (
									<IoTrashOutline
										size={18}
										cursor="pointer"
										onMouseEnter={() => setHoveringDelete(true)}
										onMouseLeave={() => setHoveringDelete(false)}
										color={hoveringDelete ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
										style={{
											marginRight: "3px"
										}}
										onClick={() => deleteConversation()}
									/>
								) : (
									<IoCloseOutline
										size={18}
										cursor="pointer"
										onMouseEnter={() => setHoveringDelete(true)}
										onMouseLeave={() => setHoveringDelete(false)}
										color={hoveringDelete ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
										style={{
											marginRight: "3px"
										}}
										onClick={() => leaveConversation()}
									/>
								)}
							</>
						)}
					</Flex>
				</Flex>
			</Flex>
		)
	}
)

export default Conversation
