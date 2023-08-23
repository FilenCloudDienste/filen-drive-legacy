import { memo, useMemo, useState, useEffect, useRef, useCallback } from "react"
import Conversations from "./Conversations"
import ChatContainer from "./Container"
import { Flex, Button } from "@chakra-ui/react"
import { ChatConversation } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import MemberList from "./MemberList"
import { useLocation } from "react-router-dom"
import { validate } from "uuid"
import { getCurrentParent } from "../../lib/helpers"
import AddModal from "./AddModal"
import DeleteMessageModal from "./DeleteMessageModal"
import PreviewModal from "./PreviewModal"
import ContextMenus from "./ContextMenus"
import data from "@emoji-mart/data"
import { init } from "emoji-mart"
import { customEmojis } from "./customEmojis"
import DeleteConversationModal from "./DeleteConversationModal"
import LeaveConversationModal from "./LeaveConversationModal"
import RemoveParticipantModal from "./RemoveParticipantModal"
import SettingsModal from "./SettingsModal"
import { IoChatbubblesSharp } from "react-icons/io5"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import eventListener from "../../lib/eventListener"
import EditConversationNameModal from "./EditConversationNameModal"

export interface ChatsProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	sidebarWidth: number
	lang: string
}

export interface ChatSizes {
	conversations: number
	chatContainer: number
	chatOptions: number
}

const Chats = memo(({ darkMode, isMobile, windowHeight, windowWidth, sidebarWidth, lang }: ChatsProps) => {
	const [currentConversationUUID, setCurrentConversationUUID] = useState<string>("")
	const [userId] = useDb("userId", 0)
	const [conversations, setConversations] = useState<ChatConversation[]>([])
	const [conversationsFirstLoadDone, setConversationsFirstLoadDone] = useState<boolean>(false)
	const location = useLocation()
	const [contextMenuOpen, setContextMenuOpen] = useState<string>("")
	const [emojiInitDone, setEmojiInitDone] = useState<boolean>(false)
	const didInitEmojis = useRef<boolean>(false)
	const [unreadConversationsMessages, setUnreadConversationsMessages] = useState<Record<string, number>>({})

	const sizes: ChatSizes = useMemo(() => {
		const convos = isMobile ? 125 : windowWidth > 1100 ? 275 : 175
		const chatOptions = conversations.length === 0 && conversationsFirstLoadDone ? 0 : isMobile ? 0 : windowWidth > 1100 ? 250 : 150
		const chatContainer = windowWidth - sidebarWidth - convos - chatOptions

		return {
			conversations: convos,
			chatContainer,
			chatOptions
		}
	}, [windowWidth, sidebarWidth, isMobile, conversationsFirstLoadDone, conversations])

	const currentConversation = useMemo(() => {
		const conversation = conversations.filter(convo => convo.uuid === currentConversationUUID)

		if (conversation.length === 0) {
			return undefined
		}

		return conversation[0]
	}, [conversations, currentConversationUUID])

	const currentConversationMe = useMemo(() => {
		if (!currentConversation || (currentConversation.participants.length === 0 && userId === 0)) {
			return undefined
		}

		const filtered = currentConversation.participants.filter(participant => participant.userId === userId)

		if (filtered.length === 1) {
			return filtered[0]
		}
	}, [currentConversation])

	const openNewConversationModal = useCallback(() => {
		eventListener.emit("openChatAddModal", {
			uuid: "",
			key: "",
			mode: "new",
			conversation: undefined
		})
	}, [])

	useEffect(() => {
		if (!didInitEmojis.current) {
			didInitEmojis.current = true

			init({
				data,
				custom: [
					{
						emojis: customEmojis
					}
				]
			})
				.then(() => {
					setEmojiInitDone(true)
				})
				.catch(console.error)
		}
	}, [])

	useEffect(() => {
		const uuid = getCurrentParent(location.hash)

		if (uuid && validate(uuid)) {
			setCurrentConversationUUID(uuid)
		}
	}, [location.hash])

	if (!emojiInitDone) {
		return null
	}

	return (
		<Flex flexDirection="row">
			<Flex
				width={sizes.conversations + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<Conversations
					darkMode={darkMode}
					isMobile={isMobile}
					windowHeight={windowHeight}
					sizes={sizes}
					conversations={conversations}
					setConversations={setConversations}
					lang={lang}
					unreadConversationsMessages={unreadConversationsMessages}
					setUnreadConversationsMessages={setUnreadConversationsMessages}
					conversationsFirstLoadDone={conversationsFirstLoadDone}
					setConversationsFirstLoadDone={setConversationsFirstLoadDone}
				/>
			</Flex>
			<Flex
				width={sizes.chatContainer + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				{conversations.length === 0 && conversationsFirstLoadDone ? (
					<Flex
						width="100%"
						height="100%"
						justifyContent="center"
						alignItems="center"
						flexDirection="column"
						padding="15px"
						textAlign="center"
					>
						<IoChatbubblesSharp
							color={getColor(darkMode, "textSecondary")}
							size={isMobile ? 70 : 100}
							style={{
								flexShrink: 0
							}}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textPrimary")}
							fontSize={18}
							marginTop="25px"
						>
							{i18n(lang, "chatConversationCreateSidebar")}
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							fontSize={14}
							marginTop="15px"
						>
							{i18n(lang, "chatInfoSubtitle1")}
						</AppText>
						<Button
							onClick={() => openNewConversationModal()}
							marginTop="25px"
							borderRadius="10px"
							backgroundColor={darkMode ? "white" : getColor(darkMode, "backgroundSecondary")}
							color="black"
							autoFocus={false}
							fontWeight="bold"
							border="1px solid transparent"
							_hover={{
								backgroundColor: "transparent",
								border: "1px solid " + (darkMode ? "white" : "black"),
								color: darkMode ? "white" : "black"
							}}
							_active={{
								backgroundColor: "transparent",
								border: "1px solid " + (darkMode ? "white" : "black"),
								color: darkMode ? "white" : "black"
							}}
							_focus={{
								backgroundColor: "transparent",
								border: "1px solid " + (darkMode ? "white" : "black"),
								color: darkMode ? "white" : "black"
							}}
						>
							{i18n(lang, "chatConversationCreateSidebarCreate")}
						</Button>
					</Flex>
				) : (
					<ChatContainer
						darkMode={darkMode}
						isMobile={isMobile}
						windowHeight={windowHeight}
						lang={lang}
						sizes={sizes}
						currentConversation={currentConversation}
						currentConversationMe={currentConversationMe}
						contextMenuOpen={contextMenuOpen}
						emojiInitDone={emojiInitDone}
						unreadConversationsMessages={unreadConversationsMessages}
						setUnreadConversationsMessages={setUnreadConversationsMessages}
					/>
				)}
			</Flex>
			<Flex
				width={sizes.chatOptions + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				{conversations.length > 0 && conversationsFirstLoadDone && (
					<MemberList
						sizes={sizes}
						currentConversation={currentConversation}
						currentConversationMe={currentConversationMe}
					/>
				)}
			</Flex>
			<AddModal />
			<DeleteMessageModal />
			<PreviewModal />
			<ContextMenus setContextMenuOpen={setContextMenuOpen} />
			<DeleteConversationModal />
			<LeaveConversationModal />
			<RemoveParticipantModal />
			<SettingsModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
			<EditConversationNameModal />
		</Flex>
	)
})

export default Chats
