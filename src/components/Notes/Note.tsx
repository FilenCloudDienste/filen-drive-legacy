import { memo, useState, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote } from "../../lib/api"
import { getCurrentParent } from "../../lib/helpers"
import { useNavigate, useLocation } from "react-router-dom"
import { BsTextLeft, BsPin, BsFileRichtext, BsCodeSlash, BsMarkdown } from "react-icons/bs"
import eventListener from "../../lib/eventListener"
import { IoTrashOutline, IoArchiveOutline, IoHeart } from "react-icons/io5"

export const Note = memo(({ note }: { note: INote }) => {
	const isMobile = useIsMobile()
	const darkMode = useDarkMode()
	const location = useLocation()
	const navigate = useNavigate()
	const [hovering, setHovering] = useState<boolean>(false)
	const [preview, setPreview] = useState<string>(note.preview)

	const active = useMemo(() => {
		return getCurrentParent(location.hash) === note.uuid
	}, [note, location])

	return (
		<Flex
			flexDirection="row"
			paddingLeft="13px"
			paddingRight="15px"
			paddingBottom="10px"
			paddingTop="10px"
			gap="20px"
			marginBottom="3px"
			borderLeft={active ? "2px solid " + getColor(darkMode, "indigo") : "2px solid transparent"}
			backgroundColor={active || hovering ? getColor(darkMode, "backgroundSecondary") : undefined}
			cursor="pointer"
			onMouseEnter={() => setHovering(true)}
			onMouseLeave={() => setHovering(false)}
			onClick={() => {
				if (getCurrentParent(window.location.href) === note.uuid) {
					return
				}

				navigate("#/notes/" + note.uuid)
			}}
			onContextMenu={e => {
				e.preventDefault()

				if (getCurrentParent(window.location.href) !== note.uuid) {
					navigate("#/notes/" + note.uuid)
				}

				eventListener.emit("openNoteContextMenu", {
					note,
					event: e,
					position: {
						x: e.nativeEvent.clientX,
						y: e.nativeEvent.clientY
					}
				})
			}}
		>
			<Flex
				flexDirection="column"
				gap="10px"
			>
				<Flex>
					{note.trash ? (
						<IoTrashOutline
							size={20}
							color={getColor(darkMode, "red")}
							style={{
								flexShrink: 0
							}}
						/>
					) : note.archive ? (
						<IoArchiveOutline
							size={20}
							color={getColor(darkMode, "orange")}
							style={{
								flexShrink: 0
							}}
						/>
					) : (
						<>
							{note.type === "text" && (
								<BsTextLeft
									size={20}
									color={getColor(darkMode, "blue")}
									style={{
										flexShrink: 0
									}}
								/>
							)}
							{note.type === "rich" && (
								<BsFileRichtext
									size={20}
									color={getColor(darkMode, "cyan")}
									style={{
										flexShrink: 0
									}}
								/>
							)}
							{note.type === "code" && (
								<BsCodeSlash
									size={20}
									color={getColor(darkMode, "red")}
									style={{
										flexShrink: 0
									}}
								/>
							)}
							{note.type === "md" && (
								<BsMarkdown
									size={20}
									color={getColor(darkMode, "indigo")}
									style={{
										flexShrink: 0
									}}
								/>
							)}
						</>
					)}
				</Flex>
				{note.pinned && (
					<Flex>
						<BsPin
							size={20}
							color={getColor(darkMode, "textSecondary")}
							style={{
								flexShrink: 0
							}}
						/>
					</Flex>
				)}
			</Flex>
			<Flex
				flexDirection="column"
				gap="3px"
			>
				<Flex
					flexDirection="row"
					gap="10px"
					alignItems="center"
				>
					{note.favorite && (
						<IoHeart
							size={16}
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
						color={getColor(darkMode, "textPrimary")}
						fontSize={15}
					>
						{note.title}
					</AppText>
				</Flex>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "textSecondary")}
					fontSize={13}
				>
					{preview.length === 0 ? note.title : preview}
				</AppText>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "textSecondary")}
					fontSize={11}
				>
					{new Date(note.editedTimestamp).toLocaleString()}
				</AppText>
			</Flex>
		</Flex>
	)
})

export default Note
