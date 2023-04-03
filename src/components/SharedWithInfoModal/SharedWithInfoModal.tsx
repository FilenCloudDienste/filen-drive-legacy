import { memo, useState, useEffect, useCallback } from "react"
import type { ItemProps, ItemReceiver } from "../../types"
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalBody,
	ModalCloseButton,
	ModalFooter,
	ModalHeader,
	Flex,
	Spinner
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { stopSharingItem } from "../../lib/api"
import { show as showToast } from "../Toast/Toast"
import { i18n } from "../../i18n"

const SharedWithInfoModal = memo(
	({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
		const [open, setOpen] = useState<boolean>(false)
		const [item, setItem] = useState<ItemProps | undefined>(undefined)
		const [loading, setLoading] = useState<number>(0)

		const stopSharing = useCallback(async (stopItem: ItemProps, user: ItemReceiver) => {
			const sItem: ItemProps = {
				...stopItem,
				receiverId: user.id,
				receiverEmail: user.email
			}

			setLoading(user.id)

			try {
				await stopSharingItem(sItem)

				setItem(prev => {
					if (
						typeof prev !== "undefined" &&
						typeof prev.receivers !== "undefined" &&
						Array.isArray(prev.receivers)
					) {
						for (let i = 0; i < prev.receivers.length; i++) {
							if (prev.receivers[i].id == user.id) {
								prev.receivers.splice(i, 1)

								i--
							}
						}

						if (prev.receivers.length <= 0) {
							setOpen(false)
						}

						eventListener.emit("updateItem", {
							uuid: prev.uuid,
							updated: prev
						})

						return prev
					}

					return prev
				})
			} catch (e: any) {
				console.error(e)

				showToast("error", e.toString(), "bottom", 5000)
			}

			setLoading(0)
		}, [])

		useEffect(() => {
			const openSharedWithInfoModalListener = eventListener.on("openSharedWithInfoModal", (passed: ItemProps) => {
				setItem(passed)
				setOpen(true)
			})

			return () => {
				openSharedWithInfoModalListener.remove()
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
					<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "sharedWith")}</ModalHeader>
					<ModalCloseButton
						color={getColor(darkMode, "textSecondary")}
						backgroundColor={getColor(darkMode, "backgroundTertiary")}
						_hover={{
							color: getColor(darkMode, "textPrimary"),
							backgroundColor: getColor(darkMode, "backgroundPrimary")
						}}
						autoFocus={false}
						tabIndex={-1}
						borderRadius="full"
					/>
					<ModalBody
						height="100%"
						width="100%"
						alignItems="center"
						justifyContent="center"
					>
						{typeof item !== "undefined" && Array.isArray(item.receivers) && (
							<>
								{item.receivers.map(user => {
									return (
										<Flex
											key={user.id}
											width="100%"
											padding="10px"
											paddingLeft="15px"
											paddingRight="15px"
											borderRadius="10px"
											backgroundColor={getColor(darkMode, "backgroundTertiary")}
											boxShadow="sm"
											flexDirection="row"
											justifyContent="space-between"
											marginBottom="8px"
										>
											<AppText
												darkMode={darkMode}
												isMobile={isMobile}
												color={getColor(darkMode, "textPrimary")}
												noOfLines={1}
												wordBreak="break-all"
												maxWidth="75%"
											>
												{user.email}
											</AppText>
											<AppText
												darkMode={darkMode}
												isMobile={isMobile}
												color={getColor(darkMode, "textSecondary")}
												noOfLines={1}
												wordBreak="break-all"
												cursor={loading ? "not-allowed" : "pointer"}
												_hover={{
													color: getColor(darkMode, "textPrimary")
												}}
												onClick={() => {
													if (loading) {
														return
													}

													stopSharing(item, user)
												}}
											>
												{loading == user.id ? (
													<Spinner
														width="16px"
														height="16px"
													/>
												) : (
													i18n(lang, "remove")
												)}
											</AppText>
										</Flex>
									)
								})}
							</>
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
	}
)

export default SharedWithInfoModal
