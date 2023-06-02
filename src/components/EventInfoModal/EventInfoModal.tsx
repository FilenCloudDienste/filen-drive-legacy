import { memo, useState, useEffect, useCallback } from "react"
import { EventInfoModalProps, UserEvent } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { fetchEventInfo } from "../../lib/api"
import { getEventText } from "../../lib/services/events"
import db from "../../lib/db"
import { simpleDate, convertTimestampToMs } from "../../lib/helpers"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"

export interface EventInfo {
	event: UserEvent
	text: string
}

const EventInfoModal = memo(({ darkMode, isMobile, windowHeight, windowWidth, lang }: EventInfoModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const [eventInfo, setEventInfo] = useState<EventInfo | undefined>(undefined)

	const fetchInfo = useCallback(
		(uuid: string) => {
			if (loading) {
				return
			}

			setLoading(true)

			fetchEventInfo(uuid)
				.then(info => {
					setLoading(false)

					db.get("masterKeys").then(masterKeys => {
						if (!Array.isArray(masterKeys)) {
							masterKeys = []
						}

						getEventText({
							item: info,
							masterKeys,
							lang
						})
							.then(text => {
								setEventInfo({
									event: info,
									text
								})
							})
							.catch(console.error)
					})
				})
				.catch(err => {
					console.error(err)

					setLoading(false)
				})
		},
		[loading]
	)

	useEffect(() => {
		const openEventInfoModalListener = eventListener.on("openEventInfoModal", (uuid: string) => {
			setEventInfo(undefined)
			fetchInfo(uuid)
			setOpen(true)
		})

		return () => {
			openEventInfoModalListener.remove()
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
				borderRadius={isMobile ? "0px" : "5px"}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "event")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
				>
					{loading ? (
						<Flex
							height="100%"
							width="100%"
							alignItems="center"
							justifyContent="center"
						>
							<Spinner
								width="32px"
								height="32px"
								color={getColor(darkMode, "textPrimary")}
							/>
						</Flex>
					) : (
						<Flex flexDirection="column">
							<Flex
								width="100%"
								padding="10px"
								paddingLeft="15px"
								paddingRight="15px"
								borderRadius="10px"
								backgroundColor={getColor(darkMode, "backgroundTertiary")}
								boxShadow="sm"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									color={getColor(darkMode, "textPrimary")}
									wordBreak="break-all"
								>
									{eventInfo?.text}
								</AppText>
							</Flex>
							<Flex
								width="100%"
								padding="10px"
								paddingLeft="15px"
								paddingRight="15px"
								borderRadius="10px"
								backgroundColor={getColor(darkMode, "backgroundTertiary")}
								boxShadow="sm"
								flexDirection="row"
								justifyContent="space-between"
								marginTop="8px"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									color={getColor(darkMode, "textPrimary")}
									noOfLines={1}
									wordBreak="break-all"
								>
									{i18n(lang, "date")}
								</AppText>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									color={getColor(darkMode, "textSecondary")}
									noOfLines={1}
									wordBreak="break-all"
								>
									{simpleDate(convertTimestampToMs(eventInfo?.event.timestamp as number))}
								</AppText>
							</Flex>
							<Flex
								width="100%"
								padding="10px"
								paddingLeft="15px"
								paddingRight="15px"
								borderRadius="10px"
								backgroundColor={getColor(darkMode, "backgroundTertiary")}
								boxShadow="sm"
								flexDirection="row"
								justifyContent="space-between"
								marginTop="8px"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									color={getColor(darkMode, "textPrimary")}
									noOfLines={1}
									wordBreak="break-all"
								>
									{i18n(lang, "ipAddress")}
								</AppText>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									color={getColor(darkMode, "textSecondary")}
									noOfLines={1}
									wordBreak="break-all"
								>
									{eventInfo?.event.info.ip}
								</AppText>
							</Flex>
							<Flex
								width="100%"
								padding="10px"
								paddingLeft="15px"
								paddingRight="15px"
								borderRadius="10px"
								backgroundColor={getColor(darkMode, "backgroundTertiary")}
								boxShadow="sm"
								flexDirection="row"
								justifyContent="space-between"
								marginTop="8px"
							>
								{eventInfo?.event.info.userAgent.indexOf("filen-mobile") !== -1 && (
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										color={getColor(darkMode, "linkPrimary")}
										_hover={{
											textDecoration: "underline"
										}}
										cursor="pointer"
										onClick={() => window.open("https://filen.io/apps/mobile", "_blank")}
									>
										Filen Mobile
									</AppText>
								)}
								{eventInfo?.event.info.userAgent.indexOf("filen-desktop") !== -1 && (
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										color={getColor(darkMode, "linkPrimary")}
										_hover={{
											textDecoration: "underline"
										}}
										cursor="pointer"
										onClick={() => window.open("https://filen.io/apps/desktop", "_blank")}
									>
										Filen Desktop
									</AppText>
								)}
								{eventInfo?.event.info.userAgent.indexOf("filen-mobile") == -1 &&
									eventInfo?.event.info.userAgent.indexOf("filen-desktop") == -1 && (
										<AppText
											darkMode={darkMode}
											isMobile={isMobile}
											color={getColor(darkMode, "linkPrimary")}
										>
											{eventInfo?.event.info.userAgent}
										</AppText>
									)}
							</Flex>
						</Flex>
					)}
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
							color: getColor(darkMode, "textPrimary")
						}}
					>
						{i18n(lang, "close")}
					</AppText>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default EventInfoModal
