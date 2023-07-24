import { memo, useMemo, useState, useEffect } from "react"
import Conversations from "./Conversations"
import ChatContainer from "./Container"
import { Flex } from "@chakra-ui/react"
import { ChatConversation } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import MemberList from "./MemberList"
import { useLocation } from "react-router-dom"
import { validate } from "uuid"
import { getCurrentParent } from "../../lib/helpers"
import AddModal from "./AddModal"
import DeleteMessageModal from "./DeleteMessageModal"

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
	const location = useLocation()

	const sizes: ChatSizes = useMemo(() => {
		const conversations = isMobile ? 125 : windowWidth > 1100 ? 275 : 175
		const chatOptions = isMobile ? 0 : windowWidth > 1100 ? 250 : 150
		const chatContainer = windowWidth - sidebarWidth - conversations - chatOptions

		return {
			conversations,
			chatContainer,
			chatOptions
		}
	}, [windowWidth, sidebarWidth, isMobile])

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

	useEffect(() => {
		const uuid = getCurrentParent(location.hash)

		if (uuid && validate(uuid)) {
			setCurrentConversationUUID(uuid)
		}
	}, [location.hash])

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
					currentConversation={currentConversation}
					currentConversationMe={currentConversationMe}
				/>
			</Flex>
			<Flex
				width={sizes.chatContainer + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<ChatContainer
					darkMode={darkMode}
					isMobile={isMobile}
					windowHeight={windowHeight}
					lang={lang}
					sizes={sizes}
					currentConversation={currentConversation}
					currentConversationMe={currentConversationMe}
				/>
			</Flex>
			<Flex
				width={sizes.chatOptions + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<MemberList
					sizes={sizes}
					currentConversation={currentConversation}
					currentConversationMe={currentConversationMe}
				/>
			</Flex>
			<AddModal />
			<DeleteMessageModal />
		</Flex>
	)
})

export default Chats
