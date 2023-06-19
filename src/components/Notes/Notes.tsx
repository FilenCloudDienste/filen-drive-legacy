import { memo, useState, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useWindowWidth from "../../lib/hooks/useWindowWidth"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import eventListener from "../../lib/eventListener"
import { Virtuoso } from "react-virtuoso"
import { IoIosAdd } from "react-icons/io"

export interface NotesSizes {
	notes: number
	note: number
}

export const NotesSidebar = memo(({ sizes }: { sizes: NotesSizes }) => {
	const windowWidth = useWindowWidth()
	const isMobile = useIsMobile()
	const windowHeight = useWindowHeight()
	const lang = useLang()
	const darkMode = useDarkMode()
	const [hoveringAdd, setHoveringAdd] = useState<boolean>(false)

	return (
		<Flex
			width={sizes.notes + "px"}
			borderRight={"1px solid " + getColor(darkMode, "borderSecondary")}
			flexDirection="column"
			overflow="hidden"
			height={windowHeight + "px"}
		>
			<Flex
				width={sizes.notes + "px"}
				height="40px"
				flexDirection="row"
				justifyContent="space-between"
				alignItems="center"
				paddingLeft="15px"
				paddingRight="15px"
				paddingTop="10px"
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "textPrimary")}
					fontSize={18}
				>
					{i18n(lang, "notes")}
				</AppText>
				<Flex
					backgroundColor={hoveringAdd ? getColor(darkMode, "backgroundSecondary") : undefined}
					width="auto"
					height="auto"
					padding="4px"
					borderRadius="full"
					justifyContent="center"
					alignItems="center"
					onMouseEnter={() => setHoveringAdd(true)}
					onMouseLeave={() => setHoveringAdd(false)}
					onClick={() => eventListener.emit("openNewConversationModal")}
					cursor="pointer"
				>
					<IoIosAdd
						size={24}
						color={hoveringAdd ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
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

export interface NotesProps {
	sidebarWidth: number
}

export const Notes = memo(({ sidebarWidth }: NotesProps) => {
	const windowWidth = useWindowWidth()
	const isMobile = useIsMobile()
	const windowHeight = useWindowHeight()
	const lang = useLang()

	const sizes: NotesSizes = useMemo(() => {
		const notes = isMobile ? 125 : windowWidth > 1100 ? 275 : 175
		const note = windowWidth - sidebarWidth - notes

		return {
			notes,
			note
		}
	}, [windowWidth, sidebarWidth, isMobile])

	return (
		<Flex flexDirection="row">
			<Flex
				width={sizes.notes + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<NotesSidebar sizes={sizes} />
			</Flex>
			<Flex
				width={sizes.note + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				d
			</Flex>
		</Flex>
	)
})

export default Notes
