import { memo, useState, useEffect } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import { AiOutlineExclamationCircle } from "react-icons/ai"
import { useNavigate } from "react-router-dom"
import ModalCloseButton from "../ModalCloseButton"

const MaxStorageModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	const [open, setOpen] = useState<boolean>(false)
	const navigate = useNavigate()

	useEffect(() => {
		const openMaxStorageModalListener = eventListener.on("openMaxStorageModal", () => {
			setOpen(true)
		})

		return () => {
			openMaxStorageModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "md"}
			autoFocus={false}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "maxStorageReached")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					justifyContent="center"
					alignItems="center"
					paddingBottom="25px"
				>
					<Flex
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
					>
						<AiOutlineExclamationCircle
							color={getColor(darkMode, "textPrimary")}
							fontSize={100}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							marginTop="20px"
							textAlign="center"
							fontSize={14}
						>
							{i18n(lang, "maxStorageReachedInfo")}
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "linkPrimary")}
							marginTop="20px"
							textAlign="center"
							fontSize={14}
							cursor="pointer"
							_hover={{
								textDecoration: "underline"
							}}
							onClick={() => {
								setOpen(false)

								navigate("/#/account/plans")
							}}
						>
							{i18n(lang, "upgradeNow")}
						</AppText>
					</Flex>
				</ModalBody>
				<ModalFooter>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						cursor="pointer"
						onClick={() => setOpen(false)}
						_hover={{
							color: getColor(darkMode, "textPrimary"),
							textDecoration: "underline"
						}}
					>
						{i18n(lang, "close")}
					</AppText>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default MaxStorageModal
