import { memo, useEffect, useCallback, useRef, useState, useMemo } from "react"
import { ChatSizes } from "./Chats"
import { Flex, Avatar, AvatarBadge } from "@chakra-ui/react"
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
import { Virtuoso } from "react-virtuoso"
import { i18n } from "../../i18n"
import { IoIosAdd } from "react-icons/io"

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
			height={isMobile ? "51px" : "62px"}
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
			<Flex
				backgroundColor={hoveringSettings ? getColor(darkMode, "backgroundSecondary") : undefined}
				width="auto"
				height="auto"
				padding="7px"
				borderRadius="full"
				justifyContent="center"
				alignItems="center"
				onMouseEnter={() => setHoveringSettings(true)}
				onMouseLeave={() => setHoveringSettings(false)}
				onClick={() => eventListener.emit("openNewConversationModal")}
				cursor="pointer"
				className="do-not-unselect-items"
			>
				<HiCog
					size={20}
					cursor="pointer"
					color={hoveringSettings ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
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
	const [hoveringAdd, setHoveringAdd] = useState<boolean>(false)

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

	const itemContent = useCallback(
		(index: number, convo: ChatConversation) => (
			<Conversation
				index={index}
				isMobile={isMobile}
				darkMode={darkMode}
				conversation={convo}
				userId={userId}
				setCurrentConversation={setCurrentConversation}
				unreadConversationsMessages={unreadConversationsMessages}
				setUnreadConversationsMessages={setUnreadConversationsMessages}
				lang={lang}
			/>
		),
		[darkMode, isMobile, lang, userId, unreadConversationsMessages]
	)

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
			width={sizes.conversations + "px"}
			borderRight={"1px solid " + getColor(darkMode, "borderSecondary")}
			flexDirection="column"
			overflow="hidden"
			height={windowHeight + "px"}
		>
			<Flex
				width={sizes.conversations + "px"}
				height="40px"
				flexDirection="row"
				justifyContent="space-between"
				alignItems="center"
				paddingLeft="15px"
				paddingRight="15px"
				paddingTop="10px"
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "textPrimary")}
					fontSize={18}
				>
					{i18n(lang, "chatConversations")}
				</AppText>
				<Flex
					backgroundColor={hoveringAdd ? getColor(darkMode, "backgroundSecondary") : undefined}
					width="auto"
					height="auto"
					padding="4px"
					borderRadius="full"
					justifyContent="center"
					alignItems="center"
					onMouseEnter={() => setHoveringAdd(true)}
					onMouseLeave={() => setHoveringAdd(false)}
					onClick={() => eventListener.emit("openNewConversationModal")}
					cursor="pointer"
					className="do-not-unselect-items"
				>
					<IoIosAdd
						size={24}
						color={hoveringAdd ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
						cursor="pointer"
						className="do-not-unselect-items"
						style={{
							flexShrink: 0
						}}
					/>
				</Flex>
			</Flex>
			<Virtuoso
				data={conversationsSorted}
				height={windowHeight - 40 - (isMobile ? 51 : 62)}
				width={sizes.conversations}
				itemContent={itemContent}
				totalCount={conversationsSorted.length}
			/>
			<Me
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		</Flex>
	)
})

export default Conversations
