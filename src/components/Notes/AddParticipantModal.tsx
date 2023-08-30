import { memo, useState, useEffect, useCallback, useMemo } from "react"
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalBody,
	ModalFooter,
	ModalHeader,
	Flex,
	Avatar,
	Badge,
	Tooltip,
	Spinner,
	Input
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import {
	Note as INote,
	contacts as getContacts,
	Contact as IContact,
	NoteParticipant,
	noteParticipantsPermissions,
	noteParticipantsAdd,
	getPublicKeyFromEmail
} from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { Virtuoso } from "react-virtuoso"
import striptags from "striptags"
import { AiOutlineEdit, AiOutlineEye } from "react-icons/ai"
import { decryptNoteKeyParticipant, encryptMetadataPublicKey } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { IoCloseOutline } from "react-icons/io5"
import useDb from "../../lib/hooks/useDb"
import { i18n } from "../../i18n"
import { generateAvatarColorCode } from "../../lib/helpers"

export const Contact = memo(
	({
		contact,
		note,
		setAddedContactsIds
	}: {
		contact: IContact
		note: INote | undefined
		setAddedContactsIds: React.Dispatch<React.SetStateAction<number[]>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const lang = useLang()
		const [adding, setAdding] = useState<boolean>(false)

		const add = useCallback(async () => {
			if (!note) {
				return
			}

			setAdding(true)

			const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

			const [publicKeyErr, publicKeyRes] = await safeAwait(getPublicKeyFromEmail(contact.email))

			if (publicKeyErr) {
				console.error(publicKeyErr)

				dismissToast(loadingToast)
				setAdding(false)
				showToast("error", publicKeyErr.message, "bottom", 5000)

				return
			}

			const privateKey = await db.get("privateKey")
			const userId = await db.get("userId")
			const key = await decryptNoteKeyParticipant(
				note.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const metadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKeyRes)

			const [err] = await safeAwait(
				noteParticipantsAdd({
					uuid: note.uuid,
					metadata,
					contactUUID: contact.uuid,
					permissionsWrite: true
				})
			)

			if (err) {
				console.error(err)

				dismissToast(loadingToast)
				setAdding(false)
				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)
			setAdding(false)
			setAddedContactsIds(prev => [...prev, contact.userId])

			eventListener.emit("noteParticipantAddedFromContacts", {
				contact,
				note,
				metadata,
				permissionsWrite: true
			})
		}, [note, contact, lang])

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
					{adding ? (
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
							onClick={() => add()}
							_hover={{
								textDecoration: "underline"
							}}
						>
							{i18n(lang, "add")}
						</AppText>
					)}
				</Flex>
			</Flex>
		)
	}
)

