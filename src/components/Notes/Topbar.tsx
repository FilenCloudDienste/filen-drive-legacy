import { memo, useState } from "react"
import { Flex, Skeleton, Tooltip } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote } from "../../lib/api"
import { randomStringUnsafe, getRandomArbitrary, getCurrentParent } from "../../lib/helpers"
import { NotesSizes } from "./Notes"
import Title from "./Title"
import { AiOutlineSync, AiOutlineCheckCircle } from "react-icons/ai"
import { IoEllipsisVertical } from "react-icons/io5"
import { useNavigate } from "react-router-dom"
import eventListener from "../../lib/eventListener"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"

export const Topbar = memo(
	({
		sizes,
		currentNote,
		setNotes,
		synced,
		setSynced
	}: {
		sizes: NotesSizes
		currentNote: INote | undefined
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
		synced: { title: boolean; content: boolean }
		setSynced: React.Dispatch<React.SetStateAction<{ title: boolean; content: boolean }>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const [hoveringEllipsis, setHoveringEllipsis] = useState<boolean>(false)
		const navigate = useNavigate()
		const lang = useLang()

		return (
			<Flex
				width={sizes.note + "px"}
				height="50px"
				flexDirection="row"
				borderBottom={"1px solid " + getColor(darkMode, "borderPrimary")}
				alignItems="center"
				paddingLeft="15px"
				paddingRight="15px"
				justifyContent="space-between"
				gap="25px"
			>
				<Flex
					flex={1}
					flexDirection="row"
					justifyContent="flex-start"
					alignItems="center"
					gap="15px"
				>
					<Flex>
						<Tooltip
							label={synced.content && synced.title ? i18n(lang, "noteSynced") : i18n(lang, "syncingNote")}
							placement="bottom"
							borderRadius="5px"
							backgroundColor={getColor(darkMode, "backgroundSecondary")}
							boxShadow="md"
							color={getColor(darkMode, "textSecondary")}
							border={"1px solid " + getColor(darkMode, "borderPrimary")}
							hasArrow={true}
						>
							<Flex>
								{synced.content && synced.title ? (
									<AiOutlineCheckCircle
										size={20}
										color={getColor(darkMode, "green")}
										style={{
											flexShrink: 0
										}}
									/>
								) : (
									<AiOutlineSync
										className="icon-spin"
										size={20}
										color={getColor(darkMode, "textPrimary")}
										style={{
											flexShrink: 0
										}}
									/>
								)}
							</Flex>
						</Tooltip>
					</Flex>
					{currentNote ? (
						<Title
							currentNote={currentNote}
							setNotes={setNotes}
							setSynced={setSynced}
						/>
					) : (
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
							height="20px"
							boxShadow="sm"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textPrimary")}
								fontSize={16}
							>
								{randomStringUnsafe(getRandomArbitrary(10, 50))}
							</AppText>
						</Skeleton>
					)}
				</Flex>
				<Flex
					flexDirection="row"
					alignItems="center"
					gap="15px"
					justifyContent="flex-end"
				>
					{currentNote && (
						<Flex
							backgroundColor={hoveringEllipsis ? getColor(darkMode, "backgroundSecondary") : undefined}
							width="32px"
							height="32px"
							padding="4px"
							borderRadius="full"
							justifyContent="center"
							alignItems="center"
							onMouseEnter={() => setHoveringEllipsis(true)}
							onMouseLeave={() => setHoveringEllipsis(false)}
							onClick={e => {
								if (getCurrentParent(window.location.href) !== currentNote.uuid) {
									navigate("#/notes/" + currentNote.uuid)
								}

								eventListener.emit("openNoteContextMenu", {
									note: currentNote,
									event: e,
									position: {
										x: e.nativeEvent.clientX,
										y: e.nativeEvent.clientY
									}
								})
							}}
							cursor="pointer"
						>
							<IoEllipsisVertical
								size={24}
								color={hoveringEllipsis ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								cursor="pointer"
								style={{
									flexShrink: 0
								}}
							/>
						</Flex>
					)}
				</Flex>
			</Flex>
		)
	}
)

export default Topbar
