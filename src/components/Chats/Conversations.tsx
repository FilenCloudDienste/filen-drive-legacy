import { memo, useEffect, useCallback, useRef, useState, useMemo } from "react"
import { ChatSizes } from "./Chats"
import { Flex, Avatar, AvatarBadge, Skeleton, Input } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { ChatConversation, chatConversationsUnread } from "../../lib/api"
import { safeAwait, getCurrentParent, Semaphore, generateAvatarColorCode, randomStringUnsafe } from "../../lib/helpers"
import useDb from "../../lib/hooks/useDb"
import { useNavigate, useLocation } from "react-router-dom"
import { validate } from "uuid"
import Conversation, { ConversationSkeleton } from "./Conversation"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import { fetchUserAccount } from "../../lib/services/user"
import { UserGetAccount } from "../../types"
import { getUserNameFromAccount, fetchChatConversations, sortAndFilterConversations } from "./utils"
import AppText from "../AppText"
import { HiCog } from "react-icons/hi"
import { Virtuoso } from "react-virtuoso"
import { i18n } from "../../i18n"
import { IoIosAdd } from "react-icons/io"
import db from "../../lib/db"

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

		const chatSettingsChangedListener = eventListener.on("chatSettingsChanged", () => {
			fetchAccount()
		})

		return () => {
			chatSettingsChangedListener.remove()
		}
	}, [])

	if (!userAccount) {
		return (
			<Flex
				borderTop={"1px solid " + getColor(darkMode, "borderSecondary")}
				alignItems="center"
				height={isMobile ? "50px" : "60px"}
				flexDirection="row"
				paddingLeft="10px"
				paddingRight="10px"
				justifyContent="space-between"
			>
				<Flex
					flexDirection="row"
					alignItems="center"
					gap="8px"
				>
					<Skeleton
						startColor={getColor(darkMode, "backgroundSecondary")}
						endColor={getColor(darkMode, "backgroundTertiary")}
						width="32px"
						height="32px"
						borderRadius="full"
					>
						<Avatar
							name="none"
							bg={generateAvatarColorCode("none", darkMode)}
							width="32px"
							height="32px"
							borderRadius="full"
							border="none"
						>
							<AvatarBadge
								boxSize="12px"
								border="none"
								backgroundColor={getColor(darkMode, "green")}
							/>
						</Avatar>
					</Skeleton>
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
							color={getColor(darkMode, "textSecondary")}
							marginLeft="10px"
							fontSize={15}
						>
							{randomStringUnsafe(64)}
						</AppText>
					</Skeleton>
				</Flex>
			</Flex>
		)
	}

	return (
		<Flex
			borderTop={"1px solid " + getColor(darkMode, "borderSecondary")}
			alignItems="center"
			height={isMobile ? "50px" : "60px"}
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
					bg={generateAvatarColorCode(userAccount.email, darkMode)}
					width="30px"
					height="30px"
					borderRadius="full"
					border="none"
				>
					<AvatarBadge
						boxSize="12px"
						border="none"
						backgroundColor={userAccount.appearOffline ? "gray" : getColor(darkMode, "green")}
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
				onClick={() => eventListener.emit("openChatSettingsModal")}
				cursor="pointer"
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

const loadingConversations = new Array(5).fill(1).map(() => ({
	uuid: "",
	lastMessageSender: 0,
	lastMessage: null,
	lastMessageTimestamp: 0,
	lastMessageUUID: null,
	ownerId: 0,
	participants: [],
	createdTimestamp: 0
})) as ChatConversation[]

export interface ConversationsProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	sizes: ChatSizes
	conversations: ChatConversation[]
	setConversations: React.Dispatch<React.SetStateAction<ChatConversation[]>>
	lang: string
	unreadConversationsMessages: Record<string, number>
	setUnreadConversationsMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>
	conversationsFirstLoadDone: boolean
	setConversationsFirstLoadDone: React.Dispatch<React.SetStateAction<boolean>>
}

