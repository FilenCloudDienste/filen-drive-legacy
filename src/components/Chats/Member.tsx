import { memo, useState, useCallback } from "react"
import { getColor } from "../../styles/colors"
import { Flex, Avatar, AvatarBadge, Skeleton } from "@chakra-ui/react"
import { ChatConversation, ChatConversationParticipant, ChatConversationsOnline } from "../../lib/api"
import AppText from "../AppText"
import { getUserNameFromParticipant } from "./utils"
import { IoCloseOutline } from "react-icons/io5"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import striptags from "striptags"
import { randomStringUnsafe, getRandomArbitrary, generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { AiFillCrown } from "react-icons/ai"

const ONLINE_TIMEOUT = 900000

export type OnlineUsers = Record<string, ChatConversationsOnline>

export const MemberSkeleton = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()

	return (
		<Flex
			padding="10px"
			paddingBottom="0px"
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
					<Skeleton
						startColor={getColor(darkMode, "backgroundSecondary")}
						endColor={getColor(darkMode, "backgroundTertiary")}
						width="30px"
						height="30px"
						borderRadius="full"
					>
						<Avatar
							name="skeleton"
							width="30px"
							height="30px"
							borderRadius="full"
							border="none"
						/>
					</Skeleton>
					<Skeleton
						startColor={getColor(darkMode, "backgroundSecondary")}
						endColor={getColor(darkMode, "backgroundTertiary")}
						borderRadius="10px"
						marginLeft="10px"
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
							{randomStringUnsafe(getRandomArbitrary(8, 16))}
						</AppText>
					</Skeleton>
				</Flex>
			</Flex>
		</Flex>
	)
})

export interface MemberProps {
	darkMode: boolean
	isMobile: boolean
	user: ChatConversationParticipant
	onlineUsers: OnlineUsers
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
}

export const Member = memo(({ user, darkMode, onlineUsers, isMobile, currentConversation, currentConversationMe }: MemberProps) => {
	const [hovering, setHovering] = useState<boolean>(false)
	const [hoveringDelete, setHoveringDelete] = useState<boolean>(false)

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
				onClick={() => eventListener.emit("openUserProfileModal", user.userId)}
				onContextMenu={e => {
					e.preventDefault()

					eventListener.emit("openChatParticipantContextMenu", {
						participant: user,
						conversation: currentConversation,
						event: e,
						position: {
							x: e.nativeEvent.clientX,
							y: e.nativeEvent.clientY
						}
					})
				}}
			>
				<Flex
					alignItems="center"
					flexDirection="row"
				>
					<Avatar
						name={typeof user.avatar === "string" && user.avatar.indexOf("https://") !== -1 ? undefined : user.email}
						src={typeof user.avatar === "string" && user.avatar.indexOf("https://") !== -1 ? user.avatar : undefined}
						bg={generateAvatarColorCode(user.email, darkMode, user.avatar)}
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
										: "gray"
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
						{striptags(getUserNameFromParticipant(user))}
					</AppText>
					{user.userId === currentConversation.ownerId && (
						<AiFillCrown
							color={getColor(darkMode, "yellow")}
							size={16}
							style={{
								flexShrink: 0,
								marginLeft: "5px"
							}}
						/>
					)}
				</Flex>
				<Flex>
					{hovering &&
						currentConversation.ownerId === currentConversationMe.userId &&
						currentConversation.participants.length >= 1 &&
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
								onClick={e => {
									e.preventDefault()
									e.stopPropagation()

									eventListener.emit("openChatConversationRemoveParticipantModal", {
										conversation: currentConversation,
										userId: user.userId
									})
								}}
							/>
						)}
				</Flex>
			</Flex>
		</Flex>
	)
})

export default Member
