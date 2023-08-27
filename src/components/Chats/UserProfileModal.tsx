import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalBody,
	ModalFooter,
	ModalHeader,
	Spinner,
	Flex,
	Avatar,
	AvatarBadge,
	Button
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import {
	chatConversationsDelete,
	ChatConversation,
	contactsBlocked,
	contactsBlockedAdd,
	contactsBlockedDelete,
	contactsRequestsSend,
	contactsRequestsOut,
	contacts as getContacts,
	getUserProfile,
	Contact,
	UserProfile,
	BlockedContact,
	ContactRequest
} from "../../lib/api"
import { safeAwait, generateAvatarColorCode, convertTimestampToMs } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import useDb from "../../lib/hooks/useDb"

export const UserProfileModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const userIdRef = useRef<number>(0)
	const [loading, setLoading] = useState<boolean>(false)
	const [contacts, setContacts] = useState<Contact[]>([])
	const [blockedContacts, setBlockedContacts] = useState<BlockedContact[]>([])
	const [requestsOut, setRequestsOut] = useState<ContactRequest[]>([])
	const [profile, setProfile] = useState<UserProfile | undefined>(undefined)
	const [adding, setAdding] = useState<boolean>(false)
	const [added, setAdded] = useState<boolean>(false)
	const [blocked, setBlocked] = useState<boolean>(false)
	const [blocking, setBlocking] = useState<boolean>(false)
	const [unblocking, setUnblocking] = useState<boolean>(false)
	const [userId] = useDb("userId", 0)

	const canAddContact = useMemo(() => {
		if (!profile || added) {
			return false
		}

		return (
			contacts.filter(c => c.userId !== profile.id).length === 0 &&
			blockedContacts.filter(c => c.userId !== profile.id).length === 0 &&
			requestsOut.filter(c => c.userId !== profile.id).length === 0
		)
	}, [contacts, contactsBlocked, requestsOut, profile, added])

	const canBlockContact = useMemo(() => {
		if (!profile || blocked) {
			return false
		}

		return (
			contacts.filter(c => c.userId !== profile.id).length !== 0 &&
			blockedContacts.filter(c => c.userId !== profile.id).length === 0 &&
			requestsOut.filter(c => c.userId !== profile.id).length === 0
		)
	}, [contacts, contactsBlocked, requestsOut, profile, blocked])

	const canUnblockContact = useMemo(() => {
		if (!profile) {
			return false
		}

		return blockedContacts.filter(c => c.userId === profile.id).length !== 0
	}, [contactsBlocked, profile])

	const unblock = useCallback(async () => {
		if (!profile) {
			return
		}

		setUnblocking(true)

		const [blockedContactsErr, blockedContactsRes] = await safeAwait(contactsBlocked())

		if (blockedContactsErr) {
			console.error(blockedContactsErr)

			setUnblocking(false)
			showToast("error", blockedContactsErr.message, "bottom", 5000)

			return
		}

		const foundContact = blockedContactsRes.filter(c => c.email === profile.email)

		if (foundContact.length === 0) {
			setUnblocking(false)

			return
		}

		const [err] = await safeAwait(contactsBlockedDelete(foundContact[0].uuid))

		if (err) {
			console.error(err)

			setUnblocking(false)
			showToast("error", err.message, "bottom", 5000)

			return
		}

		setUnblocking(false)
		setBlocked(false)

		load()
	}, [lang, profile])

	const block = useCallback(async () => {
		if (!profile) {
			return
		}

		if (
			!window.confirm(
				i18n(lang, "blockUserWarning", true, ["__NAME__"], [profile.nickName.length > 0 ? profile.nickName : profile.email])
			)
		) {
			return
		}

		setBlocking(true)

		const [err] = await safeAwait(contactsBlockedAdd(profile.email))

		if (err) {
			console.error(err)

			setBlocking(false)
			showToast("error", err.message, "bottom", 5000)

			return
		}

		setBlocking(false)
		setBlocked(true)

		load()
	}, [lang, profile])

	const add = useCallback(async () => {
		if (!profile) {
			return
		}

		setAdding(true)

		const [err] = await safeAwait(contactsRequestsSend(profile.email))

		setAdding(false)

		if (err) {
			console.error(err)

			setAdding(false)
			showToast("error", err.message, "bottom", 5000)

			return
		}

		showToast("success", i18n(lang, "contactRequestSent"), "bottom", 5000)
		setAdded(true)

		load()
	}, [profile, lang])

	const load = useCallback(async () => {
		setLoading(true)

		const [err, data] = await safeAwait(
			Promise.all([getContacts(), contactsBlocked(), contactsRequestsOut(), getUserProfile(userIdRef.current)])
		)

		if (err) {
			console.error(err)

			showToast("error", err.toString(), "bottom", 5000)

			setLoading(false)

			return
		}

		setAdded(data[0].filter(c => c.userId === data[3].id).length > 0 || data[2].filter(c => c.userId === data[3].id).length > 0)
		setBlocked(data[1].filter(c => c.userId === data[3].id).length > 0)
		setProfile(data[3])
		setBlockedContacts(data[1])
		setRequestsOut(data[2])
		setContacts(data[0])
		setLoading(false)
	}, [])

	useEffect(() => {
		const openUserProfileModalListener = eventListener.on("openUserProfileModal", (userId: number) => {
			setOpen(true)
			setAdded(false)
			setBlocked(false)

			userIdRef.current = userId

			load()
		})

		return () => {
			openUserProfileModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "md" : "md"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}></ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					{loading || !profile ? (
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
						<Flex flexDirection="column">
							<Flex
								flexDirection="row"
								alignItems="center"
								gap="15px"
							>
								<Avatar
									name={
										typeof profile.avatar === "string" && profile.avatar.indexOf("https://") !== -1
											? undefined
											: profile.email
									}
									src={
										typeof profile.avatar === "string" && profile.avatar.indexOf("https://") !== -1
											? profile.avatar
											: undefined
									}
									bg={generateAvatarColorCode(profile.email, darkMode)}
									width="55px"
									height="55px"
									borderRadius="full"
									border="none"
								>
									<AvatarBadge
										boxSize="12px"
										border="none"
										backgroundColor={
											!profile.appearOffline && profile.lastActive > 0
												? profile.lastActive > Date.now() - ONLINE_TIMEOUT
													? getColor(darkMode, "green")
													: getColor(darkMode, "red")
												: "gray"
										}
									/>
								</Avatar>
								<Flex flexDirection="column">
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										color={getColor(darkMode, "textPrimary")}
										fontSize={20}
										wordBreak="break-all"
										noOfLines={1}
									>
										{profile.nickName.length > 0 ? profile.nickName : profile.email}
									</AppText>
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										color={getColor(darkMode, "textSecondary")}
										fontSize={14}
										wordBreak="break-all"
										noOfLines={1}
									>
										{profile.email}
									</AppText>
								</Flex>
							</Flex>
							<Flex
								backgroundColor={getColor(darkMode, "borderSecondary")}
								width="100%"
								height="1px"
								marginTop="20px"
							/>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={getColor(darkMode, "textSecondary")}
								fontSize={13}
								wordBreak="break-all"
								noOfLines={1}
								marginTop="10px"
							>
								{i18n(
									lang,
									"profileMemberSince",
									true,
									["__DATE__"],
									[new Date(convertTimestampToMs(profile.createdAt)).toDateString()]
								)}
							</AppText>
							{userId !== profile.id && (
								<Flex
									flexDirection="row"
									alignItems="center"
									gap="8px"
								>
									{canAddContact && (
										<Button
											marginTop="25px"
											borderRadius="10px"
											backgroundColor={darkMode ? "white" : getColor(darkMode, "backgroundSecondary")}
											color="black"
											autoFocus={false}
											fontWeight="bold"
											border="1px solid transparent"
											height="30px"
											_hover={{
												backgroundColor: "transparent",
												border: "1px solid " + (darkMode ? "white" : "black"),
												color: darkMode ? "white" : "black"
											}}
											_active={{
												backgroundColor: "transparent",
												border: "1px solid " + (darkMode ? "white" : "black"),
												color: darkMode ? "white" : "black"
											}}
											_focus={{
												backgroundColor: "transparent",
												border: "1px solid " + (darkMode ? "white" : "black"),
												color: darkMode ? "white" : "black"
											}}
											onClick={() => add()}
										>
											{adding ? <Spinner /> : i18n(lang, "profileAddContact")}
										</Button>
									)}
									{canBlockContact && (
										<Button
											marginTop="25px"
											borderRadius="10px"
											backgroundColor={getColor(darkMode, "red")}
											color="white"
											autoFocus={false}
											fontWeight="bold"
											border="1px solid transparent"
											height="30px"
											_hover={{
												backgroundColor: "transparent",
												border: "1px solid " + getColor(darkMode, "red"),
												color: getColor(darkMode, "red")
											}}
											_active={{
												backgroundColor: "transparent",
												border: "1px solid " + getColor(darkMode, "red"),
												color: getColor(darkMode, "red")
											}}
											_focus={{
												backgroundColor: "transparent",
												border: "1px solid " + getColor(darkMode, "red"),
												color: getColor(darkMode, "red")
											}}
											onClick={() => block()}
										>
											{blocking ? <Spinner /> : i18n(lang, "profileBlockContact")}
										</Button>
									)}
									{canUnblockContact && (
										<Button
											marginTop="25px"
											borderRadius="10px"
											backgroundColor={getColor(darkMode, "red")}
											color="white"
											autoFocus={false}
											fontWeight="bold"
											border="1px solid transparent"
											height="30px"
											_hover={{
												backgroundColor: "transparent",
												border: "1px solid " + getColor(darkMode, "red"),
												color: getColor(darkMode, "red")
											}}
											_active={{
												backgroundColor: "transparent",
												border: "1px solid " + getColor(darkMode, "red"),
												color: getColor(darkMode, "red")
											}}
											_focus={{
												backgroundColor: "transparent",
												border: "1px solid " + getColor(darkMode, "red"),
												color: getColor(darkMode, "red")
											}}
											onClick={() => unblock()}
										>
											{unblocking ? <Spinner /> : i18n(lang, "profileUnblockContact")}
										</Button>
									)}
								</Flex>
							)}
						</Flex>
					)}
				</ModalBody>
				<ModalFooter></ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default UserProfileModal
