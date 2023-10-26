import { memo, useState, useCallback } from "react"
import { Flex, Avatar } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { ContactRequest, contactsRequestsOutDelete, contactsRequestsDeny, contactsRequestsAccept } from "../../lib/api"
import AppText from "../AppText"
import { IoCloseOutline } from "react-icons/io5"
import { AiOutlineCheck } from "react-icons/ai"
import striptags from "striptags"
import { safeAwait, generateAvatarColorCode } from "../../lib/helpers"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import eventListener from "../../lib/eventListener"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"

export const Request = memo(({ request, activeTab }: { request: ContactRequest; activeTab: string }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const [hovering, setHovering] = useState<boolean>(false)
	const lang = useLang()

	const del = useCallback(async () => {
		const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

		const [err] = await safeAwait(
			activeTab === "contacts/pending" ? contactsRequestsOutDelete(request.uuid) : contactsRequestsDeny(request.uuid)
		)

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		eventListener.emit("removeContactRequest", request.uuid)
	}, [request, activeTab, lang])

	const accept = useCallback(async () => {
		const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

		const [err] = await safeAwait(contactsRequestsAccept(request.uuid))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		eventListener.emit("removeContactRequest", request.uuid)
	}, [request, lang])

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
		>
			<Flex
				gap="15px"
				flexDirection="row"
			>
				<Flex>
					<Avatar
						name={typeof request.avatar === "string" && request.avatar.indexOf("https://") !== -1 ? undefined : request.email}
						src={typeof request.avatar === "string" && request.avatar.indexOf("https://") !== -1 ? request.avatar : undefined}
						bg={generateAvatarColorCode(request.email, darkMode, request.avatar)}
						width="35px"
						height="35px"
						borderRadius="full"
						border="none"
					/>
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
						{striptags(request.nickName.length > 0 ? request.nickName : request.email)}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
					>
						{striptags(request.email)}
					</AppText>
				</Flex>
			</Flex>
			<Flex
				flexDirection="row"
				gap="15px"
				alignItems="center"
			>
				{activeTab === "contacts/requests" && (
					<Flex
						backgroundColor={hovering ? getColor(darkMode, "green") : getColor(darkMode, "backgroundSecondary")}
						width="32px"
						height="32px"
						padding="4px"
						borderRadius="full"
						justifyContent="center"
						alignItems="center"
						cursor="pointer"
						onClick={() => accept()}
					>
						<AiOutlineCheck
							size={20}
							color={hovering ? "white" : getColor(darkMode, "textSecondary")}
							cursor="pointer"
							style={{
								flexShrink: 0
							}}
						/>
					</Flex>
				)}
				<Flex
					backgroundColor={hovering ? getColor(darkMode, "red") : getColor(darkMode, "backgroundSecondary")}
					width="32px"
					height="32px"
					padding="4px"
					borderRadius="full"
					justifyContent="center"
					alignItems="center"
					cursor="pointer"
					onClick={() => del()}
				>
					<IoCloseOutline
						size={20}
						color={hovering ? "white" : getColor(darkMode, "textSecondary")}
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

export default Request
