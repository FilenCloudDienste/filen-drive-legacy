import { memo, useState, useEffect, useRef, useCallback } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader, FormLabel, Flex, Switch } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { userNickname, userAppearOffline } from "../../lib/api"
import db from "../../lib/db"
import { orderItemsByType, getCurrentURLParentFolder } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { v4 as uuidv4 } from "uuid"
import { addFolderNameToDb } from "../../lib/services/items"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { getUserNameFromAccount } from "./utils"
import { fetchUserAccount } from "../../lib/services/user"
import { UserGetAccount } from "../../types"
import { CHAKRA_COLOR_SCHEME } from "../../lib/constants"

const SettingsModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	const [open, setOpen] = useState<boolean>(false)
	const [saving, setSaving] = useState<boolean>(false)
	const [displayName, setDisplayName] = useState<string>("")
	const [userAccount, setUserAccount] = useState<UserGetAccount | undefined>(undefined)
	const [appearOffline, setAppearOffline] = useState<boolean>(false)

	const save = useCallback(async () => {
		if (saving || displayName.trim().length === 0) {
			return
		}

		setSaving(true)

		try {
			await Promise.all([userNickname(displayName.trim()), userAppearOffline(appearOffline)])
			await fetchAccount()

			eventListener.emit("chatSettingsChanged", {
				nickName: displayName.trim(),
				appearOffline
			})
		} catch (e) {
			console.error(e)
		}

		setSaving(false)
	}, [saving, displayName, appearOffline])

	const fetchAccount = useCallback(async () => {
		try {
			const account = await fetchUserAccount()

			setUserAccount(account)
			setDisplayName(getUserNameFromAccount(account))
			setAppearOffline(account.appearOffline)
		} catch (e) {
			console.error(e)
		}
	}, [])

	useEffect(() => {
		const openChatSettingsModalListener = eventListener.on("openChatSettingsModal", () => {
			setUserAccount(undefined)
			setDisplayName("")
			setAppearOffline(false)
			fetchAccount()
			setOpen(true)
		})

		return () => {
			openChatSettingsModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size="xl"
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatSettings")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
				>
					{typeof userAccount === "undefined" ? (
						<Flex
							justifyContent="center"
							alignItems="center"
						>
							<Spinner
								width="32px"
								height="32px"
								color={getColor(darkMode, "textPrimary")}
							/>
						</Flex>
					) : (
						<Flex
							flexDirection="column"
							gap="25px"
						>
							<Flex flexDirection="column">
								<FormLabel color={getColor(darkMode, "textPrimary")}>{i18n(lang, "chatSettingsDisplayName")}</FormLabel>
								<Input
									darkMode={darkMode}
									isMobile={isMobile}
									value={displayName}
									onChange={e => setDisplayName(e.target.value)}
									placeholder={i18n(lang, "chatSettingsDisplayName")}
									type="text"
									isDisabled={saving}
									maxLength={255}
									color={getColor(darkMode, "textSecondary")}
									_placeholder={{
										color: getColor(darkMode, "textSecondary")
									}}
								/>
							</Flex>
							<Flex
								flexDirection="row"
								justifyContent="space-between"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									noOfLines={1}
									wordBreak="break-all"
									color={getColor(darkMode, "textPrimary")}
								>
									{i18n(lang, "chatSettingsAppearOffline")}
								</AppText>
								<Switch
									size="lg"
									colorScheme={CHAKRA_COLOR_SCHEME}
									isChecked={appearOffline}
									onChange={() => setAppearOffline(prev => !prev)}
									background={getColor(darkMode, "backgroundSecondary")}
								/>
							</Flex>
						</Flex>
					)}
				</ModalBody>
				<ModalFooter>
					{saving ? (
						<Spinner
							width="16px"
							height="16px"
							color={getColor(darkMode, "textPrimary")}
						/>
					) : (
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							cursor="pointer"
							_hover={{
								textDecoration: "underline"
							}}
							onClick={() => save()}
						>
							{i18n(lang, "save")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default SettingsModal
