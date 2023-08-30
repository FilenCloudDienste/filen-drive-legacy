import { memo, useEffect, useState, useMemo, useCallback } from "react"
import { Flex, Avatar, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { TopbarProps, UserInfo } from "../../types"
import Input from "../../components/Input"
import eventListener from "../../lib/eventListener"
import { useNavigate, useLocation } from "react-router-dom"
import { fetchUserInfo } from "../../lib/services/user"
import UploadButton from "./UploadButton"
import { i18n } from "../../i18n"
import { getCurrentParent, generateAvatarColorCode } from "../../lib/helpers"

const Topbar = memo(({ darkMode, isMobile, windowWidth, lang, searchTerm, setSearchTerm }: TopbarProps) => {
	const navigate = useNavigate()
	const location = useLocation()
	const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined)

	const uploadButtonEnabled: boolean = useMemo(() => {
		return (
			location.hash.indexOf("shared-in") === -1 &&
			location.hash.indexOf("trash") === -1 &&
			location.hash.indexOf("links") === -1 &&
			location.hash.indexOf("favorites") === -1 &&
			location.hash.indexOf("recent") === -1 &&
			location.hash.indexOf("account") === -1 &&
			getCurrentParent(window.location.href) !== "shared-out"
		)
	}, [location])

	const fetchData = useCallback(() => {
		fetchUserInfo()
			.then(info => setUserInfo(info))
			.catch(console.error)
	}, [])

	useEffect(() => {
		fetchData()

		const avatarUploadedListener = eventListener.on("avatarUploaded", () => fetchData())

		return () => {
			avatarUploadedListener.remove()
		}
	}, [])

	return (
		<Flex
			width="100%"
			height="50px"
			alignItems="center"
			paddingLeft="15px"
			paddingRight="20px"
			flexDirection="row"
			justifyContent="space-between"
			gap="25px"
		>
			{!isMobile && <Flex>&nbsp;</Flex>}
			{location.hash.indexOf("account") === -1 &&
				location.hash.indexOf("chats") === -1 &&
				location.hash.indexOf("notes") === -1 &&
				location.hash.indexOf("contacts") === -1 && (
					<Input
						darkMode={darkMode}
						isMobile={isMobile}
						placeholder={i18n(lang, "searchInThisFolder")}
						width={isMobile ? "100%" : windowWidth / 3 + "px"}
						maxWidth={!isMobile ? "500px" : undefined}
						height="30px"
						backgroundColor={getColor(darkMode, "backgroundSecondary")}
						borderRadius="10px"
						fontWeight="350"
						fontSize={13}
						paddingLeft="12px"
						paddingRight="12px"
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						color={getColor(darkMode, "textSecondary")}
						border="none"
						_placeholder={{
							color: !darkMode ? "gray" : getColor(darkMode, "textSecondary")
						}}
					/>
				)}
			<Flex
				alignItems="center"
				width="auto"
				flexDirection="row"
				justifyContent="flex-start"
			>
				<UploadButton
					darkMode={darkMode}
					isMobile={isMobile}
					lang={lang}
					enabled={uploadButtonEnabled}
				/>
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
						src={typeof userInfo.avatarURL === "string" && userInfo.avatarURL.length > 0 ? userInfo.avatarURL : undefined}
						bg={generateAvatarColorCode(userInfo.email, darkMode)}
						cursor="pointer"
						onClick={() => navigate("/#/account/general")}
					/>
				)}
			</Flex>
		</Flex>
	)
})

export default Topbar
