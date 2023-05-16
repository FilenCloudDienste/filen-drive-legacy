import { memo, useState, useEffect, useCallback } from "react"
import type { VersionsModalProps, ItemProps } from "../../types"
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalBody,
	Spinner,
	ModalFooter,
	ModalHeader,
	Flex,
	Menu,
	MenuButton,
	MenuList,
	MenuItem,
	forwardRef
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { restoreArchivedFile, fetchFileVersions, trashItem } from "../../lib/api"
import { decryptFileMetadata } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { FileVersionsV1 } from "../../types"
import { convertTimestampToMs, simpleDate, formatBytes } from "../../lib/helpers"
import { queueFileDownload } from "../../lib/services/download"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"

export type Version = {
	item: FileVersionsV1
	metadata: {
		name: string
		size: number
		mime: string
		key: string
		lastModified: number
	}
}

export type Versions = Version[]

const VersionsModal = memo(({ darkMode, isMobile, lang }: VersionsModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [currentItem, setCurrentItem] = useState<ItemProps | undefined>(undefined)
	const [versions, setVersions] = useState<Versions | undefined>(undefined)

	const loadVersions = useCallback(async (item: ItemProps) => {
		setVersions(undefined)

		try {
			const [result, masterKeys] = await Promise.all([fetchFileVersions(item), db.get("masterKeys")])

			const promises = []

			for (let i = 0; i < result.length; i++) {
				promises.push(
					new Promise((resolve, reject) => {
						decryptFileMetadata(result[i].metadata, masterKeys)
							.then(decrypted => {
								return resolve({
									item: result[i],
									metadata: decrypted
								})
							})
							.catch(reject)
					})
				)
			}

			const decrypted: Versions = (await Promise.all(promises)) as any

			setVersions(decrypted)
		} catch (e) {
			console.error(e)
		}
	}, [])

	const restoreVersion = useCallback(
		async (version: Version) => {
			if (typeof currentItem == "undefined") {
				return
			}

			setVersions(undefined)

			const item: ItemProps = {
				root: "",
				type: "file",
				uuid: version.item.uuid,
				name: version.metadata.name,
				size: version.metadata.size,
				mime: version.metadata.mime,
				lastModified: version.metadata.lastModified,
				lastModifiedSort: version.metadata.lastModified,
				timestamp: version.item.timestamp,
				selected: false,
				color: "default",
				parent: "base",
				rm: version.item.rm,
				version: version.item.version,
				sharerEmail: "",
				sharerId: 0,
				receiverEmail: "",
				receiverId: 0,
				writeAccess: false,
				chunks: version.item.chunks,
				favorited: 0,
				key: version.metadata.key,
				bucket: version.item.bucket,
				region: version.item.region
			}

			try {
				await restoreArchivedFile({ uuid: currentItem.uuid, currentUUID: version.item.uuid })

				setCurrentItem(prev => {
					if (typeof prev == "undefined") {
						return item
					}

					return {
						...prev,
						uuid: version.item.uuid
					}
				})
			} catch (e) {
				console.error(e)
			}

			loadVersions(currentItem)
		},
		[currentItem]
	)

	const deleteVersion = useCallback(
		async (version: Version) => {
			if (typeof currentItem == "undefined") {
				return
			}

			setVersions(undefined)

			const item: ItemProps = {
				root: "",
				type: "file",
				uuid: version.item.uuid,
				name: version.metadata.name,
				size: version.metadata.size,
				mime: version.metadata.mime,
				lastModified: version.metadata.lastModified,
				lastModifiedSort: version.metadata.lastModified,
				timestamp: version.item.timestamp,
				selected: false,
				color: "default",
				parent: "base",
				rm: version.item.rm,
				version: version.item.version,
				sharerEmail: "",
				sharerId: 0,
				receiverEmail: "",
				receiverId: 0,
				writeAccess: false,
				chunks: version.item.chunks,
				favorited: 0,
				key: version.metadata.key,
				bucket: version.item.bucket,
				region: version.item.region
			}

			try {
				await trashItem(item)
			} catch (e) {
				console.error(e)
			}

			loadVersions(currentItem)
		},
		[currentItem]
	)

	const downloadVersion = useCallback((version: Version) => {
		const item: ItemProps = {
			root: "",
			type: "file",
			uuid: version.item.uuid,
			name: version.metadata.name,
			size: version.metadata.size,
			mime: version.metadata.mime,
			lastModified: version.metadata.lastModified,
			lastModifiedSort: version.metadata.lastModified,
			timestamp: version.item.timestamp,
			selected: false,
			color: "default",
			parent: "base",
			rm: version.item.rm,
			version: version.item.version,
			sharerEmail: "",
			sharerId: 0,
			receiverEmail: "",
			receiverId: 0,
			writeAccess: false,
			chunks: version.item.chunks,
			favorited: 0,
			key: version.metadata.key,
			bucket: version.item.bucket,
			region: version.item.region
		}

		queueFileDownload(item).catch(console.error)
	}, [])

	useEffect(() => {
		const openVersionsModalListener = eventListener.on("openVersionsModal", ({ item }: { item: ItemProps }) => {
			setCurrentItem(item)
			loadVersions(item)
			setOpen(true)
		})

		return () => {
			openVersionsModalListener.remove()
		}
	}, [])

	if (typeof currentItem == "undefined") {
		return null
	}

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "xl"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius={isMobile ? "0px" : "5px"}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "versions")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					width="100%"
					alignItems="center"
					justifyContent="center"
					maxHeight={isMobile ? (document.documentElement.clientHeight || window.innerHeight) - 100 + "px" : "500px"}
					overflowY="auto"
				>
					{typeof versions == "undefined" ? (
						<Spinner
							width="32px"
							height="32px"
							color={getColor(darkMode, "textPrimary")}
						/>
					) : (
						versions.map((version, index) => {
							return (
								<Menu key={version.item.uuid}>
									<MenuButton
										as={forwardRef((props, ref) => (
											<Flex
												ref={ref}
												marginTop={index > 0 ? "10px" : "0px"}
												alignItems="center"
												justifyContent="space-between"
												padding="10px"
												borderRadius="10px"
												backgroundColor={getColor(darkMode, "backgroundTertiary")}
												boxShadow="sm"
												cursor="pointer"
												_hover={{
													backgroundColor: getColor(darkMode, "backgroundPrimary")
												}}
												{...props}
											>
												<Flex
													width="70%"
													justifyContent="flex-start"
													alignItems="center"
												>
													{currentItem.uuid == version.item.uuid && (
														<AppText
															darkMode={darkMode}
															isMobile={isMobile}
															noOfLines={1}
															fontSize={16}
															wordBreak="break-all"
															color={getColor(darkMode, "textSecondary")}
															marginRight="10px"
															textDecoration="underline"
														>
															{i18n(lang, "current")}
														</AppText>
													)}
													<AppText
														darkMode={darkMode}
														isMobile={isMobile}
														noOfLines={1}
														fontSize={14}
														wordBreak="break-all"
														color={getColor(darkMode, "textSecondary")}
													>
														{simpleDate(convertTimestampToMs(version.item.timestamp))}
													</AppText>
												</Flex>
												<Flex
													width="auto"
													justifyContent="flex-end"
													alignItems="center"
												>
													<Flex
														width="auto"
														height="auto"
														padding="3px"
														paddingLeft="8px"
														paddingRight="8px"
														backgroundColor={darkMode ? "white" : "gray"}
														borderRadius="20px"
													>
														<AppText
															darkMode={darkMode}
															isMobile={isMobile}
															noOfLines={1}
															fontSize={14}
															wordBreak="break-all"
															color={darkMode ? "black" : "black"}
														>
															{formatBytes(version.metadata.size)}
														</AppText>
													</Flex>
												</Flex>
											</Flex>
										))}
									>
										{i18n(lang, "versions")}
									</MenuButton>
									<MenuList
										boxShadow="2xl"
										paddingTop="5px"
										paddingBottom="5px"
										backgroundColor={getColor(darkMode, "backgroundPrimary")}
										borderColor={getColor(darkMode, "borderPrimary")}
										minWidth="150px"
									>
										{currentItem.uuid !== version.item.uuid && (
											<MenuItem
												height="auto"
												fontSize={14}
												paddingTop="5px"
												paddingBottom="5px"
												backgroundColor={getColor(darkMode, "backgroundPrimary")}
												color={getColor(darkMode, "textPrimary")}
												_hover={{
													backgroundColor: getColor(darkMode, "backgroundSecondary")
												}}
												_active={{
													backgroundColor: getColor(darkMode, "backgroundSecondary")
												}}
												_focus={{
													backgroundColor: getColor(darkMode, "backgroundSecondary")
												}}
												onClick={() => restoreVersion(version)}
											>
												{i18n(lang, "restore")}
											</MenuItem>
										)}
										<MenuItem
											height="auto"
											fontSize={14}
											paddingTop="5px"
											paddingBottom="5px"
											backgroundColor={getColor(darkMode, "backgroundPrimary")}
											color={getColor(darkMode, "textPrimary")}
											_hover={{
												backgroundColor: getColor(darkMode, "backgroundSecondary")
											}}
											_active={{
												backgroundColor: getColor(darkMode, "backgroundSecondary")
											}}
											_focus={{
												backgroundColor: getColor(darkMode, "backgroundSecondary")
											}}
											onClick={() => downloadVersion(version)}
										>
											{i18n(lang, "download")}
										</MenuItem>
										{currentItem.uuid !== version.item.uuid && (
											<MenuItem
												height="auto"
												fontSize={14}
												paddingTop="5px"
												paddingBottom="5px"
												backgroundColor={getColor(darkMode, "backgroundPrimary")}
												color="red.500"
												_hover={{
													backgroundColor: getColor(darkMode, "backgroundSecondary")
												}}
												_active={{
													backgroundColor: getColor(darkMode, "backgroundSecondary")
												}}
												_focus={{
													backgroundColor: getColor(darkMode, "backgroundSecondary")
												}}
												onClick={() => deleteVersion(version)}
											>
												{i18n(lang, "delete")}
											</MenuItem>
										)}
									</MenuList>
								</Menu>
							)
						})
					)}
				</ModalBody>
				<ModalFooter />
			</ModalContent>
		</Modal>
	)
})

export default VersionsModal
