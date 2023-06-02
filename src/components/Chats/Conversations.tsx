import { memo, useEffect, useCallback, useRef, useState, useMemo } from "react"
import { ChatSizes } from "./Chats"
import { Flex, Button, Avatar, AvatarBadge } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import {
	chatConversations as fetchChatConversations,
	ChatConversation,
	chatConversationsUnread,
	chatConversationsRead
} from "../../lib/api"
import { safeAwait, getCurrentParent, Semaphore } from "../../lib/helpers"
import useDb from "../../lib/hooks/useDb"
import { useNavigate } from "react-router-dom"
import { validate } from "uuid"
import Conversation from "./Conversation"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import { fetchUserAccount } from "../../lib/services/user"
import { UserGetAccount } from "../../types"
import { getUserNameFromAccount } from "./utils"
import AppText from "../AppText"
import { HiCog } from "react-icons/hi"

export interface MeProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
}

const Me = memo(({ darkMode, isMobile, lang }: MeProps) => {
	const [userAccount, setUserAccount] = useState<UserGetAccount | undefined>(undefined)
	const [hoveringSettings, setHoveringSettings] = useState<boolean>(false)

	const fetchAccount = useCallback(async () => {
		const [accountErr, accountRes] = await safeAwait(fetchUserAccount())

		if (accountErr) {
			console.error(accountErr)

			return
		}

		setUserAccount(accountRes)
	}, [])

	useEffect(() => {
		fetchAccount()
	}, [])

	if (!userAccount) {
		return null
	}

	return (
		<Flex
			borderTop={"1px solid " + getColor(darkMode, "borderSecondary")}
			alignItems="center"
			height={isMobile ? "41px" : "52px"}
			flexDirection="row"
			paddingLeft="10px"
			paddingRight="10px"
			justifyContent="space-between"
		>
			<Flex
				flexDirection="row"
				alignItems="center"
			>
				<Avatar
					name={
						typeof userAccount.avatarURL === "string" && userAccount.avatarURL.indexOf("https://") !== -1
							? undefined
							: userAccount.email
					}
					src={
						typeof userAccount.avatarURL === "string" && userAccount.avatarURL.indexOf("https://") !== -1
							? userAccount.avatarURL
							: undefined
					}
					width="30px"
					height="30px"
					borderRadius="full"
					border="none"
				>
					<AvatarBadge
						boxSize="12px"
						border="none"
						backgroundColor={getColor(darkMode, "green")}
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
					{getUserNameFromAccount(userAccount)}
				</AppText>
			</Flex>
			<Flex>
				<HiCog
					size={20}
					cursor="pointer"
					onMouseEnter={() => setHoveringSettings(true)}
					onMouseLeave={() => setHoveringSettings(false)}
					color={hoveringSettings ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
					style={{
						marginRight: "3px"
					}}
				/>
			</Flex>
		</Flex>
	)
})

export interface ConversationsProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	sizes: ChatSizes
	setCurrentConversation: React.Dispatch<React.SetStateAction<ChatConversation | undefined>>
	lang: string
}

