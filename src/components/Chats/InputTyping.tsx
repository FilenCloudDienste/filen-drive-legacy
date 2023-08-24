import { memo, useState, useRef, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { i18n } from "../../i18n"
import { ChatConversationParticipant } from "../../lib/api"
import { getCurrentParent } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import AppText from "../AppText"
import { IoEllipsisHorizontalOutline } from "react-icons/io5"
import { useLocation } from "react-router-dom"

export interface InputTypingProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
}

export const TYPING_TIMEOUT = 2000
export const TYPING_TIMEOUT_LAG = 30000

const InputTyping = memo(({ darkMode, isMobile, lang }: InputTypingProps) => {
	const [usersTyping, setUsersTyping] = useState<ChatConversationParticipant[]>([])
	const usersTypingTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
	const location = useLocation()

	useEffect(() => {
		setUsersTyping([])

		for (const key in usersTypingTimeout.current) {
			clearTimeout(usersTypingTimeout.current[key])
		}
	}, [location.hash])

	useEffect(() => {
		const chatTypingListener = eventListener.on("socketEvent", (event: SocketEvent) => {
			if (event.type === "chatTyping" && getCurrentParent(window.location.href) === event.data.conversation) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				if (event.data.type === "down") {
					setUsersTyping(prev =>
						[
							...prev.filter(user => user.userId !== event.data.senderId),
							{
								userId: event.data.senderId,
								email: event.data.senderEmail,
								avatar: event.data.senderAvatar,
								nickName: event.data.senderNickName,
								metadata: "",
								permissionsAdd: false,
								addedTimestamp: 0
							}
						].sort((a, b) => a.email.localeCompare(b.email))
					)

					usersTypingTimeout.current[event.data.senderId] = setTimeout(() => {
						setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
					}, TYPING_TIMEOUT_LAG)
				} else {
					setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
				}
			}

			if (event.type === "chatMessageNew" && getCurrentParent(window.location.href) === event.data.conversation) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
			}
		})

		return () => {
			setUsersTyping([])

			for (const key in usersTypingTimeout.current) {
				clearTimeout(usersTypingTimeout.current[key])
			}

			chatTypingListener.remove()
		}
	}, [])

	return (
		<Flex
			key={"typing-" + location.hash}
			flexDirection="row"
			overflow="hidden"
			marginTop="-10px"
			height="20px"
		>
			<Flex
				position="absolute"
				marginTop="-8px"
				alignItems="center"
			>
				{usersTyping.length === 0 ? (
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color="transparent"
						fontSize={12}
						wordBreak="break-word"
						marginLeft="3px"
					>
						&nsbp;
					</AppText>
				) : (
					<>
						<IoEllipsisHorizontalOutline
							color={getColor(darkMode, "textPrimary")}
							fontSize={20}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textPrimary")}
							fontSize={12}
							wordBreak="break-word"
							fontWeight="bold"
							marginLeft="5px"
						>
							{usersTyping.map(user => user.email).join(", ")}
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							fontSize={12}
							wordBreak="break-word"
							marginLeft="3px"
						>
							{" " + i18n(lang, "chatIsTyping").toLowerCase() + "..."}
						</AppText>
					</>
				)}
			</Flex>
		</Flex>
	)
})

export default InputTyping
