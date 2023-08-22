import { memo, useEffect, useState, useMemo, useCallback } from "react"
import { ChatConversation, chatConversationsUnread } from "../../lib/api"
import { getColor } from "../../styles/colors"
import { Flex, Avatar, AvatarBadge, Skeleton } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"
import AppText from "../AppText"
import { decryptChatMessage } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { getCurrentParent, getRandomArbitrary, randomStringUnsafe, generateAvatarColorCode, safeAwait, Semaphore } from "../../lib/helpers"
import { getUserNameFromParticipant } from "./utils"
import { IoCloseOutline, IoTrashOutline } from "react-icons/io5"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import striptags from "striptags"
import eventListener from "../../lib/eventListener"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"

const updateUnreadMutex = new Semaphore(1)

export const ConversationSkeleton = memo(({ index }: { index: number }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()

	return (
		<Flex
			padding="10px"
			paddingTop={index <= 0 ? "5px" : "0px"}
			paddingBottom="0px"
		>
			<Flex
				flexDirection="row"
				alignItems="center"
				justifyContent="space-between"
				padding="10px"
				cursor="pointer"
				borderRadius="10px"
				width="100%"
			>
				<Flex
					alignItems="center"
					flexDirection="row"
				>
					<Flex>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							width="30px"
							height="30px"
							borderRadius="full"
						>
							<Avatar
								name="skeleton"
								width="30px"
								height="30px"
								borderRadius="full"
							/>
						</Skeleton>
					</Flex>
					<Flex
						flexDirection="column"
						paddingLeft="10px"
					>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								marginLeft="10px"
								fontSize={15}
							>
								{randomStringUnsafe(getRandomArbitrary(8, 16))}
							</AppText>
						</Skeleton>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
							marginTop="5px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textSecondary")}
								marginLeft="10px"
								fontSize={12}
							>
								{randomStringUnsafe(getRandomArbitrary(16, 32))}
							</AppText>
						</Skeleton>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	)
})

export interface ConversationProps {
	conversation: ChatConversation
	userId: number
	unreadConversationsMessages: Record<string, number>
	setUnreadConversationsMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>
	index: number
}

export const Conversation = memo(
	({ conversation, userId, unreadConversationsMessages, index, setUnreadConversationsMessages }: ConversationProps) => {
		const isMobile = useIsMobile()
		const darkMode = useDarkMode()
		const lang = useLang()
		const navigate = useNavigate()
		const [lastMessageDecrypted, setLastMessageDecrypted] = useState<string>("")
		const [hovering, setHovering] = useState<boolean>(false)
		const [hoveringDelete, setHoveringDelete] = useState<boolean>(false)

		const conversationParticipantsFilteredWithoutMe = useMemo(() => {
			const filtered = conversation.participants.filter(participant => participant.userId !== userId)

			return (conversation.participants.length <= 1 ? conversation.participants : filtered).sort((a, b) =>
				a.email.localeCompare(b.email)
			)
		}, [conversation.participants, userId])

		const conversationMe = useMemo(() => {
			const filtered = conversation.participants.filter(participant => participant.userId === userId)

			if (filtered.length === 0) {
				return null
			}

			return filtered[0]
		}, [conversation.participants, userId])

		const lastMessageIncludingSender = useMemo(() => {
			let message = ""

			if (conversation.lastMessageSender === userId) {
				message = i18n(lang, "chatYou") + ": "
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
				message = message + i18n(lang, "chatNoMessagesYet")
			}

			return message.split("`").join("")
		}, [lang, conversationParticipantsFilteredWithoutMe, lastMessageDecrypted, userId])

		const updateUnread = useCallback(async () => {
			await updateUnreadMutex.acquire()

			const [unreadErr, unreadRes] = await safeAwait(chatConversationsUnread(conversation.uuid))

			updateUnreadMutex.release()

			if (unreadErr) {
				console.error(unreadErr)

				return
			}

			setUnreadConversationsMessages(prev => ({
				...prev,
				[conversation.uuid]: unreadRes
			}))
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

		useEffect(() => {
			const updateUnreadInterval = setInterval(updateUnread, 5000)

			return () => {
				clearInterval(updateUnreadInterval)
			}
		}, [])

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
						getCurrentParent(window.location.href) === conversation.uuid || hovering
							? getColor(darkMode, "backgroundSecondary")
							: "transparent"
					}
					onClick={() => {
						navigate("#/chats/" + conversation.uuid)
					}}
					_hover={{
						backgroundColor: getColor(darkMode, "backgroundSecondary")
					}}
					gap="10px"
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
									color="white"
									bg={generateAvatarColorCode(conversation.participants.length + "@" + conversation.uuid, darkMode)}
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
									bg={generateAvatarColorCode(conversationParticipantsFilteredWithoutMe[0]?.email, darkMode)}
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
									getCurrentParent(window.location.href) === conversation.uuid || hovering
										? getColor(darkMode, "textPrimary")
										: getColor(darkMode, "textSecondary")
								}
								marginLeft="10px"
								fontSize={15}
							>
								{conversationParticipantsFilteredWithoutMe
									.map(participant => striptags(getUserNameFromParticipant(participant)))
									.join(", ")}
							</AppText>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textSecondary")}
								marginLeft="10px"
								fontSize={12}
							>
								{lastMessageIncludingSender}
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
										onClick={e => {
											e.preventDefault()
											e.stopPropagation()

											eventListener.emit("openDeleteChatConversationModal", conversation)
										}}
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
										onClick={e => {
											e.preventDefault()
											e.stopPropagation()

											eventListener.emit("openLeaveChatConversationModal", conversation)
										}}
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
