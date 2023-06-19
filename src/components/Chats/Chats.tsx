import { memo, useMemo, useState } from "react"
import Conversations from "./Conversations"
import ChatContainer from "./ChatContainer"
import { Flex } from "@chakra-ui/react"
import { ChatConversation } from "../../lib/api"
import useDb from "../../lib/hooks/useDb"
import NewConversationModal from "./NewConversationModal"
import ChatMemberList from "./ChatMemberList"
import AddUserConversationModal from "./AddUserToConversationModal"

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
	const [currentConversation, setCurrentConversation] = useState<ChatConversation | undefined>(undefined)
	const [userId] = useDb("userId", 0)

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

	const currentConversationMe = useMemo(() => {
		if (!currentConversation || (currentConversation.participants.length === 0 && userId === 0)) {
			return undefined
		}

		const filtered = currentConversation.participants.filter(participant => participant.userId === userId)

		if (filtered.length === 1) {
			return filtered[0]
		}
	}, [currentConversation])

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
					setCurrentConversation={setCurrentConversation}
					lang={lang}
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
				<ChatMemberList
					darkMode={darkMode}
					isMobile={isMobile}
					windowHeight={windowHeight}
					windowWidth={windowWidth}
					sidebarWidth={sidebarWidth}
					lang={lang}
					sizes={sizes}
					currentConversation={currentConversation}
					currentConversationMe={currentConversationMe}
					setCurrentConversation={setCurrentConversation}
				/>
			</Flex>
			<NewConversationModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
				setCurrentConversation={setCurrentConversation}
			/>
			<AddUserConversationModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		</Flex>
	)
})

export default Chats
