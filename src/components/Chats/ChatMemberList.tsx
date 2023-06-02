import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { ChatSizes } from "./Chats"
import { getColor } from "../../styles/colors"
import { Flex, Avatar, AvatarBadge } from "@chakra-ui/react"
import { ChatConversation, ChatConversationParticipant, chatConversationsOnline, ChatConversationsOnline } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import AppText from "../AppText"
import eventListener from "../../lib/eventListener"
import { getUserNameFromParticipant } from "./utils"
import { IoCloseOutline } from "react-icons/io5"

const ONLINE_TIMEOUT = 900000

export type OnlineUsers = Record<string, ChatConversationsOnline>

export interface ChatMemberProps {
	darkMode: boolean
	isMobile: boolean
	user: ChatConversationParticipant
	onlineUsers: OnlineUsers
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
}

const ChatMember = memo(({ user, darkMode, onlineUsers, isMobile, currentConversation, currentConversationMe }: ChatMemberProps) => {
	const currentConversationRef = useRef<ChatConversation | undefined>(currentConversation)
	const currentConversationMeRef = useRef<ChatConversationParticipant | undefined>(currentConversationMe)
	const [hovering, setHovering] = useState<boolean>(false)
	const [hoveringDelete, setHoveringDelete] = useState<boolean>(false)

	const removeUser = useCallback(async () => {
		console.log("remove", user)
	}, [user])

	const showUserModal = useCallback(() => {
		console.log("show user modal", user)
	}, [user])

	useEffect(() => {
		currentConversationRef.current = currentConversation
		currentConversationMeRef.current = currentConversationMe
	}, [currentConversation, currentConversationMe])

	if (!currentConversation || !currentConversationMe) {
		return null
	}

	return (
		<Flex
			padding="10px"
			paddingBottom="0px"
			onMouseEnter={() => setHovering(true)}
			onMouseLeave={() => setHovering(false)}
		>
			<Flex
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
				justifyContent="space-between"
			>
				<Flex
					alignItems="center"
					flexDirection="row"
				>
					<Avatar
						name={typeof user.avatar === "string" && user.avatar.indexOf("https://") !== -1 ? undefined : user.email}
						src={typeof user.avatar === "string" && user.avatar.indexOf("https://") !== -1 ? user.avatar : undefined}
						width="30px"
						height="30px"
						borderRadius="full"
						border="none"
						onClick={() => showUserModal()}
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
						onClick={() => showUserModal()}
					>
						{getUserNameFromParticipant(user)}
					</AppText>
				</Flex>
				<Flex>
					{hovering &&
						currentConversation.ownerId === currentConversationMe.userId &&
						currentConversation.participants.length > 1 &&
						user.userId !== currentConversationMe.userId && (
							<IoCloseOutline
								size={18}
								cursor="pointer"
								onMouseEnter={() => setHoveringDelete(true)}
								onMouseLeave={() => setHoveringDelete(false)}
								color={hoveringDelete ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								style={{
									marginRight: "3px"
								}}
								onClick={() => removeUser()}
							/>
						)}
				</Flex>
			</Flex>
		</Flex>
	)
})

export interface ChatMemberListProps {
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

const ChatMemberList = memo(
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
	}: ChatMemberListProps) => {
		const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({})
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
						<ChatMember
							key={user.userId}
							isMobile={isMobile}
							darkMode={darkMode}
							onlineUsers={onlineUsers}
							user={user}
							currentConversation={currentConversation}
							currentConversationMe={currentConversationMe}
						/>
					)
				})}
			</Flex>
		)
	}
)

export default ChatMemberList
