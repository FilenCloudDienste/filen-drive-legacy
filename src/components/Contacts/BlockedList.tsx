import { memo, useCallback, useEffect, useState, useMemo } from "react"
import { Flex, Input } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import AppText from "../AppText"
import { Virtuoso } from "react-virtuoso"
import { safeAwait } from "../../lib/helpers"
import { contactsBlocked, BlockedContact } from "../../lib/api"
import { show as showToast } from "../Toast/Toast"
import Blocked from "./Blocked"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import { ContactSkeleton } from "./Contact"

export const BlockedList = memo(
	({
		containerWidth,
		blocked,
		setBlocked,
		search,
		setSearch,
		loadingContacts
	}: {
		containerWidth: number
		blocked: BlockedContact[]
		setBlocked: React.Dispatch<React.SetStateAction<BlockedContact[]>>
		search: string
		setSearch: React.Dispatch<React.SetStateAction<string>>
		loadingContacts: boolean
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const windowHeight = useWindowHeight()
		const [loading, setLoading] = useState<boolean>(false)
		const lang = useLang()

		const loadBlocked = useCallback(async (showLoader: boolean = true) => {
			setLoading(showLoader)

			const [err, res] = await safeAwait(contactsBlocked())

			setLoading(false)

			if (err) {
				console.error(err)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			setBlocked(res)
		}, [])

		const itemContent = useCallback((index: number, block: BlockedContact) => {
			return (
				<Blocked
					key={block.userId}
					block={block}
					setBlocked={setBlocked}
				/>
			)
		}, [])

		useEffect(() => {
			loadBlocked()
		}, [])

		return (
			<>
				<Flex
					flexDirection="row"
					gap="10px"
					paddingTop="20px"
				>
					<Input
						value={search}
						onChange={e => setSearch(e.target.value)}
						autoFocus={false}
						spellCheck={false}
						border="none"
						borderRadius="10px"
						width="100%"
						height="35px"
						backgroundColor={getColor(darkMode, "backgroundSecondary")}
						color={getColor(darkMode, "textPrimary")}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
						placeholder={i18n(lang, "searchInput")}
						paddingLeft="10px"
						paddingRight="10px"
						shadow="none"
						outline="none"
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
						fontSize={15}
					/>
				</Flex>
				<Flex
					flexDirection="row"
					gap="10px"
					marginTop="25px"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
						textTransform="uppercase"
					>
						{i18n(lang, "blockedUsers")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
						textTransform="uppercase"
					>
						&mdash;
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
						textTransform="uppercase"
					>
						{blocked.length}
					</AppText>
				</Flex>
				<Flex
					flexDirection="column"
					marginTop="15px"
					width={containerWidth + "px"}
					height={windowHeight - 190 + "px"}
				>
					{loadingContacts ? (
						<>
							{new Array(8).fill(1).map((_, index) => {
								return <ContactSkeleton key={index} />
							})}
						</>
					) : (
						<Virtuoso
							data={blocked}
							height={windowHeight - 190}
							width={containerWidth}
							itemContent={itemContent}
							computeItemKey={(_, item) => item.userId}
							defaultItemHeight={75}
							style={{
								overflowX: "hidden",
								overflowY: "auto",
								height: windowHeight - 190 + "px",
								width: containerWidth + "px"
							}}
						/>
					)}
				</Flex>
			</>
		)
	}
)

export default BlockedList
