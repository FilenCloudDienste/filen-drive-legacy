import { memo, useState, useMemo, useEffect } from "react"
import { Flex, Avatar, AvatarGroup, Skeleton } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote } from "../../lib/api"
import { getCurrentParent, randomStringUnsafe, getRandomArbitrary, generateAvatarColorCode } from "../../lib/helpers"
import { useNavigate, useLocation } from "react-router-dom"
import { BsTextLeft, BsPin, BsFileRichtext, BsCodeSlash, BsMarkdown } from "react-icons/bs"
import eventListener from "../../lib/eventListener"
import { IoTrashOutline, IoArchiveOutline, IoHeart } from "react-icons/io5"
import striptags from "striptags"
import { MdChecklist } from "react-icons/md"
import { NoteSidebarTag } from "./Tag"

export const NoteSkeleton = memo(({ index }: { index: number }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()

	return (
		<Flex
			padding="10px"
			paddingTop={index <= 0 ? "5px" : "0px"}
			paddingBottom="0px"
		>
			<Flex
				flexDirection="row"
				alignItems="center"
				justifyContent="space-between"
				padding="10px"
				cursor="pointer"
				borderRadius="10px"
				width="100%"
			>
				<Flex flexDirection="row">
					<Flex>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							width="30px"
							height="30px"
							borderRadius="10px"
						>
							<Avatar
								name="skeleton"
								width="30px"
								height="30px"
								borderRadius="full"
							/>
						</Skeleton>
					</Flex>
					<Flex
						flexDirection="column"
						paddingLeft="10px"
					>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								marginLeft="10px"
								fontSize={15}
							>
								{randomStringUnsafe(getRandomArbitrary(16, 32))}
							</AppText>
						</Skeleton>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
							marginTop="5px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textSecondary")}
								marginLeft="10px"
								fontSize={12}
							>
								{randomStringUnsafe(getRandomArbitrary(16, 32))}
							</AppText>
						</Skeleton>
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
							marginTop="5px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textSecondary")}
								marginLeft="10px"
								fontSize={9}
							>
								{randomStringUnsafe(getRandomArbitrary(16, 32))}
							</AppText>
						</Skeleton>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	)
})

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

	useEffect(() => {
		setPreview(striptags(note.preview.length === 0 ? note.title : note.preview))
	}, [note.preview])

	return (
		<Flex
			flexDirection="row"
			justifyContent="space-between"
			paddingLeft="13px"
			paddingRight="15px"
			paddingBottom="10px"
			paddingTop="10px"
			gap="25px"
			marginBottom="3px"
			borderLeft={active ? "2px solid " + getColor(darkMode, "purple") : "2px solid transparent"}
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
			<Flex gap="15px">
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
								{note.type === "checklist" && (
									<MdChecklist
										size={20}
										color={getColor(darkMode, "purple")}
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
								size={18}
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
						gap="5px"
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
							{striptags(note.title)}
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
						{striptags(preview.length === 0 ? note.title : preview)}
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
					{note.tags.length > 0 && (
						<Flex
							flexDirection="row"
							flexFlow="wrap"
							gap="5px"
							marginTop="3px"
						>
							{note.tags.map(tag => {
								return (
									<NoteSidebarTag
										tag={tag}
										key={tag.uuid}
									/>
								)
							})}
						</Flex>
					)}
				</Flex>
			</Flex>
			{note.participants.length > 1 && !isMobile && (
				<Flex alignItems="center">
					<AvatarGroup>
						{note.participants.slice(0, 2).map((participant, index) => {
							return (
								<Avatar
									key={index}
									name={
										typeof participant.avatar === "string" && participant.avatar.indexOf("https://") !== -1
											? undefined
											: participant.email
									}
									src={
										typeof participant.avatar === "string" && participant.avatar.indexOf("https://") !== -1
											? participant.avatar
											: undefined
									}
									bg={generateAvatarColorCode(participant.email, darkMode)}
									width="25px"
									height="25px"
									border="none"
									borderRadius="full"
								/>
							)
						})}
					</AvatarGroup>
				</Flex>
			)}
		</Flex>
	)
})

export default Note
