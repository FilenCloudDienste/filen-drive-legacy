import { memo, useState, useCallback, useEffect } from "react"
import { Flex, Skeleton, Tooltip, Avatar, Spinner, AvatarBadge } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote } from "../../lib/api"
import { randomStringUnsafe, getRandomArbitrary, getCurrentParent, generateAvatarColorCode } from "../../lib/helpers"
import { NotesSizes } from "./Notes"
import Title from "./Title"
import { AiOutlineSync, AiOutlineCheckCircle } from "react-icons/ai"
import { IoEllipsisVertical } from "react-icons/io5"
import { useNavigate } from "react-router-dom"
import eventListener from "../../lib/eventListener"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { fetchUserInfo } from "../../lib/services/user"
import { UserInfo } from "../../types"
import { useLocalStorage } from "react-use"

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
		const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined)
		const [showExportMasterKeys] = useLocalStorage<string>("showExportMasterKeys")

		const fetchData = useCallback(() => {
			fetchUserInfo()
				.then(info => setUserInfo(info))
				.catch(console.error)
		}, [])

		useEffect(() => {
			fetchData()
		}, [])

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
					<Flex alignItems="center">
						{!userInfo ? (
							<Spinner
								width="20px"
								height="20px"
								color={getColor(darkMode, "textPrimary")}
							/>
						) : (
							<Avatar
								name={typeof userInfo.avatarURL === "string" && userInfo.avatarURL.length > 0 ? undefined : userInfo.email}
								width="28px"
								height="28px"
								src={
									typeof userInfo.avatarURL === "string" && userInfo.avatarURL.length > 0 ? userInfo.avatarURL : undefined
								}
								bg={generateAvatarColorCode(userInfo.email, darkMode, userInfo.avatarURL)}
								cursor="pointer"
								onClick={() => navigate("/#/account/general")}
							>
								{showExportMasterKeys !== "false" && (
									<AvatarBadge
										boxSize="16px"
										border="none"
										backgroundColor={getColor(darkMode, "red")}
										fontSize={12}
										color="white"
										fontWeight="bold"
										justifyContent="center"
										alignItems="center"
									>
										!
									</AvatarBadge>
								)}
							</Avatar>
						)}
					</Flex>
				</Flex>
			</Flex>
		)
	}
)

export default Topbar
