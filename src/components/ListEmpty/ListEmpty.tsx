import { memo, useMemo } from "react"
import { useLocation } from "react-router-dom"
import SelectFromComputer from "../SelectFromComputer"
import { Flex } from "@chakra-ui/react"
import { IoFolder, IoTrash } from "react-icons/io5"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { RiFolderSharedFill, RiLink, RiFolderReceivedFill } from "react-icons/ri"
import { i18n } from "../../i18n"
import { AiOutlineSearch } from "react-icons/ai"
import { AiOutlineHeart } from "react-icons/ai"
import { HiOutlineClock } from "react-icons/hi"

const Parent = memo(({ children }: { children: React.ReactNode }) => {
	return (
		<Flex
			width="100%"
			height="100%"
			flexDirection="column"
			justifyContent="center"
			alignItems="center"
			className="no-items-uploaded"
			paddingLeft="25px"
			paddingRight="25px"
		>
			{children}
		</Flex>
	)
})

const ListEmpty = memo(
	({
		darkMode,
		isMobile,
		lang,
		handleContextMenu,
		searchTerm
	}: {
		darkMode: boolean
		isMobile: boolean
		lang: string
		handleContextMenu: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => any
		searchTerm: string
	}) => {
		const location = useLocation()

		const sizes = useMemo(() => {
			return {
				icon: isMobile ? 90 : 128,
				primary: isMobile ? 20 : 22,
				secondary: isMobile ? 12 : 14
			}
		}, [isMobile])

		if (searchTerm.length > 0) {
			return (
				<Parent>
					<AiOutlineSearch
						size={sizes.icon}
						color={getColor(darkMode, "textSecondary")}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						fontSize={isMobile ? 15 : 17}
						color={getColor(darkMode, "textSecondary")}
						marginTop="10px"
						textAlign="center"
						wordBreak="break-word"
					>
						{i18n(lang, "searchNothingFound", true, ["__TERM__"], [searchTerm])}
					</AppText>
				</Parent>
			)
		}

		if (location.hash.indexOf("shared-in") !== -1) {
			return (
				<Parent>
					<RiFolderReceivedFill
						size={sizes.icon}
						color={getColor(darkMode, "textSecondary")}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.primary}
						color={getColor(darkMode, "textPrimary")}
						marginTop="10px"
					>
						{i18n(lang, "listEmpty_1")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.secondary}
						color={getColor(darkMode, "textSecondary")}
					>
						{i18n(lang, "listEmpty_2")}
					</AppText>
				</Parent>
			)
		}

		if (location.hash.indexOf("shared-out") !== -1) {
			return (
				<Parent>
					<RiFolderSharedFill
						size={sizes.icon}
						color={getColor(darkMode, "textSecondary")}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.primary}
						color={getColor(darkMode, "textPrimary")}
						marginTop="10px"
					>
						{i18n(lang, "listEmpty_3")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.secondary}
						color={getColor(darkMode, "textSecondary")}
					>
						{i18n(lang, "listEmpty_4")}
					</AppText>
				</Parent>
			)
		}

		if (location.hash.indexOf("links") !== -1) {
			return (
				<Parent>
					<RiLink
						size={sizes.icon}
						color={getColor(darkMode, "textSecondary")}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						wordBreak="break-word"
						fontSize={sizes.primary}
						color={getColor(darkMode, "textPrimary")}
						marginTop="10px"
					>
						{i18n(lang, "listEmpty_5")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						wordBreak="break-word"
						textAlign="center"
						fontSize={sizes.secondary}
						color={getColor(darkMode, "textSecondary")}
					>
						{i18n(lang, "listEmpty_6")}
					</AppText>
				</Parent>
			)
		}

		if (location.hash.indexOf("favorites") !== -1) {
			return (
				<Parent>
					<AiOutlineHeart
						size={sizes.icon}
						color={getColor(darkMode, "textSecondary")}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.primary}
						color={getColor(darkMode, "textPrimary")}
						marginTop="10px"
					>
						{i18n(lang, "listEmpty_7")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.secondary}
						color={getColor(darkMode, "textSecondary")}
					>
						{i18n(lang, "listEmpty_8")}
					</AppText>
				</Parent>
			)
		}

		if (location.hash.indexOf("recent") !== -1) {
			return (
				<Parent>
					<HiOutlineClock
						size={sizes.icon}
						color={getColor(darkMode, "textSecondary")}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.primary}
						color={getColor(darkMode, "textPrimary")}
						marginTop="10px"
					>
						{i18n(lang, "listEmpty_9")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.secondary}
						color={getColor(darkMode, "textSecondary")}
					>
						{i18n(lang, "listEmpty_10")}
					</AppText>
				</Parent>
			)
		}

		if (location.hash.indexOf("trash") !== -1) {
			return (
				<Parent>
					<IoTrash
						size={sizes.icon}
						color={getColor(darkMode, "textSecondary")}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.primary}
						color={getColor(darkMode, "textPrimary")}
						marginTop="10px"
					>
						{i18n(lang, "listEmpty_11")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						textAlign="center"
						wordBreak="break-word"
						fontSize={sizes.secondary}
						color={getColor(darkMode, "textSecondary")}
					>
						{i18n(lang, "listEmpty_12")}
					</AppText>
				</Parent>
			)
		}

		return (
			<Flex
				width="100%"
				height="100%"
				flexDirection="column"
				justifyContent="center"
				alignItems="center"
				className="no-items-uploaded open-main-context-menu"
				onContextMenu={handleContextMenu}
				paddingLeft="25px"
				paddingRight="25px"
			>
				<IoFolder
					size={sizes.icon}
					color={getColor(darkMode, "textSecondary")}
				/>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					textAlign="center"
					wordBreak="break-word"
					fontSize={sizes.primary}
					color={getColor(darkMode, "textPrimary")}
					marginTop="10px"
				>
					{i18n(lang, "listEmpty_13")}
				</AppText>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					textAlign="center"
					wordBreak="break-word"
					fontSize={sizes.secondary}
					color={getColor(darkMode, "textSecondary")}
				>
					{i18n(lang, "listEmpty_14")}
				</AppText>
				<Flex marginTop="15px">
					<SelectFromComputer
						darkMode={darkMode}
						isMobile={isMobile}
						lang={lang}
						mode="uploadButton"
					/>
				</Flex>
			</Flex>
		)
	}
)

export default ListEmpty
