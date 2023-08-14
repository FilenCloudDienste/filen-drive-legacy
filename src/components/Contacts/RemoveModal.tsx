import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { Contact as IContact, contactsDelete } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast } from "../Toast/Toast"

export const RemoveModal = memo(({ setContacts }: { setContacts: React.Dispatch<React.SetStateAction<IContact[]>> }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [removing, setRemoving] = useState<boolean>(false)
	const openRef = useRef<boolean>(false)
	const selectedContactRef = useRef<IContact | undefined>(undefined)
	const [selectedContact, setSelectedContact] = useState<IContact | undefined>(undefined)

	const remove = useCallback(async () => {
		if (!selectedContact || removing) {
			return
		}

		setRemoving(true)

		const [err] = await safeAwait(contactsDelete(selectedContact.uuid))

		if (err) {
			console.error(err)

			setRemoving(false)
			showToast("error", err.message, "bottom", 5000)

			return
		}

		setRemoving(false)
		setContacts(prev => prev.filter(contact => contact.uuid !== selectedContact.uuid))
		setOpen(false)
	}, [removing])

	const windowKeyDownListener = useCallback((e: KeyboardEvent) => {
		if (openRef.current && e.which === 13) {
			remove()
		}
	}, [])

	useEffect(() => {
		openRef.current = open
	}, [open])

	useEffect(() => {
		window.addEventListener("keydown", windowKeyDownListener)

		const openContactsRemoveModalListener = eventListener.on("openContactsRemoveModal", (contact: IContact) => {
			selectedContactRef.current = contact

			setSelectedContact(contact)
			setOpen(true)
		})

		return () => {
			window.removeEventListener("keydown", windowKeyDownListener)

			openContactsRemoveModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "removeUser")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "removeUserWarning", true, ["__NAME__"], [selectedContact?.email || "__NAME__"])}
					</AppText>
				</ModalBody>
				<ModalFooter>
					{removing ? (
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
							color={getColor(darkMode, "red")}
							cursor="pointer"
							_hover={{
								textDecoration: "underline"
							}}
							onClick={() => remove()}
						>
							{i18n(lang, "remove")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default RemoveModal
