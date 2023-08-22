import { memo, useState, useEffect, useCallback } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { contactsRequestsSend } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import Input from "../Input"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { show as showToast } from "../Toast/Toast"

export const AddContactModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [email, setEmail] = useState<string>("")
	const [loading, setLoading] = useState<boolean>(false)

	const add = useCallback(async () => {
		const to = email.trim()

		if (!to || to.length === 0) {
			return
		}

		setLoading(true)

		const [err] = await safeAwait(contactsRequestsSend(to))

		setLoading(false)
		setEmail("")

		if (err) {
			console.error(err)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		showToast("success", i18n(lang, "contactRequestSent"), "bottom", 5000)
	}, [email, lang])

	useEffect(() => {
		const openAddContactModalListener = eventListener.on("openAddContactModal", () => {
			setEmail("")
			setLoading(false)
			setOpen(true)
		})

		return () => {
			openAddContactModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "md"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "addContact")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					<Input
						darkMode={darkMode}
						isMobile={isMobile}
						value={email}
						placeholder={i18n(lang, "addContactEmail")}
						autoFocus={true}
						onChange={e => setEmail(e.target.value)}
						color={getColor(darkMode, "textSecondary")}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
						onKeyDown={e => {
							if (e.which == 13) {
								add()
							}
						}}
					/>
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
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default AddContactModal