export const Conversations = memo(
	({
		darkMode,
		isMobile,
		windowHeight,
		sizes,
		setConversations,
		lang,
		conversations,
		unreadConversationsMessages,
		setUnreadConversationsMessages,
		setConversationsFirstLoadDone,
		conversationsFirstLoadDone
	}: ConversationsProps) => {
		const conversationsTimestamp = useRef<number>(Date.now() + 3600000)
		const [loading, setLoading] = useState<boolean>(false)
		const [userId] = useDb("userId", 0)
		const navigate = useNavigate()
		const windowFocused = useRef<boolean>(true)
		const userIdRef = useRef<number>(userId)
		const [hoveringAdd, setHoveringAdd] = useState<boolean>(false)
		const conversationsRef = useRef<ChatConversation[]>(conversations)
		const initDone = useRef<boolean>(false)
		const location = useLocation()
		const [search, setSearch] = useState<string>("")

		const conversationsSorted = useMemo(() => {
			return sortAndFilterConversations(conversations, search, userId)
		}, [conversations, search, userId])

		const fetchConversations = useCallback(async (refresh: boolean = false) => {
			const cache = await db.get("chatConversations", "chats")
			const hasCache = cache && cache.conversations && Array.isArray(cache.conversations)

			if (hasCache) {
				setLoading(true)
				setConversations([])
			}

			const [conversationsErr, conversationsRes] = await safeAwait(fetchChatConversations(conversationsTimestamp.current, refresh))

			if (conversationsErr) {
				setLoading(false)

				console.error(conversationsErr)

				return
			}

			if (!refresh) {
				const promises: Promise<void>[] = []
				const semaphore = new Semaphore(32)

				for (const conversation of conversationsRes.conversations) {
					promises.push(
						new Promise<void>(async resolve => {
							await semaphore.acquire()

							const [conversationsUnreadErr, conversationsUnreadRes] = await safeAwait(
								chatConversationsUnread(conversation.uuid)
							)

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

				Promise.all(promises).catch(console.error)
			}

			setLoading(false)
			setConversations(conversationsRes.conversations)
			setConversationsFirstLoadDone(true)

			if (conversationsRes.cache) {
				fetchConversations(true)
			}
		}, [])

		const openNewConversationModal = useCallback(() => {
			eventListener.emit("openChatAddModal", {
				uuid: "",
				key: "",
				mode: "new",
				conversation: undefined
			})
		}, [])

		const onFocus = useCallback(() => {
			windowFocused.current = true

			safeAwait(fetchConversations(true))
		}, [])

		const onBlur = useCallback(() => {
			windowFocused.current = false
		}, [])

		const itemContent = useCallback(
			(index: number, convo: ChatConversation) => {
				return (
					<Conversation
						key={convo.uuid}
						index={index}
						conversation={convo}
						userId={userId}
						unreadConversationsMessages={unreadConversationsMessages}
					/>
				)
			},
			[userId, unreadConversationsMessages]
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
			if (conversationsSorted.length > 0) {
				db.set("chatConversations", conversationsSorted, "chats").catch(console.error)
			}
		}, [conversationsSorted])

		useEffect(() => {
			userIdRef.current = userId
			conversationsRef.current = conversations
		}, [userId, conversations])

		useEffect(() => {
			if (conversationsSorted.length > 0 && !validate(getCurrentParent(location.hash))) {
				navigate("#/chats/" + conversationsSorted[0].uuid)
			}
		}, [conversationsSorted, location.hash])

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
				} else if (event.type === "chatConversationsNew") {
					fetchConversations(true)
				} else if (event.type === "chatConversationDeleted") {
					setConversations(prev => prev.filter(c => c.uuid !== event.data.uuid))

					if (getCurrentParent(window.location.href) === event.data.uuid) {
						navigate("/#/chats")
					}
				} else if (event.type === "chatConversationParticipantLeft") {
					if (event.data.userId === userId) {
						setConversations(prev => prev.filter(c => c.uuid !== event.data.uuid))

						if (getCurrentParent(window.location.href) === event.data.uuid) {
							navigate("/#/chats")
						}
					} else {
						setConversations(prev =>
							prev.map(c =>
								c.uuid === event.data.uuid
									? { ...c, participants: c.participants.filter(p => p.userId !== event.data.userId) }
									: c
							)
						)
					}
				} else if (event.type === "chatMessageDelete") {
					if (conversationsRef.current.filter(c => c.lastMessageUUID === event.data.uuid).length > 0) {
						fetchConversations(true)
					}
				}
			})

			const updateChatConversationsWithDataListener = eventListener.on(
				"updateChatConversationsWithData",
				(convos: ChatConversation[]) => {
					setConversations(convos)
				}
			)

			const updateChatConversationsListener = eventListener.on("updateChatConversations", () => {
				fetchConversations(true)
			})

			const socketAuthedListener = eventListener.on("socketAuthed", () => {
				fetchConversations(true)
			})

			const chatConversationDeleteListener = eventListener.on("chatConversationDelete", (convo: ChatConversation) => {
				setConversations(prev => prev.filter(c => c.uuid !== convo.uuid))

				if (getCurrentParent(window.location.href) === convo.uuid) {
					navigate("/#/chats")
				}
			})

			const chatConversationLeaveListener = eventListener.on("chatConversationLeave", (convo: ChatConversation) => {
				setConversations(prev => prev.filter(c => c.uuid !== convo.uuid))

				if (getCurrentParent(window.location.href) === convo.uuid) {
					navigate("/#/chats")
				}
			})

			const chatConversationParticipantRemovedListener = eventListener.on(
				"chatConversationParticipantRemoved",
				({ conversation: convo, userId: user }: { conversation: ChatConversation; userId: number }) => {
					setConversations(prev =>
						prev.map(c => (c.uuid === convo.uuid ? { ...c, participants: c.participants.filter(p => p.userId !== user) } : c))
					)
				}
			)

			return () => {
				socketEventListener.remove()
				updateChatConversationsListener.remove()
				socketAuthedListener.remove()
				chatConversationDeleteListener.remove()
				chatConversationLeaveListener.remove()
				chatConversationParticipantRemovedListener.remove()
				updateChatConversationsWithDataListener.remove()
			}
		}, [userId])

		useEffect(() => {
			if (!initDone.current) {
				initDone.current = true

				fetchConversations()
			}
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
					height="50px"
					flexDirection="row"
					justifyContent="space-between"
					alignItems="center"
					paddingLeft="15px"
					paddingRight="15px"
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
						width="32px"
						height="32px"
						padding="4px"
						borderRadius="full"
						justifyContent="center"
						alignItems="center"
						onMouseEnter={() => setHoveringAdd(true)}
						onMouseLeave={() => setHoveringAdd(false)}
						onClick={() => openNewConversationModal()}
						cursor="pointer"
					>
						<IoIosAdd
							size={24}
							color={hoveringAdd ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
							cursor="pointer"
							style={{
								flexShrink: 0
							}}
						/>
					</Flex>
				</Flex>
				<Flex
					width={sizes.conversations + "px"}
					height="50px"
					flexDirection="row"
					justifyContent="space-between"
					alignItems="center"
					paddingLeft="15px"
					paddingRight="15px"
					borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
				>
					<Input
						backgroundColor={getColor(darkMode, "backgroundSecondary")}
						borderRadius="10px"
						height="30px"
						border="none"
						outline="none"
						shadow="none"
						marginTop="-12px"
						spellCheck={false}
						color={getColor(darkMode, "textPrimary")}
						placeholder={i18n(lang, "searchInput")}
						value={search}
						onChange={e => setSearch(e.target.value)}
						fontSize={14}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
						_hover={{
							shadow: "none",
							outline: "none"
						}}
						_active={{
							shadow: "none",
							outline: "none"
						}}
						_focus={{
							shadow: "none",
							outline: "none"
						}}
						_highlighted={{
							shadow: "none",
							outline: "none"
						}}
					/>
				</Flex>
				{conversationsFirstLoadDone && conversations.length === 0 ? (
					<Flex
						flexDirection="column"
						height={windowHeight - 50 - 50 - (isMobile ? 50 : 60) + "px"}
						width={sizes.conversations + "px"}
						overflow="hidden"
						alignItems="center"
						justifyContent="center"
						padding="15px"
						textAlign="center"
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							fontSize={16}
						>
							{i18n(lang, "chatConversationCreateSidebar")}
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "linkPrimary")}
							fontSize={14}
							cursor="pointer"
							_hover={{
								textDecoration: "underline"
							}}
							onClick={() => openNewConversationModal()}
						>
							{i18n(lang, "chatConversationCreateSidebarCreate")}
						</AppText>
					</Flex>
				) : conversationsSorted.length === 0 && search.length > 0 ? (
					<Flex
						flexDirection="column"
						height={windowHeight - 50 - 50 - (isMobile ? 50 : 60) + "px"}
						width={sizes.conversations + "px"}
						overflow="hidden"
						alignItems="center"
						justifyContent="center"
						padding="15px"
						textAlign="center"
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							fontSize={16}
						>
							{i18n(lang, "noConversationFound")}
						</AppText>
					</Flex>
				) : loading ? (
					<Flex
						flexDirection="column"
						height={windowHeight - 50 - 50 - (isMobile ? 50 : 60) + "px"}
						width={sizes.conversations + "px"}
						overflow="hidden"
					>
						{loadingConversations.map((_, index) => {
							return (
								<ConversationSkeleton
									key={index}
									index={index}
								/>
							)
						})}
					</Flex>
				) : (
					<Virtuoso
						data={conversationsSorted}
						height={windowHeight - 50 - 50 - (isMobile ? 50 : 60)}
						width={sizes.conversations}
						itemContent={itemContent}
						computeItemKey={(_, conversation) => conversation.uuid}
						defaultItemHeight={50}
						style={{
							overflowX: "hidden",
							overflowY: "auto",
							height: windowHeight - 50 - 50 - (isMobile ? 50 : 60) + "px",
							width: sizes.conversations + "px"
						}}
					/>
				)}
				<Me
					darkMode={darkMode}
					isMobile={isMobile}
					lang={lang}
				/>
			</Flex>
		)
	}
)

export default Conversations