const Conversations = memo(({ darkMode, isMobile, windowHeight, sizes, setCurrentConversation, lang }: ConversationsProps) => {
	const conversationsTimestamp = useRef<number>(Date.now() + 3600000)
	const [conversations, setConversations] = useState<ChatConversation[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [userId] = useDb("userId", 0)
	const navigate = useNavigate()
	const [unreadConversationsMessages, setUnreadConversationsMessages] = useState<Record<string, number>>({})
	const windowFocused = useRef<boolean>(true)
	const userIdRef = useRef<number>(userId)

	const conversationsSorted = useMemo(() => {
		return conversations
			.filter(convo => convo.participants.length > 0 && (convo.lastMessageTimestamp > 0 || userId === convo.ownerId))
			.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
	}, [conversations])

	const fetchConversations = useCallback(async (showLoader = true) => {
		setLoading(showLoader)

		const [conversationsErr, conversationsRes] = await safeAwait(fetchChatConversations(conversationsTimestamp.current))

		if (conversationsErr) {
			setLoading(false)

			console.error(conversationsErr)

			return
		}

		const promises: Promise<void>[] = []
		const semaphore = new Semaphore(32)

		for (const conversation of conversationsRes) {
			promises.push(
				new Promise<void>(async resolve => {
					await semaphore.acquire()

					const [conversationsUnreadErr, conversationsUnreadRes] = await safeAwait(chatConversationsUnread(conversation.uuid))

					semaphore.release()

					if (conversationsUnreadErr) {
						console.error(conversationsUnreadErr)

						resolve()

						return
					}

					setUnreadConversationsMessages(prev => ({
						...prev,
						[conversation.uuid]: conversationsUnreadRes
					}))

					resolve()
				})
			)
		}

		await Promise.all(promises)

		setLoading(false)
		setConversations(conversationsRes)
	}, [])

	const onFocus = useCallback(async () => {
		windowFocused.current = true

		const currentConversationUUID = getCurrentParent(window.location.href)

		if (validate(currentConversationUUID)) {
			setUnreadConversationsMessages(prev => ({
				...prev,
				[currentConversationUUID]: 0
			}))

			await safeAwait(chatConversationsRead(currentConversationUUID))
		}

		safeAwait(fetchConversations())
	}, [])

	const onBlur = useCallback(() => {
		windowFocused.current = false
	}, [])

	useEffect(() => {
		window.addEventListener("focus", onFocus)
		window.addEventListener("blur", onBlur)

		return () => {
			window.removeEventListener("focus", onFocus)
			window.removeEventListener("blur", onBlur)
		}
	}, [])

	useEffect(() => {
		userIdRef.current = userId
	}, [userId])

	useEffect(() => {
		if (conversationsSorted.length > 0 && !validate(getCurrentParent(window.location.href))) {
			setCurrentConversation(conversationsSorted[0])

			navigate("#/chats/" + conversationsSorted[0].uuid)
		}
	}, [conversationsSorted])

	useEffect(() => {
		const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			if (event.type === "chatMessageNew") {
				setConversations(prev =>
					prev.map(conversation =>
						conversation.uuid === event.data.conversation
							? {
									...conversation,
									lastMessage: event.data.message,
									lastMessageSender: event.data.senderId,
									lastMessageTimestamp: event.data.sentTimestamp
							  }
							: conversation
					)
				)

				if (
					(getCurrentParent(window.location.href) !== event.data.conversation || !windowFocused.current) &&
					event.data.senderId !== userIdRef.current
				) {
					setUnreadConversationsMessages(prev => ({
						...prev,
						[event.data.conversation]: typeof prev[event.data.conversation] !== "number" ? 1 : prev[event.data.conversation] + 1
					}))
				}
			} else if (event.type === "chatConversationsNew") {
				fetchConversations(false)
			}
		})

		const updateChatConversationsListener = eventListener.on("updateChatConversations", () => {
			fetchConversations(false)
		})

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			fetchConversations(false)
		})

		return () => {
			socketEventListener.remove()
			updateChatConversationsListener.remove()
			socketAuthedListener.remove()
		}
	}, [])

	useEffect(() => {
		fetchConversations()
	}, [])

	return (
		<Flex
			width={sizes.conversations}
			borderRight={"1px solid " + getColor(darkMode, "borderSecondary")}
			flexDirection="column"
		>
			<Flex
				width={sizes.conversations}
				flexDirection="column"
				height={windowHeight - 50 - (isMobile ? 41 : 52)}
			>
				<Flex
					flexDirection="row"
					alignItems="center"
					padding="10px"
					paddingBottom="0px"
				>
					<Button
						backgroundColor={darkMode ? "white" : "gray"}
						color={darkMode ? "black" : "white"}
						height="28px"
						width="100%"
						paddingLeft="10px"
						paddingRight="10px"
						fontSize={13}
						border={"1px solid " + darkMode ? "white" : "gray"}
						onClick={() => eventListener.emit("openNewConversationModal")}
					>
						New chat
					</Button>
				</Flex>
				{conversationsSorted.map((conversation, index) => {
					return (
						<Conversation
							key={conversation.uuid}
							index={index}
							isMobile={isMobile}
							darkMode={darkMode}
							conversation={conversation}
							userId={userId}
							setCurrentConversation={setCurrentConversation}
							unreadConversationsMessages={unreadConversationsMessages}
							setUnreadConversationsMessages={setUnreadConversationsMessages}
							lang={lang}
						/>
					)
				})}
			</Flex>
			<Me
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		</Flex>
	)
})

export default Conversations
