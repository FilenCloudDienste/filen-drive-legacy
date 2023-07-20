import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner, Flex, Input, Avatar } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import {
	getPublicKeyFromEmail,
	chatConversationsParticipantsAdd,
	chatConversations,
	Contact as IContact,
	contacts as getContacts,
	ChatConversation,
	chatConversationsCreate
} from "../../lib/api"
import { encryptMetadataPublicKey } from "../../lib/worker/worker.com"
import { safeAwait, generateAvatarColorCode, generateRandomString } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { Virtuoso } from "react-virtuoso"
import striptags from "striptags"
import { IoAddOutline, IoCloseOutline } from "react-icons/io5"
import { v4 as uuidv4 } from "uuid"
import db from "../../lib/db"
import { useNavigate } from "react-router-dom"

const Contact = memo(
	({
		contact,
		contactsToAdd,
		setContactsToAdd
	}: {
		contact: IContact
		contactsToAdd: Record<string, IContact>
		setContactsToAdd: React.Dispatch<React.SetStateAction<Record<string, IContact>>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const lang = useLang()
		const [hovering, setHovering] = useState<boolean>(false)
		const [hoveringAddRemove, setHoveringAddRemove] = useState<boolean>(false)

		return (
			<Flex
				flexDirection="row"
				height="40px"
				alignItems="center"
				gap="25px"
				justifyContent="space-between"
				paddingLeft="10px"
				paddingRight="10px"
				borderRadius="10px"
				marginBottom="3px"
				onMouseEnter={() => setHovering(true)}
				onMouseLeave={() => setHovering(false)}
				_hover={{
					backgroundColor: getColor(darkMode, "backgroundTertiary")
				}}
			>
				<Flex
					flexDirection="row"
					gap="10px"
					alignItems="center"
				>
					<Avatar
						name={typeof contact.avatar === "string" && contact.avatar.indexOf("https://") !== -1 ? undefined : contact.email}
						src={typeof contact.avatar === "string" && contact.avatar.indexOf("https://") !== -1 ? contact.avatar : undefined}
						bg={generateAvatarColorCode(contact.email, darkMode)}
						width="25px"
						height="25px"
						borderRadius="full"
						border="none"
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textPrimary")}
						fontSize={14}
					>
						{striptags(contact.email)}
					</AppText>
				</Flex>
				<Flex
					flexDirection="row"
					alignItems="center"
				>
					{typeof contactsToAdd[contact.uuid] !== "undefined" ? (
						<Flex
							backgroundColor={getColor(darkMode, "red")}
							width="28px"
							height="28px"
							padding="4px"
							borderRadius="full"
							justifyContent="center"
							alignItems="center"
							onMouseEnter={() => setHoveringAddRemove(true)}
							onMouseLeave={() => setHoveringAddRemove(false)}
							onClick={() =>
								setContactsToAdd(prev =>
									Object.keys(prev)
										.filter(key => key !== contact.uuid)
										.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
								)
							}
							cursor="pointer"
						>
							<IoCloseOutline
								size={22}
								color="white"
								cursor="pointer"
								style={{
									flexShrink: 0
								}}
							/>
						</Flex>
					) : (
						<Flex
							backgroundColor={getColor(darkMode, "green")}
							width="28px"
							height="28px"
							padding="4px"
							borderRadius="full"
							justifyContent="center"
							alignItems="center"
							onMouseEnter={() => setHoveringAddRemove(true)}
							onMouseLeave={() => setHoveringAddRemove(false)}
							onClick={() => setContactsToAdd(prev => ({ ...prev, [contact.uuid]: contact }))}
							cursor="pointer"
						>
							<IoAddOutline
								size={22}
								color="white"
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

const AddModal = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const conversationUUID = useRef<string>("")
	const conversationKey = useRef<string>("")
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [loadingContacts, setLoadingContacts] = useState<boolean>(false)
	const [contacts, setContacts] = useState<IContact[]>([])
	const [addedContactsIds, setAddedContactsIds] = useState<number[]>([])
	const [search, setSearch] = useState<string>("")
	const [mode, setMode] = useState<"new" | "add">("new")
	const [contactsToAdd, setContactsToAdd] = useState<Record<string, IContact>>({})
	const [conversation, setConversation] = useState<ChatConversation | undefined>(undefined)
	const navigate = useNavigate()

	const contactsFiltered = useMemo(() => {
		const alreadyParticipating = (conversation?.participants || []).map(participant => participant.userId)

		return contacts
			.filter(contact => {
				if (alreadyParticipating.includes(contact.userId) && mode === "add") {
					return false
				}

				if (search.length === 0) {
					return true
				}

				if (
					contact.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
					contact.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
			.sort((a, b) => a.email.localeCompare(b.email))
	}, [contacts, search, conversation, mode])

	const containerHeight = useMemo(() => {
		const itemHeight = 45
		const max = 400

		if (!conversation) {
			return itemHeight
		}

		const calced = Math.round(itemHeight * contactsFiltered.length)

		if (calced > max) {
			return max
		}

		return calced
	}, [conversation, contactsFiltered])

	const loadContacts = useCallback(async (showLoader: boolean = true) => {
		setLoadingContacts(showLoader)

		const [err, res] = await safeAwait(getContacts())

		if (err) {
			console.error(err)

			setLoadingContacts(false)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		setContacts(res)
		setLoadingContacts(false)
	}, [])

	const addOrCreate = useCallback(async () => {
		if (conversationUUID.current.length === 0 || conversationKey.current.length === 0) {
			return
		}

		setLoading(true)

		const to = Object.keys(contactsToAdd).map(key => contactsToAdd[key].email.trim())
		const promises: Promise<void>[] = []
		let newUUID = ""

		if (mode === "add") {
			for (const email of to) {
				promises.push(
					new Promise(async (resolve, reject) => {
						const [toErr, toRes] = await safeAwait(getPublicKeyFromEmail(email))

						if (toErr) {
							reject(toErr)

							return
						}

						const participantMetadata = await encryptMetadataPublicKey(JSON.stringify({ key: conversationKey.current }), toRes)

						const [addErr] = await safeAwait(
							chatConversationsParticipantsAdd(conversationUUID.current, email, participantMetadata)
						)

						if (addErr) {
							reject(addErr)

							return
						}

						resolve()
					})
				)
			}
		} else {
			const key = generateRandomString(32)
			const publicKey = await db.get("publicKey")
			const metadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKey)
			const uuid = uuidv4()

			const [createErr] = await safeAwait(chatConversationsCreate(uuid, metadata))

			if (createErr) {
				console.error(createErr)

				setLoading(false)

				return
			}

			for (const email of to) {
				promises.push(
					new Promise(async (resolve, reject) => {
						const [toErr, toRes] = await safeAwait(getPublicKeyFromEmail(email))

						if (toErr) {
							reject(toErr)

							return
						}

						const participantMetadata = await encryptMetadataPublicKey(JSON.stringify({ key }), toRes)

						const [addErr] = await safeAwait(chatConversationsParticipantsAdd(uuid, email, participantMetadata))

						if (addErr) {
							reject(addErr)

							return
						}

						resolve()
					})
				)
			}

			newUUID = uuid
		}

		const [err] = await safeAwait(Promise.all(promises))

		if (err) {
			console.error(err)

			setLoading(false)

			return
		}

		const [conversationsErr, conversationsRes] = await safeAwait(chatConversations(Date.now() + 86400000))

		if (conversationsErr) {
			console.error(conversationsErr)

			setLoading(false)

			return
		}

		eventListener.emit("updateChatConversations", conversationsRes)

		if (mode === "new") {
			navigate("#/chats/" + newUUID)
		}

		setLoading(false)
		setOpen(false)
	}, [contactsToAdd, mode])

	const itemContent = useCallback(
		(index: number, contact: IContact) => {
			return (
				<Contact
					key={contact.uuid}
					contact={contact}
					contactsToAdd={contactsToAdd}
					setContactsToAdd={setContactsToAdd}
				/>
			)
		},
		[contactsToAdd]
	)

	useEffect(() => {
		const openChatAddModalListener = eventListener.on(
			"openChatAddModal",
			({
				uuid,
				key,
				mode: m,
				conversation: c
			}: {
				uuid: string
				key: string
				mode: "new" | "add"
				conversation: ChatConversation
			}) => {
				conversationUUID.current = uuid
				conversationKey.current = key

				loadContacts()

				setSearch("")
				setContactsToAdd({})
				setConversation(c)
				setMode(m)
				setOpen(true)
			}
		)

		return () => {
			openChatAddModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "md"}
			autoFocus={false}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>
					{mode === "new" ? i18n(lang, "chatNew") : i18n(lang, "chatAddUserToConversation")}
				</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					{(contactsFiltered.length > 0 || search.length > 0) && (
						<Input
							value={search}
							onChange={e => setSearch(e.target.value)}
							autoFocus={false}
							spellCheck={false}
							border="none"
							borderRadius="10px"
							width="100%"
							height="35px"
							backgroundColor={getColor(darkMode, "backgroundPrimary")}
							color={getColor(darkMode, "textPrimary")}
							_placeholder={{
								color: getColor(darkMode, "textSecondary")
							}}
							placeholder={i18n(lang, "searchInput")}
							paddingLeft="10px"
							paddingRight="10px"
							shadow="none"
							outline="none"
							_hover={{
								shadow: "none",
								outline: "none"
							}}
							_active={{
								shadow: "none",
								outline: "none"
							}}
							_focus={{
								shadow: "none",
								outline: "none"
							}}
							_highlighted={{
								shadow: "none",
								outline: "none"
							}}
							fontSize={15}
							marginBottom="15px"
						/>
					)}
					<Flex
						width="100%"
						height="auto"
						flexDirection="column"
					>
						{contactsFiltered.length > 0 ? (
							<Virtuoso
								data={contactsFiltered}
								height={containerHeight}
								width="100%"
								itemContent={itemContent}
								style={{
									overflowX: "hidden",
									overflowY: "auto",
									height: containerHeight + "px",
									width: "100%"
								}}
							/>
						) : (
							<Flex
								justifyContent="center"
								alignItems="center"
								width="100%"
								height="50px"
								color={getColor(darkMode, "textSecondary")}
							>
								{i18n(lang, "noContactsFound")}
							</Flex>
						)}
					</Flex>
				</ModalBody>
				<ModalFooter>
					{loading ? (
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
							color={
								Object.keys(contactsToAdd).length === 0
									? getColor(darkMode, "textSecondary")
									: getColor(darkMode, "linkPrimary")
							}
							cursor={Object.keys(contactsToAdd).length === 0 ? "not-allowed" : "pointer"}
							onClick={() => {
								if (Object.keys(contactsToAdd).length === 0) {
									return
								}

								addOrCreate()
							}}
							_hover={{
								textDecoration: Object.keys(contactsToAdd).length === 0 ? "none" : "underline"
							}}
						>
							{mode === "new" ? i18n(lang, "create") : i18n(lang, "add")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default AddModal
