import { memo, useState } from "react"
import { Flex, Avatar, AvatarBadge, Skeleton } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { Contact as IContact } from "../../lib/api"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import AppText from "../AppText"
import { IoEllipsisVertical } from "react-icons/io5"
import striptags from "striptags"
import eventListener from "../../lib/eventListener"

export const ContactSkeleton = memo(() => {
	const darkMode = useDarkMode()

	return (
		<Skeleton
			startColor={getColor(darkMode, "backgroundSecondary")}
			endColor={getColor(darkMode, "backgroundTertiary")}
			height="75px"
			width="100%"
			marginBottom="5px"
			borderRadius="10px"
		>
			&nbsp;
		</Skeleton>
	)
})

export const Contact = memo(({ contact }: { contact: IContact }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const [hovering, setHovering] = useState<boolean>(false)

	return (
		<Flex
			flexDirection="row"
			gap="25px"
			borderTop={!hovering ? "1px solid " + getColor(darkMode, "borderPrimary") : "1px solid transparent"}
			paddingTop="15px"
			paddingBottom="15px"
			paddingLeft="15px"
			paddingRight="15px"
			justifyContent="space-between"
			borderRadius={hovering ? "10px" : "0px"}
			onMouseEnter={() => setHovering(true)}
			onMouseLeave={() => setHovering(false)}
			backgroundColor={hovering ? getColor(darkMode, "backgroundSecondary") : undefined}
			onContextMenu={e => {
				e.preventDefault()

				eventListener.emit("openContactContextMenu", {
					contact,
					event: e,
					position: {
						x: e.nativeEvent.clientX,
						y: e.nativeEvent.clientY
					}
				})
			}}
		>
			<Flex
				gap="15px"
				flexDirection="row"
			>
				<Flex>
					<Avatar
						name={
							typeof contact.avatar === "string" && contact.avatar.indexOf("https://") !== -1
								? undefined
								: contact.email.substring(0, 1)
						}
						src={typeof contact.avatar === "string" && contact.avatar.indexOf("https://") !== -1 ? contact.avatar : undefined}
						width="35px"
						height="35px"
						borderRadius="full"
						border="none"
					>
						<AvatarBadge
							boxSize="12px"
							border="none"
							backgroundColor={contact.lastActive > Date.now() - ONLINE_TIMEOUT ? getColor(darkMode, "green") : "gray"}
						/>
					</Avatar>
				</Flex>
				<Flex
					flexDirection="column"
					gap="1px"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textPrimary")}
						fontSize={15}
					>
						{striptags(contact.nickName.length > 0 ? contact.nickName : contact.email)}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
					>
						{striptags(contact.email)}
					</AppText>
				</Flex>
			</Flex>
			<Flex
				flexDirection="row"
				gap="15px"
				alignItems="center"
			>
				<Flex
					backgroundColor={hovering ? getColor(darkMode, "backgroundTertiary") : getColor(darkMode, "backgroundSecondary")}
					width="32px"
					height="32px"
					padding="4px"
					borderRadius="full"
					justifyContent="center"
					alignItems="center"
					cursor="pointer"
					onClick={e => {
						e.preventDefault()

						eventListener.emit("openContactContextMenu", {
							contact,
							event: e,
							position: {
								x: e.nativeEvent.clientX,
								y: e.nativeEvent.clientY
							}
						})
					}}
					onContextMenu={e => {
						e.preventDefault()

						eventListener.emit("openContactContextMenu", {
							contact,
							event: e,
							position: {
								x: e.nativeEvent.clientX,
								y: e.nativeEvent.clientY
							}
						})
					}}
				>
					<IoEllipsisVertical
						size={20}
						color={hovering ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
						cursor="pointer"
						style={{
							flexShrink: 0
						}}
					/>
				</Flex>
			</Flex>
		</Flex>
	)
})

export default Contact
