import { memo, useState, useCallback } from "react"
import { Flex, Avatar } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { contactsBlockedDelete, BlockedContact } from "../../lib/api"
import AppText from "../AppText"
import { IoCloseOutline } from "react-icons/io5"
import striptags from "striptags"
import { safeAwait } from "../../lib/helpers"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"

export const Blocked = memo(
	({ block, setBlocked }: { block: BlockedContact; setBlocked: React.Dispatch<React.SetStateAction<BlockedContact[]>> }) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const [hovering, setHovering] = useState<boolean>(false)
		const lang = useLang()

		const del = useCallback(async () => {
			const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

			const [err] = await safeAwait(contactsBlockedDelete(block.uuid))

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setBlocked(prev => prev.filter(b => b.uuid !== block.uuid))
		}, [block, lang])

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
							name={
								typeof block.avatar === "string" && block.avatar.indexOf("https://") !== -1
									? undefined
									: block.email.substring(0, 1)
							}
							src={typeof block.avatar === "string" && block.avatar.indexOf("https://") !== -1 ? block.avatar : undefined}
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
							{striptags(block.nickName.length > 0 ? block.nickName : block.email)}
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "textSecondary")}
							fontSize={13}
						>
							{striptags(block.email)}
						</AppText>
					</Flex>
				</Flex>
				<Flex
					flexDirection="row"
					gap="15px"
					alignItems="center"
				>
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
	}
)

export default Blocked
