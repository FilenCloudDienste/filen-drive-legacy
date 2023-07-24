import { memo, useState, useEffect } from "react"
import { Modal, ModalOverlay, ModalContent, Image, Flex } from "@chakra-ui/react"
import { getAPIV3Server } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import AppText from "../AppText"
import { getColor } from "../../styles/colors"

export type ChatPreviewType = "image"

const PreviewModal = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const [type, setType] = useState<ChatPreviewType>("image")
	const [message, setMessage] = useState<string>("")

	useEffect(() => {
		const openChatPreviewModalListener = eventListener.on(
			"openChatPreviewModal",
			({ type: t, message: m }: { type: ChatPreviewType; message: string }) => {
				setType(t)
				setMessage(m)
				setOpen(true)
			}
		)

		return () => {
			openChatPreviewModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size="full"
			autoFocus={false}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				width="100%"
				height="100%"
				backgroundColor="rgba(0, 0, 0, 0)"
				onClick={() => setOpen(false)}
			>
				{type === "image" && (
					<Flex flexDirection="column">
						<Image
							marginTop="8px"
							marginBottom="6px"
							src={getAPIV3Server() + "/v3/cors?url=" + encodeURIComponent(message)}
							borderRadius="0px"
							maxHeight="90%"
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							cursor="pointer"
							fontSize={14}
							marginTop="5px"
							onClick={e => {
								e.preventDefault()
								e.stopPropagation()

								window.open(message, "_blank")
							}}
							_hover={{
								textDecoration: "underline",
								color: getColor(darkMode, "textPrimary")
							}}
						>
							Open image
						</AppText>
					</Flex>
				)}
			</ModalContent>
		</Modal>
	)
})

export default PreviewModal
