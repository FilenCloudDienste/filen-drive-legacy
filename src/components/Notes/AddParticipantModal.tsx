import { memo, useState, useEffect, useCallback, useMemo } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Flex, Avatar, Badge, Tooltip } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
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

export const Contact = memo(({ contact, note }: { contact: IContact; note: INote | undefined }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [added, setAdded] = useState<boolean>(false)

	const add = useCallback(async () => {
		if (!note) {
			return
		}

		const loadingToast = showToast("loading", "Adding contact", "bottom", 864000000)

		const [publicKeyErr, publicKeyRes] = await safeAwait(getPublicKeyFromEmail(contact.email))

		if (publicKeyErr) {
			console.error(publicKeyErr)

			dismissToast(loadingToast)

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

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		setAdded(true)

		eventListener.emit("noteParticipantAddedFromContacts", {
			contact,
			note,
			metadata,
			permissionsWrite: true
		})
	}, [note, contact])

	const remove = useCallback(async () => {}, [])

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
					name={
						typeof contact.avatar === "string" && contact.avatar.indexOf("https://") !== -1
							? undefined
							: contact.email.substring(0, 1)
					}
					src={typeof contact.avatar === "string" && contact.avatar.indexOf("https://") !== -1 ? contact.avatar : undefined}
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
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					wordBreak="break-all"
					color={getColor(darkMode, "linkPrimary")}
					cursor="pointer"
					onClick={() => {
						if (added) {
							remove()

							return
						}

						add()
					}}
					_hover={{
						textDecoration: "underline"
					}}
				>
					{added ? "Remove" : "Add"}
				</AppText>
			</Flex>
		</Flex>
	)
})

export const AddContactModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [note, setNote] = useState<INote | undefined>(undefined)
	const [adding, setAdding] = useState<boolean>(false)
	const [loadingContacts, setLoadingContacts] = useState<boolean>(false)
	const [contacts, setContacts] = useState<IContact[]>([])

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

	const itemContent = useCallback(
		(index: number, contact: IContact) => {
			return (
				<Contact
					key={contact.uuid}
					contact={contact}
					note={note}
				/>
			)
		},
		[note]
	)

	useEffect(() => {
		const openNoteAddContactModalListener = eventListener.on("openNoteAddContactModal", (selectedNote: INote) => {
			setNote(selectedNote)
			setOpen(true)
			setLoadingContacts(false)
			setAdding(false)

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
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius={isMobile ? "0px" : "10px"}
				border={isMobile ? undefined : "1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>Participants</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					{note && (
						<Flex
							width="100%"
							height="300px"
							flexDirection="column"
						>
							<Virtuoso
								data={contacts}
								height={300}
								width="100%"
								itemContent={itemContent}
								totalCount={contacts.length}
								overscan={10}
								style={{
									overflowX: "hidden",
									overflowY: "auto"
								}}
							/>
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
	const [hoveringSettings, setHoveringSettings] = useState<boolean>(false)
	const [permissions, setPermissions] = useState<{ write: boolean }>({ write: participant.permissionsWrite })

	const changePermissions = useCallback(
		async (permissionsWrite: boolean) => {
			if (!note) {
				return
			}

			const loadingToast = showToast("loading", "Changing permissions", "bottom", 864000000)

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
		[participant, note]
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
					name={
						typeof participant.avatar === "string" && participant.avatar.indexOf("https://") !== -1
							? undefined
							: participant.email.substring(0, 1)
					}
					src={
						typeof participant.avatar === "string" && participant.avatar.indexOf("https://") !== -1
							? participant.avatar
							: undefined
					}
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
						Owner
					</Badge>
				)}
			</Flex>
			<Flex
				flexDirection="row"
				alignItems="center"
			>
				{permissions.write ? (
					<Tooltip
						label="User has write permissions, click to change"
						placement="top"
						borderRadius="5px"
						backgroundColor={getColor(darkMode, "backgroundTertiary")}
						boxShadow="md"
						color={getColor(darkMode, "textSecondary")}
						border={"1px solid " + getColor(darkMode, "borderPrimary")}
						hasArrow={true}
					>
						<Flex
							backgroundColor={
								hoveringSettings ? getColor(darkMode, "backgroundSecondary") : getColor(darkMode, "backgroundTertiary")
							}
							width="30px"
							height="30px"
							padding="4px"
							borderRadius="full"
							justifyContent="center"
							alignItems="center"
							onMouseEnter={() => setHoveringSettings(true)}
							onMouseLeave={() => setHoveringSettings(false)}
							onClick={() => changePermissions(false)}
							cursor="pointer"
						>
							<AiOutlineEdit
								size={20}
								color={hoveringSettings ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								cursor="pointer"
								style={{
									flexShrink: 0
								}}
							/>
						</Flex>
					</Tooltip>
				) : (
					<Tooltip
						label="User has read permissions, click to change"
						placement="top"
						borderRadius="5px"
						backgroundColor={getColor(darkMode, "backgroundTertiary")}
						boxShadow="md"
						color={getColor(darkMode, "textSecondary")}
						border={"1px solid " + getColor(darkMode, "borderPrimary")}
						hasArrow={true}
					>
						<Flex
							backgroundColor={
								hoveringSettings ? getColor(darkMode, "backgroundSecondary") : getColor(darkMode, "backgroundTertiary")
							}
							width="30px"
							height="30px"
							padding="4px"
							borderRadius="full"
							justifyContent="center"
							alignItems="center"
							onMouseEnter={() => setHoveringSettings(true)}
							onMouseLeave={() => setHoveringSettings(false)}
							onClick={() => changePermissions(true)}
							cursor="pointer"
						>
							<AiOutlineEye
								size={20}
								color={hoveringSettings ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								cursor="pointer"
								style={{
									flexShrink: 0
								}}
							/>
						</Flex>
					</Tooltip>
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

	const containerHeight = useMemo(() => {
		const itemHeight = 43
		const max = 40

		if (!note) {
			return itemHeight
		}

		const calced = Math.round(itemHeight * note.participants.length)

		if (calced > max) {
			return max
		}

		return calced
	}, [note])

	const itemContent = useCallback(
		(index: number, participant: NoteParticipant) => {
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
		const openNoteAddParticipantModalListener = eventListener.on("openNoteAddParticipantModal", (selectedNote: INote) => {
			setNote(selectedNote)
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
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius={isMobile ? "0px" : "10px"}
				border={isMobile ? undefined : "1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>Participants</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					{note && (
						<Flex
							width="100%"
							height={containerHeight + "px"}
							flexDirection="column"
						>
							<Virtuoso
								data={note.participants}
								height={containerHeight}
								width="100%"
								itemContent={itemContent}
								totalCount={note.participants.length}
								overscan={10}
								style={{
									overflowX: "hidden",
									overflowY: "auto"
								}}
							/>
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
							Add new participant
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default AddParticipantModal
