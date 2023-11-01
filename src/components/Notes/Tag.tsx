import { memo, useState, useMemo } from "react"
import { Flex, Tooltip } from "@chakra-ui/react"
import { NoteTag } from "../../lib/api"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { IoIosAdd } from "react-icons/io"
import { IoHeart } from "react-icons/io5"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"

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
		favorites,
		pinned,
		add,
		index,
		activeTag,
		setActiveTag
	}: {
		tag?: NoteTag
		all?: boolean
		add?: boolean
		favorites?: boolean
		pinned?: boolean
		index: number
		activeTag: string
		setActiveTag: React.Dispatch<React.SetStateAction<string>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const [hovering, setHovering] = useState<boolean>(false)
		const [hoveringAdd, setHoveringAdd] = useState<boolean>(false)
		const lang = useLang()

		const active = useMemo(() => {
			return (
				hovering ||
				(activeTag.length === 0 && all) ||
				activeTag === tag?.uuid ||
				(favorites && activeTag === "favorites") ||
				(pinned && activeTag === "pinned")
			)
		}, [hovering, activeTag, tag, all, add, favorites, pinned])

		if (typeof add === "boolean" && add === true) {
			return (
				<Tooltip
					label={i18n(lang, "notesTagsCreate")}
					placement="right"
					borderRadius="5px"
					backgroundColor={getColor(darkMode, "backgroundTertiary")}
					boxShadow="md"
					color={getColor(darkMode, "textSecondary")}
					hasArrow={true}
					openDelay={300}
				>
					<Flex
						backgroundColor={hoveringAdd ? getColor(darkMode, "backgroundTertiary") : getColor(darkMode, "backgroundSecondary")}
						width="28px"
						height="28px"
						padding="4px"
						borderRadius="5px"
						justifyContent="center"
						alignItems="center"
						onMouseEnter={() => setHoveringAdd(true)}
						onMouseLeave={() => setHoveringAdd(false)}
						onClick={() => eventListener.emit("openCreateNoteTagModal")}
						cursor="pointer"
					>
						<IoIosAdd
							size={22}
							color={getColor(darkMode, "purple")}
							cursor="pointer"
							style={{
								flexShrink: 0
							}}
						/>
					</Flex>
				</Tooltip>
			)
		}

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
				gap="3px"
				onContextMenu={e => {
					if (!tag) {
						return
					}

					e.preventDefault()

					eventListener.emit("openNoteTagContextMenu", {
						tag,
						event: e,
						position: {
							x: e.nativeEvent.clientX,
							y: e.nativeEvent.clientY
						}
					})
				}}
				onClick={() => {
					if (all) {
						setActiveTag("")

						return
					}

					if (favorites) {
						setActiveTag("favorites")

						return
					}

					if (pinned) {
						setActiveTag("pinned")

						return
					}

					if (tag) {
						setActiveTag(tag.uuid)
					}
				}}
			>
				{tag && tag.favorite && (
					<IoHeart
						fontSize={13}
						color={getColor(darkMode, "textPrimary")}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "textSecondary")}
					fontSize={14}
				>
					{favorites
						? i18n(lang, "favorites")
						: pinned
						? i18n(lang, "notesPinned")
						: all
						? i18n(lang, "notesAll")
						: tag
						? tag?.name
						: null}
				</AppText>
			</Flex>
		)
	}
)

export default Tag
