import { memo, useState, useEffect, useRef, useCallback } from "react"
import { StopSharingModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { stopSharingItem } from "../../lib/api"
import { show as showToast } from "../Toast/Toast"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"

const StopSharingModal = memo(({ darkMode, isMobile, setItems, lang }: StopSharingModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const stopSharingItems = useRef<ItemProps[]>([])
	const [selected, setSelected] = useState<ItemProps[]>([])
	const isOpen = useRef<boolean>(false)

	const stopSharing = useCallback(async () => {
		if (loading) {
			return
		}

		if (stopSharingItems.current.length == 0) {
			return
		}

		setLoading(true)

		const promises = []
		const stopped: ItemProps[] = []

		for (let i = 0; i < stopSharingItems.current.length; i++) {
			const currentItem: ItemProps = stopSharingItems.current[i]
			const receivers = stopSharingItems.current[i].receivers

			if (typeof receivers !== "undefined" && Array.isArray(receivers)) {
				for (let x = 0; x < receivers.length; x++) {
					const item: ItemProps = {
						...currentItem,
						receiverId: receivers[x].id,
						receiverEmail: receivers[x].email
					}

					promises.push(
						new Promise((resolve, reject) => {
							stopSharingItem(item)
								.then(() => {
									stopped.push(item)

									return resolve(true)
								})
								.catch(err => {
									return reject({
										err: new Error(err),
										item
									})
								})
						})
					)
				}
			}
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
						"couldNotStopSharingItem",
						true,
						["__NAME__", "__ERR__"],
						[error[i].reason.item.name, error[i].reason.err.toString()]
					),
					"bottom",
					5000
				)
			}
		}

		if (stopped.length > 0) {
			const stoppedUUIDs = stopped.map(item => item.uuid)

			setItems(prev => prev.filter(item => !stoppedUUIDs.includes(item.uuid)))

			showToast(
				"success",
				i18n(lang, "stoppedSharingItems", true, ["__COUNT__"], [stopSharingItems.current.length.toString()]),
				"bottom",
				5000
			)
		}

		stopSharingItems.current = []

		setSelected([])
		setLoading(false)
		setOpen(false)
	}, [loading, stopSharingItems.current])

	const windowKeyDown = useCallback(
		(e: KeyboardEvent): void => {
			if (e.which == 13 && isOpen.current) {
				stopSharing()
			}
		},
		[isOpen.current]
	)

	useEffect(() => {
		isOpen.current = open
	}, [open])

	useEffect(() => {
		const openStopSharingModalListener = eventListener.on("openStopSharingModal", ({ items }: { items: ItemProps[] }) => {
			stopSharingItems.current = items

			setSelected(items)
			setOpen(true)
		})

		window.addEventListener("keydown", windowKeyDown)

		return () => {
			openStopSharingModalListener.remove()

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
				borderRadius={isMobile ? "0px" : "5px"}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "stopSharing")}</ModalHeader>
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
						{i18n(lang, "stopSharingModalSure", true, ["__COUNT__"], [selected.length.toString()])}
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
							onClick={() => stopSharing()}
						>
							{i18n(lang, "stopSharing")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default StopSharingModal
