import { memo, useState, useEffect, useRef, useCallback } from "react"
import { ShareModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { shareItemsToUser, getPublicKeyFromEmail } from "../../lib/api"
import { show as showToast, dismiss as dismissToast, update as updateToast } from "../Toast/Toast"
import Input from "../Input"
import { ONE_YEAR } from "../../lib/constants"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"

const ShareModal = memo(({ darkMode, isMobile, lang }: ShareModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const toShare = useRef<ItemProps[]>([])
	const [email, setEmail] = useState<string>("")
	const inputRef = useRef()

	const share = useCallback(async () => {
		if (loading) {
			return
		}

		if (toShare.current.length == 0) {
			return
		}

		const userEmail = email.trim()

		if (!userEmail) {
			return
		}

		setLoading(true)

		const loadingToast = showToast("loading", i18n(lang, "sharingItems"), "bottom", ONE_YEAR)

		try {
			const publicKey: string = await getPublicKeyFromEmail(userEmail)

			await shareItemsToUser({
				items: toShare.current,
				email: userEmail,
				publicKey,
				progressCallback: (current, total) => {
					const left: number = total - current

					if (left <= 0) {
						return
					}

					updateToast(
						loadingToast,
						"loading",
						i18n(lang, "sharingItemsProgress", true, ["__LEFT__"], [left.toString()]),
						ONE_YEAR
					)
				}
			})

			showToast(
				"success",
				i18n(lang, "itemsSharedWith", true, ["__COUNT__", "__EMAIL__"], [toShare.current.length.toString(), userEmail]),
				"bottom",
				5000
			)
		} catch (e: any) {
			console.error(e)

			showToast("error", e.toString(), "bottom", 5000)
		}

		dismissToast(loadingToast)

		toShare.current = []

		setLoading(false)
		setOpen(false)
		setEmail("")
	}, [loading, toShare.current, email])

	useEffect(() => {
		const openShareModalListener = eventListener.on("openShareModal", ({ items }: { items: ItemProps[] }) => {
			const url = window.location.href

			if (
				url.indexOf("notes") !== -1 ||
				url.indexOf("contacts") !== -1 ||
				url.indexOf("chats") !== -1 ||
				url.indexOf("account") !== -1
			) {
				return
			}

			toShare.current = items

			if (items.length === 0) {
				return
			}

			setOpen(true)
		})

		return () => {
			openShareModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "share")}</ModalHeader>
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
						placeholder={i18n(lang, "shareReceiver")}
						autoFocus={true}
						onChange={e => setEmail(e.target.value.trim())}
						isDisabled={loading}
						ref={inputRef}
						onKeyDown={e => {
							if (e.which == 13) {
								share()
							}
						}}
						paddingLeft="10px"
						paddingRight="10px"
						shadow="none"
						outline="none"
						border="none"
						borderRadius="10px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textPrimary")}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
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
							onClick={() => share()}
							_hover={{
								textDecoration: "underline"
							}}
						>
							{i18n(lang, "share")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default ShareModal
