import { memo, useState, useEffect, useRef, useCallback } from "react"
import { RemoveSharedInModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { removeSharedInItem } from "../../lib/api"
import { show as showToast } from "../Toast/Toast"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"

const RemoveSharedInModal = memo(({ darkMode, isMobile, setItems, lang }: RemoveSharedInModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const removeSharedInItems = useRef<ItemProps[]>([])
	const [selected, setSelected] = useState<ItemProps[]>([])
	const isOpen = useRef<boolean>(false)

	const removeSharedIn = useCallback(async () => {
		if (loading) {
			return
		}

		if (removeSharedInItems.current.length == 0) {
			return
		}

		setLoading(true)

		const promises = []
		const removed: ItemProps[] = []

		for (let i = 0; i < removeSharedInItems.current.length; i++) {
			promises.push(
				new Promise((resolve, reject) => {
					removeSharedInItem(removeSharedInItems.current[i])
						.then(() => {
							removed.push(removeSharedInItems.current[i])

							return resolve(true)
						})
						.catch(err => {
							return reject({
								err: new Error(err),
								item: removeSharedInItems.current[i]
							})
						})
				})
			)
		}

		const results = await Promise.allSettled(promises)
		const error = results.filter(result => result.status == "rejected") as {
			status: string
			reason: { err: Error; item: ItemProps }
		}[]

		if (error.length > 0) {
			for (let i = 0; i < error.length; i++) {
				showToast(
					"error",
					i18n(
						lang,
						"couldNotRemoveSharedItems",
						true,
						["__NAME__", "__ERR__"],
						[error[i].reason.item.name, error[i].reason.err.toString()]
					),
					"bottom",
					5000
				)
			}
		}

		if (removed.length > 0) {
			const removedUUIDs = removed.map(item => item.uuid)

			setItems(prev => prev.filter(item => !removedUUIDs.includes(item.uuid)))

			showToast(
				"success",
				i18n(lang, "removedSharedItems", true, ["__COUNT__"], [removeSharedInItems.current.length.toString()]),
				"bottom",
				5000
			)
		}

		removeSharedInItems.current = []

		setSelected([])
		setLoading(false)
		setOpen(false)
	}, [loading, removeSharedInItems.current])

	const windowKeyDown = useCallback(
		(e: KeyboardEvent): void => {
			if (e.which == 13 && isOpen.current) {
				removeSharedIn()
			}
		},
		[isOpen.current]
	)

	useEffect(() => {
		isOpen.current = open
	}, [open])

	useEffect(() => {
		const openRemoveSharedInModalListener = eventListener.on("openRemoveSharedInModal", ({ items }: { items: ItemProps[] }) => {
			removeSharedInItems.current = items

			setSelected(items)
			setOpen(true)
		})

		window.addEventListener("keydown", windowKeyDown)

		return () => {
			openRemoveSharedInModalListener.remove()

			window.removeEventListener("keydown", windowKeyDown)
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "remove")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "removeSharedItemsModalInfo", true, ["__COUNT__"], [selected.length.toString()])}
					</AppText>
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
							onClick={() => removeSharedIn()}
							_hover={{
								textDecoration: "underline"
							}}
						>
							{i18n(lang, "remove")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default RemoveSharedInModal
