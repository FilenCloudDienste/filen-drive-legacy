import { memo, useState, useEffect, useRef, useCallback } from "react"
import { DeletePermanentlyModalProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import db from "../../lib/db"
import { show as showToast } from "../Toast/Toast"
import { emptyTrash } from "../../lib/api"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"

const EmptryTrashModal = memo(({ darkMode, isMobile, setItems, lang }: DeletePermanentlyModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const isOpen = useRef<boolean>(false)

	const empty = useCallback(async () => {
		if (loading) {
			return
		}

		setLoading(true)

		try {
			await emptyTrash()

			await Promise.all([db.remove("loadItems:trash"), db.remove("loadSidebarItems:trash")])

			showToast("success", i18n(lang, "emptyTrashSuccess"), "bottom", 5000)

			if (window.location.href.indexOf("trash") !== -1) {
				setItems([])
			}

			setOpen(false)
		} catch (e: any) {
			console.error(e)

			showToast("error", e.toString(), "bottom", 5000)
		}

		setLoading(false)
	}, [loading, window.location.href])

	const windowKeyDown = useCallback(
		(e: KeyboardEvent): void => {
			if (e.which == 13 && window.location.hash.indexOf("trash") !== -1 && isOpen.current) {
				empty()
			}
		},
		[window.location.hash, isOpen.current]
	)

	useEffect(() => {
		isOpen.current = open
	}, [open])

	useEffect(() => {
		const openEmptyTrashModalListener = eventListener.on("openEmptyTrashModal", () => {
			setOpen(true)
		})

		window.addEventListener("keydown", windowKeyDown)

		return () => {
			openEmptyTrashModalListener.remove()

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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "emptyTrash")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					{i18n(lang, "emptyTrashModalSure")}
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
							color="red.500"
							cursor="pointer"
							onClick={() => empty()}
						>
							{i18n(lang, "delete")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default EmptryTrashModal
