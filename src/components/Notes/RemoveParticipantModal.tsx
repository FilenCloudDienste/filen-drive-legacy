import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ModalCloseButton from "../ModalCloseButton"
import { Note as INote, noteParticipantsRemove } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"

export const RemoveParticipantModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [removing, setRemoving] = useState<boolean>(false)
	const openRef = useRef<boolean>(false)
	const noteRef = useRef<INote | undefined>(undefined)
	const userIdRef = useRef<number | undefined>(undefined)

	const remove = useCallback(async () => {
		if (!noteRef.current || !userIdRef.current) {
			return
		}

		setRemoving(true)

		const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

		const [err] = await safeAwait(
			noteParticipantsRemove({
				uuid: noteRef.current.uuid,
				userId: userIdRef.current
			})
		)

		if (err) {
			console.error(err)

			dismissToast(loadingToast)
			setRemoving(false)
			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)
		setRemoving(false)
		setOpen(false)

		eventListener.emit("noteParticipantRemoved", {
			note: noteRef.current,
			userId: userIdRef.current
		})
	}, [])

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

		const openRemoveNoteParticipantModalListener = eventListener.on(
			"openRemoveNoteParticipantModal",
			({ note, userId }: { note: INote; userId: number }) => {
				noteRef.current = note
				userIdRef.current = userId

				setOpen(true)
			}
		)

		return () => {
			window.removeEventListener("keydown", windowKeyDownListener)

			openRemoveNoteParticipantModalListener.remove()
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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "noteRemoveParticipant")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "noteRemoveParticipantWarning")}
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

export default RemoveParticipantModal
