import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { ChatSizes } from "./Chats"
import { getColor } from "../../styles/colors"
import { Flex } from "@chakra-ui/react"
import { ChatConversation, ChatConversationParticipant, chatConversationsOnline, ChatConversationsOnline } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import AppText from "../AppText"
import eventListener from "../../lib/eventListener"
import { Virtuoso } from "react-virtuoso"
import { IoIosAdd } from "react-icons/io"
import { i18n } from "../../i18n"
import { decryptChatMessageKey } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import Member, { MemberSkeleton } from "./Member"
import useLang from "../../lib/hooks/useLang"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import useWindowFocus from "use-window-focus"
import throttle from "lodash/throttle"

const loadingMembers = new Array(5).fill(1).map(() => ({
	userId: 0,
	email: "",
	avatar: null,
	nickName: "",
	metadata: "",
	permissionsAdd: false,
	addedTimestamp: 0
})) as ChatConversationParticipant[]

export type OnlineUsers = Record<string, ChatConversationsOnline>

export interface MemberListProps {
	sizes: ChatSizes
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
}

export const MemberList = memo(({ sizes, currentConversation, currentConversationMe }: MemberListProps) => {
	const windowHeight = useWindowHeight()
	const lang = useLang()
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUsers>>({})
	const [hoveringAdd, setHoveringAdd] = useState<boolean>(false)
	const lastUserCountRef = useRef<number>(currentConversation?.participants.length || 0)
	const isFocused = useWindowFocus()
	const convoRef = useRef<ChatConversation | undefined>(currentConversation)

	const usersSorted = useMemo(() => {
		if (
			!currentConversation ||
			!onlineUsers ||
			!onlineUsers[currentConversation.uuid] ||
			Object.keys(onlineUsers[currentConversation.uuid]).length === 0
		) {
			return []
		}

		return currentConversation.participants.sort((a, b) => {
			const isOnlineA =
				onlineUsers[currentConversation.uuid] &&
				onlineUsers[currentConversation.uuid][a.userId] &&
				onlineUsers[currentConversation.uuid][a.userId].appearOffline
					? -1
					: onlineUsers[currentConversation.uuid][a.userId] &&
					  typeof onlineUsers[currentConversation.uuid][a.userId].lastActive === "number" &&
					  onlineUsers[currentConversation.uuid][a.userId].lastActive > 0 &&
					  onlineUsers[currentConversation.uuid][a.userId].lastActive > Date.now() - ONLINE_TIMEOUT
					? 1
					: 0
			const isOnlineB =
				onlineUsers[currentConversation.uuid] &&
				onlineUsers[currentConversation.uuid][b.userId] &&
				onlineUsers[currentConversation.uuid][b.userId].appearOffline
					? -1
					: onlineUsers[currentConversation.uuid][b.userId] &&
					  typeof onlineUsers[currentConversation.uuid][b.userId].lastActive === "number" &&
					  onlineUsers[currentConversation.uuid][b.userId].lastActive > 0 &&
					  onlineUsers[currentConversation.uuid][b.userId].lastActive > Date.now() - ONLINE_TIMEOUT
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
	}, [currentConversation, (onlineUsers || {})[currentConversation?.uuid || ""]])

	const updateOnlineUsers = useCallback(
		throttle(async (convo: ChatConversation | undefined) => {
			if (!convo) {
				return
			}

			const [err, res] = await safeAwait(chatConversationsOnline(convo.uuid))

			if (err) {
				console.error(err)

				return
			}

			const online: Record<string, ChatConversationsOnline> = {}

			for (const user of res) {
				online[user.userId] = user
			}

			setOnlineUsers(prev => ({
				...prev,
				[convo.uuid]: online
			}))
		}, 1000),
		[]
	)

	const addUser = useCallback(async () => {
		if (!currentConversation || !currentConversationMe) {
			return
		}

		const privateKey = await db.get("privateKey")
		const key = await decryptChatMessageKey(currentConversationMe.metadata, privateKey)

		eventListener.emit("openChatAddModal", {
			uuid: currentConversation.uuid,
			key,
			mode: "add",
			conversation: currentConversation
		})
	}, [currentConversation, currentConversationMe])

	const itemContent = useCallback(
		(_: number, participant: ChatConversationParticipant) => {
			return (
				<Member
					key={participant.userId}
					isMobile={isMobile}
					darkMode={darkMode}
					onlineUsers={(onlineUsers || {})[currentConversation?.uuid || ""]}
					user={participant}
					currentConversation={currentConversation}
					currentConversationMe={currentConversationMe}
				/>
			)
		},
		[darkMode, isMobile, onlineUsers, currentConversation, currentConversationMe]
	)

	useEffect(() => {
		if (
			currentConversation &&
			currentConversation.participants.length > 0 &&
			currentConversation.participants.length !== lastUserCountRef.current
		) {
			lastUserCountRef.current = currentConversation.participants.length

			updateOnlineUsers(currentConversation)
		}
	}, [currentConversation])

	useEffect(() => {
		if (isFocused && currentConversation) {
			updateOnlineUsers(currentConversation)
		}
	}, [isFocused, currentConversation])

	useEffect(() => {
		convoRef.current = currentConversation

		if (currentConversation) {
			updateOnlineUsers(currentConversation)
		}
	}, [currentConversation?.uuid])

	useEffect(() => {
		const updateOnlineUsersInterval = setInterval(() => {
			updateOnlineUsers(convoRef.current)
		}, 15000)

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			updateOnlineUsers(convoRef.current)
		})

		const updateChatOnlineUsersListener = eventListener.on("updateChatOnlineUsers", () => {
			updateOnlineUsers(convoRef.current)
		})

		const chatSettingsChangedListener = eventListener.on(
			"chatSettingsChanged",
			async ({ appearOffline }: { appearOffline: boolean }) => {
				if (currentConversation) {
					const userId = await db.get("userId")

					setOnlineUsers(prev =>
						prev
							? {
									...prev,
									[currentConversation.uuid]: {
										...prev[currentConversation.uuid],
										[userId]: {
											...prev[currentConversation.uuid][userId],
											appearOffline
										}
									}
							  }
							: prev
					)
				}
			}
		)

		return () => {
			clearInterval(updateOnlineUsersInterval)

			socketAuthedListener.remove()
			updateChatOnlineUsersListener.remove()
			chatSettingsChangedListener.remove()
		}
	}, [currentConversation])

	if (isMobile) {
		return null
	}

	return (
		<Flex
			height={windowHeight + "px"}
			width={sizes.chatOptions + "px"}
			borderLeft={"1px solid " + getColor(darkMode, "borderSecondary")}
			flexDirection="column"
		>
			<Flex
				width={sizes.chatOptions + "px"}
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
					{i18n(lang, "chatParticipants")}
				</AppText>
				{currentConversationMe?.permissionsAdd && (
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
						onClick={() => addUser()}
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
				)}
			</Flex>
			{!currentConversation || !currentConversationMe ? (
				<Flex
					flexDirection="column"
					height={windowHeight - 50 + "px"}
					width={sizes.chatOptions + "px"}
					overflow="hidden"
				>
					{loadingMembers.map((_, index) => {
						return <MemberSkeleton key={index} />
					})}
				</Flex>
			) : (
				<Virtuoso
					key={"chat-member-list-" + currentConversation.uuid}
					data={usersSorted}
					height={windowHeight - 50}
					width={sizes.chatOptions}
					itemContent={itemContent}
					computeItemKey={(_, participant) => participant.userId}
					defaultItemHeight={56}
					style={{
						overflowX: "hidden",
						overflowY: "auto",
						height: windowHeight - 50 + "px",
						width: sizes.chatOptions + "px"
					}}
				/>
			)}
		</Flex>
	)
})

export default MemberList
