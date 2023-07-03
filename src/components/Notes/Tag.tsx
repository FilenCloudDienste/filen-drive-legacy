import { memo, useState, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import { NoteTag } from "../../lib/api"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import useIsMobile from "../../lib/hooks/useIsMobile"

export const NoteSidebarTag = memo(({ tag }: { tag: NoteTag }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()

	return (
		<Flex
			borderRadius="5px"
			backgroundColor={getColor(darkMode, "backgroundTertiary")}
			color={getColor(darkMode, "textSecondary")}
			paddingLeft="7px"
			paddingRight="7px"
			paddingTop="3px"
			paddingBottom="3px"
			justifyContent="center"
			alignItems="center"
			cursor="pointer"
			flexDirection="row"
			gap="5px"
		>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				noOfLines={1}
				wordBreak="break-all"
				color={getColor(darkMode, "purple")}
				fontSize={14}
			>
				#
			</AppText>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				noOfLines={1}
				wordBreak="break-all"
				color={getColor(darkMode, "textSecondary")}
				fontSize={14}
			>
				{tag.name}
			</AppText>
		</Flex>
	)
})

export const Tag = memo(
	({
		tag,
		all,
		add,
		index,
		activeTag,
		setActiveTag
	}: {
		tag?: NoteTag
		all?: boolean
		add?: boolean
		index: number
		activeTag: string
		setActiveTag: React.Dispatch<React.SetStateAction<string>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const [hovering, setHovering] = useState<boolean>(false)

		const active = useMemo(() => {
			return hovering || (activeTag.length === 0 && typeof all === "boolean" && all === true) || activeTag === tag?.uuid
		}, [hovering, activeTag, tag, all, add])

		return (
			<Flex
				borderRadius="5px"
				backgroundColor={active ? getColor(darkMode, "backgroundTertiary") : getColor(darkMode, "backgroundSecondary")}
				color={active ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
				paddingLeft="7px"
				paddingRight="7px"
				paddingTop="3px"
				paddingBottom="3px"
				justifyContent="center"
				alignItems="center"
				flexDirection="row"
				onMouseEnter={() => setHovering(true)}
				onMouseLeave={() => setHovering(false)}
				cursor="pointer"
				gap="5px"
				onClick={() => {
					if (typeof add === "boolean" && add === true) {
						eventListener.emit("openCreateNoteTagModal")

						return
					}

					if (typeof all === "boolean" && all === true) {
						setActiveTag("")

						return
					}

					if (tag) {
						setActiveTag(tag.uuid)
					}
				}}
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "textSecondary")}
					fontSize={14}
				>
					{typeof all === "boolean" && all === true ? (
						<>All</>
					) : typeof add === "boolean" && add === true ? (
						<>+</>
					) : typeof tag !== "undefined" ? (
						<>{tag?.name}</>
					) : null}
				</AppText>
			</Flex>
		)
	}
)

export default Tag
