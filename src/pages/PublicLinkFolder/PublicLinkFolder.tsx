import { memo, useCallback, useEffect, useRef, useState, useMemo } from "react"
import type { AppBaseProps, LinkDirInfoV1, ItemProps, DragSelectState } from "../../types"
import { useParams } from "react-router-dom"
import { validate as validateUUID } from "uuid"
import InvalidLink from "../../components/PublicLink/InvalidLink"
import { folderLinkInfo, folderLinkContents } from "../../lib/api"
import { Flex, Spinner, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import Input from "../../components/Input"
import Container from "../../components/PublicLink/Container"
import { decryptMetadata } from "../../lib/worker/worker.com"
import Button from "../../components/Button"
import { show as showToast, dismiss as dismissToast } from "../../components/Toast/Toast"
import LogoAnimated from "../../assets/images/logo_animated.gif"
import Cookies from "../../lib/cookies"
import eventListener from "../../lib/eventListener"
import FolderContainer from "../../components/PublicLink/FolderContainer"
import { getCurrentParent, orderItemsByType, getDragSelectCoords, getDragSelectCollisions } from "../../lib/helpers"
import { AutoSizer } from "react-virtualized"
import striptags from "striptags"
import { hashFn, deriveKeyFromPassword } from "../../lib/worker/worker.com"
import ContextMenus from "../../components/ContextMenus"
import { contextMenu } from "react-contexify"
import memoryCache from "../../lib/memoryCache"
import { throttle } from "lodash"
import DragSelect from "../../components/DragSelect"
import PreviewModal from "../../components/PreviewModal"
import { IoChevronForward } from "react-icons/io5"
import AppText from "../../components/AppText"
import { getDirectoryTree } from "../../lib/services/items"
import { downloadMultipleFilesAsZipStream } from "../../lib/services/download"
import AbuseReportModal from "../../components/AbuseReportModal"
import { i18n } from "../../i18n"
import PublicLinkFolderList from "./PublicLinkFolderList"

const cache = new Map()

const PublicLinkFolder = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
	const params = useParams()
	const key = useRef<string>(window.location.hash.split("#").join("").split("!").join("")).current
	const [info, setInfo] = useState<LinkDirInfoV1 | undefined>(undefined)
	const [needsPassword, setNeedsPassword] = useState<boolean>(false)
	const [password, setPassword] = useState<string>("")
	const [notFound, setNotFound] = useState<boolean>(false)
	const downloadTimeout = useRef<number>(0)
	const [loadingPassword, setLoadingPassword] = useState<boolean>(false)
	const [passwordCorrect, setPasswordCorrect] = useState<boolean>(false)
	const [folderName, setFolderName] = useState<string>("")
	const [url, setURL] = useState<string>("")
	const [items, setItems] = useState<ItemProps[]>([])
	const [loadingItems, setLoadingItems] = useState<boolean>(true)
	const [dragSelectState, setDragSelectState] = useState<DragSelectState>({
		start: { clientX: 0, clientY: 0 },
		current: { clientX: 0, clientY: 0 }
	})
	const dragSelectStart = useRef({ clientX: 0, clientY: 0 })
	const isDragSelecting = useRef<boolean>(false)
	const dragSelectDidCollideOnce = useRef<boolean>(false)
	const hideContextMenusWhileDragSelecting = useRef<boolean>(false)
	const lastDragSelectCollisions = useRef<(string | null)[]>([])
	const [folderNames, setFolderNames] = useState<{ [key: string]: string }>({})
	const [viewMode, setViewMode] = useState<"list" | "grid">("list")

	const [previewContainerWidth, previewContainerHeight] = useMemo(() => {
		if (isMobile) {
			return [windowWidth, windowHeight]
		}
		return [(windowWidth - 400) / 1.15, windowHeight / 1.35]
	}, [windowWidth, windowHeight, isMobile])

	const toggleColorMode = useCallback((): void => {
		Cookies.set("colorMode", darkMode ? "light" : "dark")

		eventListener.emit("colorModeChanged", !darkMode)
	}, [darkMode])

	const fetchInfo = useCallback(() => {
		if (typeof params.uuid == "string" && typeof key == "string") {
			if (validateUUID(params.uuid) && key.length == 32) {
				folderLinkInfo(params.uuid as string)
					.then(async linkInfo => {
						setInfo(linkInfo)
						setNeedsPassword(linkInfo.hasPassword)

						try {
							const meta = JSON.parse(await decryptMetadata(linkInfo.metadata, key))

							if (typeof meta == "object") {
								if (typeof meta.name == "string") {
									setFolderName(meta.name)
									setURL(linkInfo.parent)
								}
							}
						} catch (e) {
							console.error(e)

							setInfo(undefined)
							setNotFound(true)
						}
					})
					.catch(err => {
						console.error(err)

						setInfo(undefined)
						setNotFound(true)
					})
			}
		}
	}, [params, key])

	const downloadFolder = useCallback(
		async (loadCallback: any) => {
			if (downloadTimeout.current > new Date().getTime()) {
				loadCallback(true)

				return
			}

			if (typeof info == "undefined") {
				loadCallback(true)

				return
			}

			if (!validateUUID(info.parent) || typeof params.uuid !== "string" || !validateUUID(params.uuid)) {
				loadCallback(true)

				return
			}

			downloadTimeout.current = new Date().getTime() + 2500

			const zipItems: ItemProps[] = []
			const paths: { [key: string]: string } = {}
			const pathExists: { [key: string]: boolean } = {}

			const folderItems = await getDirectoryTree(
				info.parent,
				"linked",
				params.uuid,
				info.hasPassword,
				password,
				info.salt,
				key
			)

			for (let i = 0; i < folderItems.length; i++) {
				if (folderItems[i].item.type == "file" && typeof pathExists[folderItems[i].path] == "undefined") {
					pathExists[folderItems[i].path] = true
					paths[folderItems[i].item.uuid] = folderItems[i].path

					zipItems.push(folderItems[i].item)
				}
			}

			if (zipItems.length <= 0) {
				loadCallback(true)

				showToast("error", i18n(lang, "cannotDownloadEmptyFolder"), "bottom", 3000)

				return
			}

			downloadMultipleFilesAsZipStream(zipItems, paths).catch(console.error)

			loadCallback(true)
		},
		[info, downloadTimeout.current, params, password, key]
	)

	const fetchContents = useCallback(async () => {
		if (url.length > 0) {
			if (cache.has(url)) {
				setItems(cache.get(url))
			}

			const parent: string = getCurrentParent(url)

			if (
				validateUUID(parent) &&
				typeof params.uuid == "string" &&
				validateUUID(params.uuid) &&
				typeof info !== "undefined"
			) {
				const getContents = async () => {
					if (!cache.has(url)) {
						setLoadingItems(true)
					}

					folderLinkContents(
						params.uuid as string,
						parent,
						info.hasPassword
							? info.salt.length == 32
								? ((await deriveKeyFromPassword(
										password,
										info.salt,
										200000,
										"SHA-512",
										512,
										true
								  )) as string)
								: await hashFn(password.length == 0 ? "empty" : password)
							: await hashFn("empty")
					)
						.then(async content => {
							setPasswordCorrect(true)

							setFolderNames(prev => ({
								...prev,
								[info.parent]: striptags(folderName)
							}))

							try {
								const folders = content.folders
								const files = content.files
								const fetchedItems: ItemProps[] = []

								for (let i = 0; i < folders.length; i++) {
									const folder = folders[i]
									const decrypted = JSON.parse(await decryptMetadata(folder.metadata, key))

									if (typeof decrypted == "object") {
										if (typeof decrypted.name == "string") {
											if (decrypted.name.length > 0) {
												setFolderNames(prev => ({
													...prev,
													[folder.uuid]: striptags(decrypted.name)
												}))

												fetchedItems.push({
													type: "folder",
													parent: folder.parent,
													uuid: folder.uuid,
													name: striptags(decrypted.name),
													size: 0,
													mime: "Folder",
													lastModified: 0,
													lastModifiedSort: folder.timestamp,
													timestamp: folder.timestamp,
													selected: false,
													color: folder.color,
													sharerEmail: "",
													sharerId: 0,
													receiverEmail: "",
													receiverId: 0,
													version: 0,
													rm: "",
													favorited: 0,
													chunks: 0,
													writeAccess: false,
													root: url,
													key: "",
													bucket: "",
													region: "",
													linkUUID: params.uuid,
													linkHasPassword: info.hasPassword,
													linkPassword: password,
													linkSalt: info.salt,
													linkKey: key
												})
											}
										}
									}
								}

								for (let i = 0; i < files.length; i++) {
									const file = files[i]
									const decrypted = JSON.parse(await decryptMetadata(file.metadata, key))

									if (typeof decrypted == "object") {
										if (typeof decrypted.name == "string") {
											if (decrypted.name.length > 0) {
												const fileMetadata: any = decrypted

												fileMetadata.name = striptags(fileMetadata.name)

												const lastModified =
													typeof fileMetadata.lastModified == "number" &&
													!isNaN(fileMetadata.lastModified) &&
													fileMetadata.lastModified > 13000000
														? fileMetadata.lastModified
														: file.timestamp

												if (typeof fileMetadata.name == "string") {
													if (fileMetadata.name.length > 0) {
														fetchedItems.push({
															type: "file",
															parent: file.parent,
															uuid: file.uuid,
															name: fileMetadata.name,
															size: parseInt(striptags(fileMetadata.size.toString())),
															mime: striptags(fileMetadata.mime),
															lastModified,
															lastModifiedSort: lastModified,
															timestamp: file.timestamp,
															selected: false,
															color: "default",
															sharerEmail: "",
															sharerId: 0,
															receiverEmail: "",
															receiverId: 0,
															version: file.version,
															rm: "",
															favorited: 0,
															chunks: file.chunks,
															writeAccess: false,
															root: url,
															key: striptags(fileMetadata.key),
															bucket: file.bucket,
															region: file.region,
															linkUUID: params.uuid,
															linkHasPassword: info.hasPassword,
															linkPassword: password,
															linkSalt: info.salt,
															linkKey: key
														})
													}
												}
											}
										}
									}
								}

								const sorted: ItemProps[] = orderItemsByType(fetchedItems, "nameAsc")

								cache.set(url, sorted)

								setItems(sorted)
							} catch (e) {
								console.error(e)
							}

							setLoadingItems(false)
						})
						.catch(err => {
							setLoadingItems(false)

							if (err.toString().toLowerCase().indexOf("wrong password") !== -1) {
								setNeedsPassword(true)
								setPasswordCorrect(false)
								setPassword("")
							}

							console.error(err)
						})
				}

				if (info.hasPassword) {
					if (password.length > 0) {
						getContents()
					} else {
						setPassword("")
						setNeedsPassword(true)
						setPasswordCorrect(false)
					}
				} else {
					getContents()
				}
			}
		}
	}, [url, params, key, info, password, folderName])

	const bodyOnClickListener = useCallback((e: MouseEvent): void => {
		const path = e.composedPath() as HTMLElement[]

		if (
			path.filter(
				el =>
					typeof el !== "undefined" &&
					typeof el.className == "string" &&
					el.className.indexOf("do-not-unselect-items") !== -1
			).length == 0 &&
			!isDragSelecting.current
		) {
			setItems(prev => prev.map(mapItem => ({ ...mapItem, selected: false })))
		}
	}, [])

	const resetDragSelect = useCallback(
		throttle((): void => {
			document.body.removeEventListener("mousemove", mouseMoveListener)

			setDragSelectState({
				start: {
					clientX: 0,
					clientY: 0
				},
				current: {
					clientX: 0,
					clientY: 0
				}
			})

			dragSelectDidCollideOnce.current = false
			hideContextMenusWhileDragSelecting.current = false
			dragSelectStart.current = {
				clientX: 0,
				clientY: 0
			}

			setTimeout(() => {
				isDragSelecting.current = false
			}, 250)
		}, 100),
		[]
	)

	const mouseDownListener = useCallback(
		throttle((e: MouseEvent): void => {
			if (
				memoryCache.has("previewModalOpen") ||
				window.location.hash.indexOf("account") !== -1 ||
				document.querySelectorAll(".chakra-modal__overlay").length > 0
			) {
				return
			}

			if (
				isDragSelecting.current ||
				e.button !== 0 ||
				dragSelectStart.current.clientX !== 0 ||
				dragSelectStart.current.clientY !== 0
			) {
				return
			}

			isDragSelecting.current = false
			dragSelectDidCollideOnce.current = false
			hideContextMenusWhileDragSelecting.current = true

			document.body.addEventListener("mousemove", mouseMoveListener)

			dragSelectStart.current = {
				clientX: e.clientX,
				clientY: e.clientY
			}
		}, 100),
		[]
	)

	const mouseMoveListener = useCallback((e: MouseEvent): void => {
		if (memoryCache.has("previewModalOpen")) {
			return
		}

		const coords = getDragSelectCoords(dragSelectStart.current, {
			clientX: e.clientX,
			clientY: e.clientY
		})

		if ((coords.height < 15 || coords.width < 15) && !isDragSelecting.current) {
			isDragSelecting.current = false

			return
		}

		isDragSelecting.current = true

		if (hideContextMenusWhileDragSelecting.current) {
			contextMenu.hideAll()

			hideContextMenusWhileDragSelecting.current = false
		}

		setDragSelectState({
			start: dragSelectStart.current,
			current: {
				clientX: e.clientX,
				clientY: e.clientY
			}
		})

		const colliding = getDragSelectCollisions()

		if (colliding.length == lastDragSelectCollisions.current.length) {
			return
		}

		lastDragSelectCollisions.current = colliding

		setItems(prev => {
			const current = [...prev]

			for (let i = 0; i < prev.length; i++) {
				if (colliding.includes(current[i].uuid)) {
					dragSelectDidCollideOnce.current = true

					current[i].selected = true
				} else {
					if (dragSelectDidCollideOnce.current) {
						current[i].selected = false
					}
				}
			}

			return current
		})
	}, [])

	useEffect(() => {
		fetchContents()
	}, [url])

	useEffect(() => {
		const transfersToastId = showToast("transfers")

		document.body.addEventListener("click", bodyOnClickListener)
		document.body.addEventListener("mousedown", mouseDownListener)
		document.body.addEventListener("mouseup", resetDragSelect)
		document.body.addEventListener("mousemove", mouseMoveListener)

		fetchInfo()

		const navigateListener = eventListener.on("publicLinkNavigate", (uuid: string) => {
			setURL(prev => prev + "/" + uuid)
		})

		return () => {
			dismissToast(transfersToastId)

			document.body.removeEventListener("click", bodyOnClickListener)
			document.body.removeEventListener("mousedown", mouseDownListener)
			document.body.removeEventListener("mouseup", resetDragSelect)
			document.body.removeEventListener("mousemove", mouseMoveListener)

			navigateListener.remove()
		}
	}, [])

	if (
		typeof params.uuid !== "string" ||
		!validateUUID(params.uuid) ||
		typeof key !== "string" ||
		key.length !== 32 ||
		notFound
	) {
		return (
			<InvalidLink
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		)
	}

	if (typeof info == "undefined" && !needsPassword) {
		return (
			<Flex
				className="full-viewport"
				flexDirection="column"
				backgroundColor={getColor(darkMode, "backgroundPrimary")}
				overflow="hidden"
				justifyContent="center"
				alignItems="center"
			>
				<Image
					src={LogoAnimated}
					width="128px"
					height="128px"
				/>
			</Flex>
		)
	}

	return (
		<Container
			windowWidth={windowWidth}
			windowHeight={windowHeight}
			darkMode={darkMode}
			isMobile={isMobile}
			lang={lang}
		>
			<Flex
				width={isMobile ? windowWidth + "px" : windowWidth - 400 + "px"}
				height="100%"
				flexDirection="column"
				justifyContent="center"
				alignItems="center"
				overflow="hidden"
			>
				{needsPassword && !passwordCorrect ? (
					<Flex
						width="300px"
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
					>
						<Input
							darkMode={darkMode}
							isMobile={isMobile}
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="Link password"
							type="password"
							onKeyDown={e => {
								if (e.which == 13) {
									fetchContents()
								}
							}}
							color={getColor(darkMode, "textSecondary")}
							_placeholder={{
								color: getColor(darkMode, "textSecondary")
							}}
						/>
						<Button
							darkMode={darkMode}
							isMobile={isMobile}
							backgroundColor={darkMode ? "white" : "gray"}
							color={darkMode ? "black" : "white"}
							border={"1px solid " + (darkMode ? "white" : "gray")}
							marginTop="15px"
							height="35px"
							_hover={{
								backgroundColor: getColor(darkMode, "backgroundPrimary"),
								border: "1px solid " + (darkMode ? "white" : "gray"),
								color: darkMode ? "white" : "gray"
							}}
							onClick={() => fetchContents()}
						>
							{loadingPassword ? (
								<Spinner
									width="16px"
									height="16px"
								/>
							) : (
								i18n(lang, "unlockLink")
							)}
						</Button>
					</Flex>
				) : (
					<>
						<FolderContainer
							darkMode={darkMode}
							isMobile={isMobile}
							windowWidth={windowWidth}
							windowHeight={windowHeight}
							lang={lang}
							info={info}
							toggleColorMode={toggleColorMode}
							previewContainerWidth={previewContainerWidth}
							previewContainerHeight={previewContainerHeight}
							name={folderName}
							items={items}
							downloadFolder={downloadFolder}
							password={password}
							viewMode={viewMode}
							setViewMode={setViewMode}
							breadcrumbs={
								<Flex
									flexDirection="row"
									alignItems="center"
									flexShrink={0}
									width="100%"
								>
									<Flex>
										{url
											.trim()
											.split("/")
											.map((uuid, index) => {
												return (
													<Flex
														key={uuid}
														alignItems="center"
													>
														<AppText
															darkMode={darkMode}
															isMobile={isMobile}
															noOfLines={1}
															color={getColor(darkMode, "textSecondary")}
															cursor="pointer"
															wordBreak="break-all"
															onClick={() => {
																const buildURL = (uuid: string): string => {
																	const ex = url.split("/")

																	if (ex.indexOf(uuid) !== -1) {
																		return ex
																			.slice(0, ex.indexOf(uuid) + 1)
																			.join("/")
																	} else {
																		return url + "/" + uuid
																	}
																}

																if (getCurrentParent(url) == uuid) {
																	return
																}

																setURL(buildURL(uuid))
															}}
															marginRight="3px"
															flexShrink={0}
															_hover={{
																color: getColor(darkMode, "textPrimary")
															}}
														>
															{folderNames[uuid]}
														</AppText>
														{index < url.trim().split("/").length - 1 && (
															<IoChevronForward
																size={16}
																color={getColor(darkMode, "textSecondary")}
																style={{
																	marginRight: "3px",
																	flexShrink: 0
																}}
															/>
														)}
													</Flex>
												)
											})}
									</Flex>
								</Flex>
							}
						>
							<>
								{/* @ts-ignore */}
								<AutoSizer
									style={{
										outline: "none"
									}}
								>
									{({ height, width }) => (
										<>
											<PublicLinkFolderList
												items={items}
												setItems={setItems}
												width={width}
												height={height}
												darkMode={darkMode}
												lang={lang}
												isMobile={isMobile}
												loadingItems={loadingItems}
												viewMode={viewMode}
											/>
										</>
									)}
								</AutoSizer>
							</>
						</FolderContainer>
					</>
				)}
			</Flex>
			<DragSelect
				darkMode={darkMode}
				dragSelectState={dragSelectState}
			/>
			<ContextMenus
				darkMode={darkMode}
				isMobile={isMobile}
				items={items}
				lang={lang}
			/>
			<PreviewModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<AbuseReportModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		</Container>
	)
})

export default PublicLinkFolder
