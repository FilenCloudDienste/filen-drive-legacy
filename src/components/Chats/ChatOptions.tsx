import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { ChatSizes } from "./Chats"
import { getColor } from "../../styles/colors"
import { Flex, Avatar, AvatarBadge } from "@chakra-ui/react"
import { ChatConversation, ChatConversationParticipant, chatConversationsOnline, ChatConversationsOnline } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import AppText from "../AppText"
import eventListener from "../../lib/eventListener"
import { decryptChatMessageKey } from "../../lib/worker/worker.worker"
import db from "../../lib/db"

const ONLINE_TIMEOUT = 600000

export interface ChatOptionsProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	sidebarWidth: number
	lang: string
	sizes: ChatSizes
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
	setCurrentConversation: React.Dispatch<React.SetStateAction<ChatConversation | undefined>>
}

const ChatOptions = memo(
	({
		darkMode,
		isMobile,
		windowHeight,
		windowWidth,
		sidebarWidth,
		lang,
		sizes,
		currentConversation,
		currentConversationMe,
		setCurrentConversation
	}: ChatOptionsProps) => {
		const [onlineUsers, setOnlineUsers] = useState<Record<string, ChatConversationsOnline>>({})
		const currentConversationRef = useRef<ChatConversation | undefined>(currentConversation)
		const currentConversationMeRef = useRef<ChatConversationParticipant | undefined>(currentConversationMe)

		const usersSorted = useMemo(() => {
			if (!currentConversation || !onlineUsers || Object.keys(onlineUsers).length === 0) {
				return []
			}

			return currentConversation.participants.sort((a, b) => {
				const isOnlineA =
					onlineUsers[a.userId] && onlineUsers[a.userId].appearOffline
						? -1
						: onlineUsers[a.userId] &&
						  typeof onlineUsers[a.userId].lastActive === "number" &&
						  onlineUsers[a.userId].lastActive > 0 &&
						  onlineUsers[a.userId].lastActive > Date.now() - ONLINE_TIMEOUT
						? 1
						: 0
				const isOnlineB =
					onlineUsers[b.userId] && onlineUsers[b.userId].appearOffline
						? -1
						: onlineUsers[b.userId] &&
						  typeof onlineUsers[b.userId].lastActive === "number" &&
						  onlineUsers[b.userId].lastActive > 0 &&
						  onlineUsers[b.userId].lastActive > Date.now() - ONLINE_TIMEOUT
						? 1
						: 0

				if (isOnlineA > isOnlineB) {
					return -1
				} else if (isOnlineA < isOnlineB) {
					return 1
				} else {
					return a.email.localeCompare(b.email)
				}
			})
		}, [currentConversation, onlineUsers])

		const updateOnlineUsers = useCallback(async () => {
			if (!currentConversationRef.current) {
				return
			}

			const [err, res] = await safeAwait(chatConversationsOnline(currentConversationRef.current.uuid))

			if (err) {
				console.error(err)

				return
			}

			const online: Record<string, ChatConversationsOnline> = {}

			for (const user of res) {
				online[user.userId] = user
			}

			setOnlineUsers(online)
		}, [])

		useEffect(() => {
			currentConversationRef.current = currentConversation
			currentConversationMeRef.current = currentConversationMe
		}, [currentConversation, currentConversationMe])

		useEffect(() => {
			updateOnlineUsers()
		}, [currentConversation?.uuid])

		useEffect(() => {
			const updateOnlineUsersInterval = setInterval(updateOnlineUsers, 30000)

			const socketAuthedListener = eventListener.on("socketAuthed", () => {
				updateOnlineUsers()
			})

			return () => {
				clearInterval(updateOnlineUsersInterval)

				socketAuthedListener.remove()
			}
		}, [])

		if (isMobile) {
			return null
		}

		return (
			<Flex
				height={windowHeight - 50}
				width={sizes.chatOptions}
				borderLeft={"1px solid " + getColor(darkMode, "borderSecondary")}
				flexDirection="column"
				overflowY="auto"
			>
				{usersSorted.map(user => {
					return (
						<Flex
							padding="10px"
							paddingBottom="0px"
						>
							<Flex
								key={user.userId}
								padding="10px"
								paddingTop="6px"
								paddingLeft="6px"
								paddingRight="6px"
								flexDirection="row"
								alignItems="center"
								cursor="pointer"
								borderRadius="10px"
								width="100%"
								_hover={{
									backgroundColor: getColor(darkMode, "backgroundSecondary")
								}}
							>
								<Avatar
									name={
										typeof user.avatar === "string" && user.avatar.indexOf("https://") !== -1 ? undefined : user.email
									}
									src={
										typeof user.avatar === "string" && user.avatar.indexOf("https://") !== -1 ? user.avatar : undefined
									}
									width="30px"
									height="30px"
									borderRadius="full"
									border="none"
								>
									<AvatarBadge
										boxSize="12px"
										border="none"
										backgroundColor={
											onlineUsers[user.userId] &&
											!onlineUsers[user.userId].appearOffline &&
											onlineUsers[user.userId].lastActive > 0
												? onlineUsers[user.userId].lastActive > Date.now() - ONLINE_TIMEOUT
													? getColor(darkMode, "green")
													: getColor(darkMode, "red")
												: "gray"
										}
									/>
								</Avatar>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									noOfLines={1}
									wordBreak="break-all"
									color={getColor(darkMode, "textSecondary")}
									marginLeft="10px"
									fontSize={15}
								>
									{typeof user.firstName === "string" &&
									user.firstName.length > 0 &&
									typeof user.lastName === "string" &&
									user.lastName.length > 0
										? user.firstName + " " + user.lastName
										: user.email}
								</AppText>
							</Flex>
						</Flex>
					)
				})}
				{currentConversationMe && currentConversationMe.permissionsAdd && usersSorted.length > 0 && (
					<Flex
						flexDirection="row"
						padding="10px"
						alignItems="center"
						justifyContent="center"
						borderTop={"1px solid " + getColor(darkMode, "borderSecondary")}
						marginTop="10px"
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							fontSize={15}
							cursor="pointer"
							onClick={async () => {
								if (!currentConversation || !currentConversationMe) {
									return
								}

								const privateKey = await db.get("privateKey")
								const key = await decryptChatMessageKey(currentConversationMe.metadata, privateKey)

								eventListener.emit("openAddUserToConversationModal", {
									uuid: currentConversation.uuid,
									key
								})
							}}
							_hover={{
								textDecoration: "underline"
							}}
						>
							Add user
						</AppText>
					</Flex>
				)}
			</Flex>
		)
	}
)

export default ChatOptions