export const AddContactModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [note, setNote] = useState<INote | undefined>(undefined)
	const [loadingContacts, setLoadingContacts] = useState<boolean>(false)
	const [contacts, setContacts] = useState<IContact[]>([])
	const [addedContactsIds, setAddedContactsIds] = useState<number[]>([])
	const [search, setSearch] = useState<string>("")

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

	const contactsFiltered = useMemo(() => {
		return contacts
			.filter(contact => !addedContactsIds.includes(contact.userId))
			.filter(contact => {
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
	}, [contacts, addedContactsIds, search])

	const containerHeight = useMemo(() => {
		const itemHeight = 45
		const max = 400

		if (!note) {
			return itemHeight
		}

		const calced = Math.round(itemHeight * contactsFiltered.length)

		if (calced > max) {
			return max
		}

		return calced
	}, [note, contactsFiltered])

	const itemContent = useCallback(
		(index: number, contact: IContact) => {
			return (
				<Contact
					key={contact.uuid}
					contact={contact}
					note={note}
					setAddedContactsIds={setAddedContactsIds}
				/>
			)
		},
		[note]
	)

	useEffect(() => {
		const noteParticipantRemovedListener = eventListener.on(
			"noteParticipantRemoved",
			({ note: n, userId }: { note: INote; userId: number }) => {
				if (note && note.uuid === n.uuid) {
					setAddedContactsIds(prev => prev.filter(id => id !== userId))
				}
			}
		)

		return () => {
			noteParticipantRemovedListener.remove()
		}
	}, [note])

	useEffect(() => {
		const openNoteAddContactModalListener = eventListener.on("openNoteAddContactModal", (selectedNote: INote) => {
			setNote(selectedNote)
			setOpen(true)
			setLoadingContacts(false)
			setAddedContactsIds(selectedNote.participants.map(participant => participant.userId))

			loadContacts()
		})

		return () => {
			openNoteAddContactModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "xl"}
			autoFocus={false}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "addNewParticipant")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
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
					{note && (
						<Flex
							width="100%"
							height="auto"
							flexDirection="column"
						>
							{loadingContacts ? (
								<Flex
									justifyContent="center"
									alignItems="center"
									width="100%"
									height="50px"
								>
									<Spinner
										color={getColor(darkMode, "textPrimary")}
										width="32px"
										height="32px"
									/>
								</Flex>
							) : contactsFiltered.length > 0 ? (
								<Virtuoso
									data={contactsFiltered}
									height={containerHeight}
									width="100%"
									itemContent={itemContent}
									computeItemKey={(_, item) => item.uuid}
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
					)}
				</ModalBody>
				<ModalFooter></ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export const Participant = memo(({ participant, note }: { participant: NoteParticipant; note: INote | undefined }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const [hovering, setHovering] = useState<boolean>(false)
	const [hoveringPermissions, setHoveringPermissions] = useState<boolean>(false)
	const [hoveringRemove, setHoveringRemove] = useState<boolean>(false)
	const [permissions, setPermissions] = useState<{ write: boolean }>({ write: participant.permissionsWrite })
	const [userId] = useDb("userId", 0)
	const lang = useLang()

	const changePermissions = useCallback(
		async (permissionsWrite: boolean) => {
			if (!note) {
				return
			}

			const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

			const [err] = await safeAwait(
				noteParticipantsPermissions({
					uuid: note.uuid,
					userId: participant.userId,
					permissionsWrite
				})
			)

			if (err) {
				console.error(err)

				dismissToast(loadingToast)

				showToast("error", err.message, "bottom", 5000)

				return
			}

			dismissToast(loadingToast)

			setPermissions(prev => ({ ...prev, write: permissionsWrite }))

			eventListener.emit("noteParticipantPermissionsChanged", {
				note,
				userId: participant.userId,
				permissionsWrite
			})
		},
		[participant, note, lang]
	)

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
			backgroundColor={hovering ? getColor(darkMode, "backgroundTertiary") : undefined}
		>
			<Flex
				flexDirection="row"
				gap="10px"
				alignItems="center"
			>
				<Avatar
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
					{striptags(participant.email)}
				</AppText>
				{participant.isOwner && (
					<Badge
						borderRadius="10px"
						backgroundColor={getColor(darkMode, "purple")}
						color="white"
					>
						{i18n(lang, "owner")}
					</Badge>
				)}
			</Flex>
			<Flex
				flexDirection="row"
				alignItems="center"
				gap="5px"
			>
				{note && note.ownerId === userId && (
					<>
						{permissions.write ? (
							<Tooltip
								label={i18n(lang, "toggleParticipantWritePermissions")}
								placement="top"
								borderRadius="5px"
								backgroundColor={getColor(darkMode, "backgroundTertiary")}
								boxShadow="md"
								color={getColor(darkMode, "textSecondary")}
								hasArrow={true}
							>
								<Flex
									backgroundColor={
										hoveringPermissions || hovering
											? getColor(darkMode, "backgroundSecondary")
											: getColor(darkMode, "backgroundTertiary")
									}
									width="30px"
									height="30px"
									padding="4px"
									borderRadius="full"
									justifyContent="center"
									alignItems="center"
									onMouseEnter={() => setHoveringPermissions(true)}
									onMouseLeave={() => setHoveringPermissions(false)}
									onClick={() => changePermissions(false)}
									cursor="pointer"
								>
									<AiOutlineEdit
										size={20}
										color={
											hoveringPermissions ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
										}
										cursor="pointer"
										style={{
											flexShrink: 0
										}}
									/>
								</Flex>
							</Tooltip>
						) : (
							<Tooltip
								label={i18n(lang, "toggleParticipantReadPermissionsClick")}
								placement="top"
								borderRadius="5px"
								backgroundColor={getColor(darkMode, "backgroundTertiary")}
								boxShadow="md"
								color={getColor(darkMode, "textSecondary")}
								hasArrow={true}
							>
								<Flex
									backgroundColor={
										hoveringPermissions || hovering
											? getColor(darkMode, "backgroundSecondary")
											: getColor(darkMode, "backgroundTertiary")
									}
									width="30px"
									height="30px"
									padding="4px"
									borderRadius="full"
									justifyContent="center"
									alignItems="center"
									onMouseEnter={() => setHoveringPermissions(true)}
									onMouseLeave={() => setHoveringPermissions(false)}
									onClick={() => changePermissions(true)}
									cursor="pointer"
								>
									<AiOutlineEye
										size={20}
										color={
											hoveringPermissions ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
										}
										cursor="pointer"
										style={{
											flexShrink: 0
										}}
									/>
								</Flex>
							</Tooltip>
						)}
						{participant.userId !== userId && !participant.isOwner && (
							<Tooltip
								label={i18n(lang, "removeParticipantNote")}
								placement="top"
								borderRadius="5px"
								backgroundColor={getColor(darkMode, "backgroundTertiary")}
								boxShadow="md"
								color={getColor(darkMode, "textSecondary")}
								hasArrow={true}
							>
								<Flex
									width="30px"
									height="30px"
									padding="4px"
									borderRadius="full"
									justifyContent="center"
									alignItems="center"
									onMouseEnter={() => setHoveringRemove(true)}
									onMouseLeave={() => setHoveringRemove(false)}
									onClick={() =>
										eventListener.emit("openRemoveNoteParticipantModal", { note, userId: participant.userId })
									}
									cursor="pointer"
									backgroundColor={hoveringRemove ? getColor(darkMode, "backgroundSecondary") : undefined}
								>
									<IoCloseOutline
										size={20}
										color={hoveringRemove ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
										cursor="pointer"
										style={{
											flexShrink: 0
										}}
									/>
								</Flex>
							</Tooltip>
						)}
					</>
				)}
			</Flex>
		</Flex>
	)
})

export const AddParticipantModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [note, setNote] = useState<INote | undefined>(undefined)
	const [search, setSearch] = useState<string>("")
	const [userId] = useDb("userId", 0)

	const noteParticipantsFiltered = useMemo(() => {
		if (!note) {
			return []
		}

		return note.participants
			.filter(participant => participant.userId !== userId)
			.filter(participant => {
				if (search.length === 0) {
					return true
				}

				if (
					participant.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
					participant.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
			.sort((a, b) => a.email.localeCompare(b.email))
	}, [note, userId, search])

	const containerHeight = useMemo(() => {
		const itemHeight = 45
		const max = 400

		if (!note) {
			return itemHeight
		}

		const calced = Math.round(itemHeight * noteParticipantsFiltered.length)

		if (calced > max) {
			return max
		}

		return calced
	}, [note, noteParticipantsFiltered])

	const itemContent = useCallback(
		(_: number, participant: NoteParticipant) => {
			return (
				<Participant
					key={participant.userId}
					participant={participant}
					note={note}
				/>
			)
		},
		[note]
	)

	useEffect(() => {
		const noteParticipantRemovedListener = eventListener.on(
			"noteParticipantRemoved",
			({ note: n, userId }: { note: INote; userId: number }) => {
				if (note && n.uuid === note.uuid) {
					setNote(prev =>
						prev
							? {
									...prev,
									participants: prev.participants.filter(participant => participant.userId !== userId)
							  }
							: prev
					)
				}
			}
		)

		const noteParticipantAddedFromContactsListener = eventListener.on(
			"noteParticipantAddedFromContacts",
			({
				contact,
				note: n,
				metadata,
				permissionsWrite
			}: {
				contact: IContact
				note: INote
				metadata: string
				permissionsWrite: boolean
			}) => {
				if (note && note.uuid === n.uuid) {
					setNote(prev =>
						prev
							? {
									...prev,
									participants: [
										...prev.participants,
										...[
											{
												userId: contact.userId,
												isOwner: false,
												email: contact.email,
												avatar: contact.avatar,
												nickName: contact.nickName,
												metadata,
												permissionsWrite,
												addedTimestamp: Date.now()
											}
										]
									]
							  }
							: prev
					)
				}
			}
		)

		return () => {
			noteParticipantRemovedListener.remove()
			noteParticipantAddedFromContactsListener.remove()
		}
	}, [note])

	useEffect(() => {
		const openNoteAddParticipantModalListener = eventListener.on("openNoteAddParticipantModal", (selectedNote: INote) => {
			setNote(selectedNote)
			setSearch("")
			setOpen(true)
		})

		return () => {
			openNoteAddParticipantModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "xl"}
			autoFocus={false}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "participants")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					{(noteParticipantsFiltered.length > 0 || search.length > 0) && (
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
					{note && (
						<Flex
							width="100%"
							height="auto"
							flexDirection="column"
						>
							{noteParticipantsFiltered.length > 0 ? (
								<Virtuoso
									data={noteParticipantsFiltered}
									height={containerHeight}
									width="100%"
									itemContent={itemContent}
									computeItemKey={(_, item) => item.userId}
									style={{
										overflowX: "hidden",
										overflowY: "auto",
										height: containerHeight + "px",
										width: "100%"
									}}
								/>
							) : (
								<Flex
									width="100%"
									height="50px"
									flexDirection="column"
									justifyContent="center"
									alignItems="center"
									color={getColor(darkMode, "textSecondary")}
								>
									{i18n(lang, "noParticipantsFound")}
								</Flex>
							)}
						</Flex>
					)}
				</ModalBody>
				<ModalFooter>
					{note && (
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							cursor="pointer"
							onClick={() => eventListener.emit("openNoteAddContactModal", note)}
							_hover={{
								textDecoration: "underline"
							}}
						>
							{i18n(lang, "addNewParticipant")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default AddParticipantModal
