import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Flex, Avatar, Spinner, Progress, CircularProgress, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../../components/AppText"
import {
	IoTrashOutline,
	IoCloudOutline,
	IoFolderOpen,
	IoFolder,
	IoChevronDown,
	IoChevronForward,
	IoChatbubbleOutline,
	IoBookOutline
} from "react-icons/io5"
import { RiFolderSharedLine, RiLink, RiFolderReceivedLine } from "react-icons/ri"
import { AiOutlineHeart } from "react-icons/ai"
import { HiOutlineClock } from "react-icons/hi"
import {
	SidebarProps,
	DividerProps,
	ButtonProps,
	CloudTreeProps,
	CloudTreeItemProps,
	ItemProps,
	ItemMovedEvent,
	FolderRenamedEvent,
	ItemColorChangedEvent,
	ItemTrashedEvent,
	FolderCreatedEvent,
	SidebarUsageProps,
	UserInfo
} from "../../types"
import { loadSidebarItems } from "../../lib/services/items"
import { getFolderColor, getCurrentParent, formatBytes, safeAwait } from "../../lib/helpers"
import db from "../../lib/db"
import { CHAKRA_COLOR_SCHEME, DROP_NAVIGATION_TIMEOUT } from "../../lib/constants"
import eventListener from "../../lib/eventListener"
import { debounce } from "lodash"
import { fetchUserInfo } from "../../lib/services/user"
import { moveToParent } from "../../lib/services/move"
import { i18n } from "../../i18n"
import { contextMenu } from "react-contexify"
import { SocketEvent } from "../../lib/services/socket"
import memoryCache from "../../lib/memoryCache"
import { chatUnread } from "../../lib/api"
import DarkLogo from "../../assets/images/dark_logo.svg"
import LightLogo from "../../assets/images/light_logo.svg"
import useDb from "../../lib/hooks/useDb"

export const Divider = memo(({ darkMode, marginTop, marginBottom }: DividerProps) => {
	return (
		<Flex
			width="100%"
			height="1px"
			backgroundColor={getColor(darkMode, "borderSecondary")}
			marginTop={marginTop + "px"}
			marginBottom={marginBottom + "px"}
		>
			&nbsp;
		</Flex>
	)
})

export const Button = memo(({ darkMode, isMobile, type, text, to }: ButtonProps) => {
	const navigate = useNavigate()
	const [hovering, setHovering] = useState<boolean>(false)
	const location = useLocation()
	const [unreadChatMessages, setUnreadChatMessages] = useState<number>(0)

	const active = useMemo(() => {
		return "/" + location.hash == to || location.hash.indexOf(type) !== -1
	}, [location.hash])

	const colors = useMemo(() => {
		return {
			icon: hovering || active ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary"),
			text: hovering || active ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
		}
	}, [darkMode, hovering, active])

	const updateChatUnread = useCallback(async () => {
		if (window.location.href.indexOf("chats") !== -1) {
			return
		}

		const [unreadErr, unreadRes] = await safeAwait(chatUnread())

		if (unreadErr) {
			console.error(unreadErr)

			return
		}

		setUnreadChatMessages(unreadRes)
	}, [])

	useEffect(() => {
		let refreshTimer: ReturnType<typeof setInterval>
		let updateChatUnreadListener: ReturnType<typeof eventListener.on>
		let updateChatUnreadNumberListener: ReturnType<typeof eventListener.on>

		if (type === "chats") {
			updateChatUnread()

			refreshTimer = setInterval(updateChatUnread, 5000)
			updateChatUnreadListener = eventListener.on("updateChatUnread", updateChatUnread)
			updateChatUnreadNumberListener = eventListener.on("updateChatUnreadNumber", (number: number) => setUnreadChatMessages(number))
		}

		return () => {
			if (refreshTimer) {
				clearInterval(refreshTimer)
			}

			if (updateChatUnreadListener) {
				updateChatUnreadListener.remove()
			}

			if (updateChatUnreadNumberListener) {
				updateChatUnreadNumberListener.remove()
			}
		}
	}, [])

	return (
		<Flex
			width="100%"
			height="auto"
			paddingLeft="10px"
			paddingRight="10px"
			marginBottom="2px"
		>
			<Flex
				width="100%"
				height="auto"
				alignItems="center"
				paddingLeft="10px"
				paddingRight="10px"
				paddingTop="6px"
				paddingBottom="6px"
				cursor="pointer"
				transition="200ms"
				justifyContent={isMobile ? "center" : "flex-start"}
				color={colors.text}
				onMouseEnter={() => setHovering(true)}
				onMouseLeave={() => setHovering(false)}
				backgroundColor={hovering || active ? getColor(darkMode, "backgroundTertiary") : "transparent"}
				border={hovering || active ? "1px solid " + getColor(darkMode, "borderPrimary") : "1px solid transparent"}
				borderRadius="10px"
				boxShadow={hovering || active ? "sm" : undefined}
				onClick={() => navigate(to)}
			>
				{type === "chats" && unreadChatMessages > 0 && window.location.href.indexOf("chats") === -1 && (
					<Flex
						position="absolute"
						width="16px"
						height="16px"
						backgroundColor={getColor(darkMode, "red")}
						borderRadius="full"
						justifyContent="center"
						alignItems="center"
						marginTop="-16px"
						marginLeft="11px"
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							fontSize={13}
							fontWeight="bold"
							color="white"
						>
							{unreadChatMessages}
						</AppText>
					</Flex>
				)}
				{type == "cloudDrive" && (
					<IoCloudOutline
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type == "shared-in" && (
					<RiFolderReceivedLine
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type == "shared-out" && (
					<RiFolderSharedLine
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type == "links" && (
					<RiLink
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type == "favorites" && (
					<AiOutlineHeart
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type == "recent" && (
					<HiOutlineClock
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type == "trash" && (
					<IoTrashOutline
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type === "chats" && (
					<IoChatbubbleOutline
						size={20}
						color={colors.icon}
						style={{
							flexShrink: 0
						}}
					/>
				)}
				{type === "notes" && (
					<IoBookOutline
						size={20}
						color={colors.icon}
					/>
				)}
				{!isMobile && (
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						marginLeft="12px"
						noOfLines={1}
						fontSize={15}
						fontWeight="bold"
						color={colors.text}
					>
						{text}
					</AppText>
				)}
			</Flex>
		</Flex>
	)
})

export const CloudTreeItem = memo(
	({
		darkMode,
		isMobile,
		parent,
		depth,
		folders,
		sidebarFolderOpen,
		setSidebarFolderOpen,
		loading,
		path,
		setItems,
		items,
		setActiveItem,
		sidebarWidth
	}: CloudTreeItemProps) => {
		const navigate = useNavigate()
		const [hovering, setHovering] = useState<boolean>(false)
		const dropNavigationTimer = useRef<number | undefined | ReturnType<typeof setTimeout>>(undefined)
		const location = useLocation()
		const currentItems = useRef<ItemProps[]>([])
		const [defaultDrive] = useDb("defaultDriveUUID", "")

		const active = useMemo(() => {
			const currentParent = getCurrentParent(location.hash)

			return currentParent === parent.uuid || (parent.uuid === "base" && currentParent === defaultDrive)
		}, [parent.uuid, location.hash, defaultDrive])

		const bgHover = useMemo(() => {
			return hovering || active
		}, [hovering, active])

		const handleItemOnDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
			setHovering(false)

			clearTimeout(dropNavigationTimer.current)

			dropNavigationTimer.current = undefined

			const droppedItems: ItemProps[] = memoryCache.get("draggedItems") || []

			moveToParent(droppedItems, parent.uuid)
		}, [])

		const canMove = useCallback(
			(uuids: string[]): boolean => {
				const pathEx: string[] = path.split("/")

				for (let i = 0; i < pathEx.length; i++) {
					if (uuids.includes(pathEx[i])) {
						return false
					}
				}

				return true
			},
			[path]
		)

		const handleItemOnDragOver = useCallback(
			(e: React.DragEvent<HTMLDivElement>): void => {
				const droppedItems: ItemProps[] = memoryCache.get("draggedItems") || []

				const uuids: string[] = droppedItems.map(item => item.uuid)

				if (!canMove(uuids)) {
					return
				}

				setHovering(true)

				if (typeof dropNavigationTimer.current !== "number") {
					clearTimeout(dropNavigationTimer.current)

					dropNavigationTimer.current = setTimeout(() => {
						db.get("defaultDriveUUID")
							.then(defaultDriveUUID => {
								navigate("/#/" + path.replace("base", defaultDriveUUID))
							})
							.catch(console.error)

						clearTimeout(dropNavigationTimer.current)

						dropNavigationTimer.current = undefined
					}, DROP_NAVIGATION_TIMEOUT)
				}
			},
			[path]
		)

		const handleItemOnDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
			setHovering(false)

			clearTimeout(dropNavigationTimer.current)

			dropNavigationTimer.current = undefined
		}, [])

		const handleItemOnContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
			const item: ItemProps = parent

			if (item.uuid == "base") {
				return
			}

			setActiveItem(item)
			setItems(prev => prev.map(mapItem => ({ ...mapItem, selected: false })))

			contextMenu.show({
				id: "sidebarContextMenu",
				event: e,
				position: {
					x: e.nativeEvent.clientX,
					y: e.nativeEvent.clientY
				}
			})
		}, [])

		useEffect(() => {
			currentItems.current = items
		}, [items])

		useEffect(() => {
			db.get("defaultDriveUUID")
				.then(defaultDriveUUID => {
					Promise.all([
						db.get("loadItems:" + defaultDriveUUID, "metadata"),
						db.get("loadItems:" + parent.uuid == "base" ? defaultDriveUUID : parent.uuid, "metadata"),
						db.get("loadSidebarItems:" + parent.uuid == "base" ? defaultDriveUUID : parent.uuid, "metadata")
					]).catch(console.error)
				})
				.catch(console.error)

			return () => {
				clearTimeout(dropNavigationTimer.current)

				dropNavigationTimer.current = undefined
			}
		}, [])

		return (
			<Flex
				height="auto"
				width={parent.uuid === "base" ? sidebarWidth + "px" : sidebarWidth - 20 + "px"}
				flexDirection="column"
				paddingLeft={parent.uuid === "base" ? "10px" : "0px"}
				paddingRight={parent.uuid === "base" ? "10px" : "0px"}
				marginTop={parent.uuid === "base" ? "0px" : "2px"}
			>
				<Flex
					height={parent.uuid === "base" ? "40px" : "30px"}
					width="100%"
					paddingLeft="10px"
					paddingRight="10px"
					alignItems="center"
					flexDirection="row"
					cursor="pointer"
					transition="200ms"
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
					onDragOver={handleItemOnDragOver}
					onDragLeave={handleItemOnDragLeave}
					onDrop={handleItemOnDrop}
					onContextMenu={handleItemOnContextMenu}
					backgroundColor={bgHover ? getColor(darkMode, "backgroundTertiary") : "transparent"}
					border={bgHover ? "1px solid " + getColor(darkMode, "borderPrimary") : "1px solid transparent"}
					borderRadius="10px"
					boxShadow={bgHover ? "sm" : undefined}
				>
					<Flex
						height={parent.uuid === "base" ? "40px" : "30px"}
						width="100%"
						alignItems="center"
						flexDirection="row"
						justifyContent="flex-start"
						cursor="pointer"
						paddingLeft={depth * (depth === 1 ? 18 : 17) + "px"}
					>
						{loading ? (
							<Spinner
								width={parent.uuid == "base" ? "16px" : "13px"}
								height={parent.uuid == "base" ? "16px" : "13px"}
								color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								flexShrink={0}
							/>
						) : sidebarFolderOpen[parent.uuid] ? (
							<IoChevronDown
								size={parent.uuid == "base" ? 16 : 13}
								color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								onClick={() => {
									setSidebarFolderOpen(prev => ({
										...prev,
										[parent.uuid]: prev[parent.uuid] ? false : true
									}))
								}}
								style={{
									flexShrink: 0
								}}
							/>
						) : (
							<IoChevronForward
								size={parent.uuid == "base" ? 16 : 13}
								color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								onClick={() => {
									setSidebarFolderOpen(prev => ({
										...prev,
										[parent.uuid]: prev[parent.uuid] ? false : true
									}))
								}}
								style={{
									flexShrink: 0
								}}
							/>
						)}
						{parent.uuid == "base" ? (
							<IoFolderOpen
								size={parent.uuid == "base" ? 20 : 16}
								color={getFolderColor(parent.color)}
								onClick={() => {
									setSidebarFolderOpen(prev => ({
										...prev,
										[parent.uuid]: prev[parent.uuid] ? false : true
									}))
								}}
								style={{
									marginLeft: "6px",
									flexShrink: 0
								}}
							/>
						) : sidebarFolderOpen[parent.uuid] ? (
							<IoFolderOpen
								size={parent.uuid == "base" ? 20 : 16}
								color={getFolderColor(parent.color)}
								onClick={() => {
									setSidebarFolderOpen(prev => ({
										...prev,
										[parent.uuid]: prev[parent.uuid] ? false : true
									}))
								}}
								style={{
									marginLeft: "6px",
									flexShrink: 0
								}}
							/>
						) : (
							<IoFolder
								size={parent.uuid == "base" ? 20 : 16}
								color={getFolderColor(parent.color)}
								onClick={() => {
									setSidebarFolderOpen(prev => ({
										...prev,
										[parent.uuid]: prev[parent.uuid] ? false : true
									}))
								}}
								style={{
									marginLeft: "6px",
									flexShrink: 0
								}}
							/>
						)}
						{!isMobile && (
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								marginLeft="9px"
								width={195 - depth * (depth == 1 ? 35 : 25) + "px"}
								noOfLines={1}
								wordBreak="break-all"
								color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								fontSize={parent.uuid == "base" ? 16 : 14}
								flexShrink={0}
								height={parent.uuid == "base" ? "35px" : "30px"}
								paddingTop="0.375em"
								justifyContent="flex-start"
								textAlign="start"
								onClick={() => {
									setSidebarFolderOpen(prev => ({
										...prev,
										[parent.uuid]: true
									}))

									db.get("defaultDriveUUID")
										.then(defaultDriveUUID => {
											navigate("/#/" + path.replace("base", defaultDriveUUID))
										})
										.catch(console.error)
								}}
							>
								{parent.name}
							</AppText>
						)}
					</Flex>
				</Flex>
				<Flex
					height="auto"
					width={
						(document.documentElement.clientWidth || window.innerWidth) *
						(document.documentElement.clientWidth || window.innerWidth)
					}
					flexDirection="column"
				>
					{sidebarFolderOpen[parent.uuid] &&
						folders.length > 0 &&
						folders.map(folder => {
							return (
								<CloudTree
									key={folder.uuid}
									darkMode={darkMode}
									isMobile={isMobile}
									parent={folder}
									depth={depth + 1}
									sidebarFolderOpen={sidebarFolderOpen}
									setSidebarFolderOpen={setSidebarFolderOpen}
									path={path + "/" + folder.uuid}
									items={items}
									setItems={setItems}
									setActiveItem={setActiveItem}
									sidebarWidth={sidebarWidth}
								/>
							)
						})}
				</Flex>
			</Flex>
		)
	}
)

export const CloudTree = memo(
	({
		darkMode,
		isMobile,
		depth,
		parent,
		sidebarFolderOpen,
		setSidebarFolderOpen,
		path,
		items,
		setItems,
		setActiveItem,
		sidebarWidth
	}: CloudTreeProps) => {
		const [folders, setFolders] = useState<ItemProps[]>([])
		const [loading, setLoading] = useState<boolean>(false)
		const treeFolders = useRef<ItemProps[]>([])

		const fetchSidebarItems = useCallback(
			async (refresh: boolean = false): Promise<void> => {
				const getItemsInDb = await db.get("loadSidebarItems:" + parent.uuid, "metadata")
				const hasItemsInDb = Array.isArray(getItemsInDb)

				if (!hasItemsInDb) {
					setLoading(true)
				}

				loadSidebarItems(parent.uuid, refresh)
					.then(data => {
						setFolders(data.items.filter(item => item.type == "folder"))

						setLoading(false)

						if (data.cache) {
							fetchSidebarItems(true)
						}
					})
					.catch(err => {
						setLoading(false)

						console.error(err)
					})
			},
			[parent.uuid]
		)

		useEffect(() => {
			if (sidebarFolderOpen[parent.uuid]) {
				fetchSidebarItems(false)
			}
		}, [sidebarFolderOpen[parent.uuid]])

		useEffect(() => {
			treeFolders.current = folders
		}, [folders])

		useEffect(() => {
			const folderCreatedListener = eventListener.on("folderCreated", async (data: FolderCreatedEvent) => {
				const defaultDriveUUID = await db.get("defaultDriveUUID")
				const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

				if (data.parent == thisParent) {
					fetchSidebarItems(true)
				}
			})

			const folderRenamedListener = eventListener.on("folderRenamed", async (data: FolderRenamedEvent) => {
				const defaultDriveUUID = await db.get("defaultDriveUUID")
				const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

				if (data.item.parent == thisParent) {
					fetchSidebarItems(true)
				}
			})

			const itemTrashedListener = eventListener.on("itemTrashed", async (data: ItemTrashedEvent) => {
				const defaultDriveUUID = await db.get("defaultDriveUUID")
				const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

				if (data.item.parent == thisParent) {
					fetchSidebarItems(true)
				}
			})

			const openSidebarFolderListener = eventListener.on("openSidebarFolder", (uuid: string) => {
				setSidebarFolderOpen(prev => ({
					...prev,
					[uuid]: true
				}))
			})

			const itemColorChangedListener = eventListener.on("itemColorChanged", async (data: ItemColorChangedEvent) => {
				const defaultDriveUUID = await db.get("defaultDriveUUID")
				const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

				if (data.item.parent == thisParent) {
					fetchSidebarItems(true)
				}
			})

			const itemMovedListener = eventListener.on("itemMoved", async (data: ItemMovedEvent) => {
				const defaultDriveUUID = await db.get("defaultDriveUUID")
				const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

				if (data.from == thisParent) {
					fetchSidebarItems(true)
				}

				if (data.to == thisParent) {
					fetchSidebarItems(true)
				}
			})

			const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
				await new Promise(resolve => setTimeout(resolve, 250))

				const defaultDriveUUID = await db.get("defaultDriveUUID")
				const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

				if (event.type == "folderSubCreated" || event.type == "folderRestore") {
					if (thisParent == event.data.parent) {
						fetchSidebarItems(true)
					}
				} else if (event.type == "folderMove") {
					if (thisParent == event.data.parent) {
						fetchSidebarItems(true)
					}
				} else if (event.type == "folderColorChanged") {
					if (treeFolders.current.filter(folder => folder.uuid == event.data.uuid).length > 0) {
						fetchSidebarItems(true)
					}
				}
			})

			return () => {
				folderCreatedListener.remove()
				folderRenamedListener.remove()
				itemTrashedListener.remove()
				openSidebarFolderListener.remove()
				itemColorChangedListener.remove()
				itemMovedListener.remove()
				socketEventListener.remove()
			}
		}, [])

		return (
			<CloudTreeItem
				darkMode={darkMode}
				isMobile={isMobile}
				parent={parent}
				depth={depth}
				folders={folders}
				sidebarFolderOpen={sidebarFolderOpen}
				setSidebarFolderOpen={setSidebarFolderOpen}
				loading={loading}
				path={path}
				items={items}
				setItems={setItems}
				setActiveItem={setActiveItem}
				sidebarWidth={sidebarWidth}
			/>
		)
	}
)

const Usage = memo(({ sidebarWidth, darkMode, isMobile, lang }: SidebarUsageProps) => {
	const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined)
	const [percent, setPercent] = useState<number>(0)
	const navigate = useNavigate()

	const debouncedFetchUsage = useMemo(() => debounce(() => fetchUsage(), 30000), [])

	const fetchUsage = useCallback(async (): Promise<void> => {
		try {
			const info: UserInfo = await fetchUserInfo()
			const percentage: number = parseFloat(((info.storageUsed / info.maxStorage) * 100).toFixed(2))

			setUserInfo(info)
			setPercent(isNaN(percentage) ? 0 : percentage >= 100 ? 100 : percentage)
		} catch (e) {
			console.error(e)
		}
	}, [])

	useEffect(() => {
		fetchUsage()

		const uploadMarkedDoneListener = eventListener.on("uploadMarkedDone", () => debouncedFetchUsage())
		const trashEmptiedListener = eventListener.on("trashEmptied", () => debouncedFetchUsage())
		const updateInterval = setInterval(() => fetchUsage(), 60000)

		return () => {
			uploadMarkedDoneListener.remove()
			trashEmptiedListener.remove()

			clearInterval(updateInterval)
		}
	}, [])

	return (
		<Flex
			width={sidebarWidth + "px"}
			height="auto"
			flexDirection="column"
			position="absolute"
			bottom="15px"
			zIndex={1001}
			userSelect="none"
		>
			{typeof userInfo == "undefined" ? (
				<Flex
					paddingLeft="15px"
					paddingRight="15px"
					paddingTop="5px"
					paddingBottom="5px"
					alignItems="center"
					justifyContent="center"
				>
					<Spinner
						width="15px"
						height="15px"
						color={getColor(darkMode, "textPrimary")}
					/>
				</Flex>
			) : (
				<>
					{isMobile ? (
						<Flex
							paddingLeft="15px"
							paddingRight="15px"
							alignItems="center"
							justifyContent="center"
						>
							<CircularProgress
								value={percent}
								size={5}
								color="#805AD5"
								min={0}
								max={100}
								trackColor={getColor(darkMode, "backgroundSecondary")}
								thickness={18}
								flexShrink={0}
							/>
						</Flex>
					) : (
						<>
							<Flex
								paddingLeft="15px"
								paddingRight="15px"
							>
								<Progress
									value={percent}
									height="5px"
									borderRadius="10px"
									colorScheme={CHAKRA_COLOR_SCHEME}
									min={0}
									max={100}
									marginTop="5px"
									width="100%"
									backgroundColor={getColor(darkMode, "backgroundPrimary")}
								/>
							</Flex>
							<Flex
								flexDirection="row"
								justifyContent="space-between"
								paddingLeft="15px"
								paddingRight="15px"
								paddingTop="5px"
							>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									noOfLines={1}
									wordBreak="break-all"
									color={getColor(darkMode, "textSecondary")}
									fontSize={11}
								>
									{i18n(
										lang,
										"storageUsedInfo",
										true,
										["__USED__", "__MAX__"],
										[formatBytes(userInfo.storageUsed), formatBytes(userInfo.maxStorage)]
									)}
								</AppText>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									noOfLines={1}
									wordBreak="break-all"
									color={getColor(darkMode, "textSecondary")}
									fontSize={11}
									fontWeight="bold"
									_hover={{
										textDecoration: "underline",
										color: getColor(darkMode, "textPrimary")
									}}
									cursor="pointer"
									onClick={() => navigate("/#/account/plans")}
								>
									{i18n(lang, "upgrade")}
								</AppText>
							</Flex>
						</>
					)}
				</>
			)}
		</Flex>
	)
})

const Sidebar = memo(({ darkMode, isMobile, sidebarWidth, windowHeight, lang, items, setActiveItem, setItems }: SidebarProps) => {
	//const [sidebarFolderOpen, setSidebarFolderOpen] = useDb("sidebarFolderOpen", {})
	const [sidebarFolderOpen, setSidebarFolderOpen] = useState<{ [key: string]: boolean }>({ base: true })
	const navigate = useNavigate()

	const treeMaxHeight: number = useMemo(() => {
		const sidebarOtherHeight: number = 40 * 12
		const treeHeight: number = windowHeight - sidebarOtherHeight
		const treeMaxHeight: number = treeHeight < 40 ? 40 : treeHeight

		return treeMaxHeight
	}, [windowHeight])

	return (
		<Flex
			width={sidebarWidth + "px"}
			height="100%"
			flexDirection="column"
			overflowX="hidden"
			overflowY="auto"
			userSelect="none"
			backgroundColor={getColor(darkMode, "backgroundSecondary")}
			borderRight={"1px solid " + getColor(darkMode, "borderPrimary")}
		>
			<Flex
				width={sidebarWidth + "px"}
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				height="50px"
				alignItems="center"
				paddingLeft="15px"
				paddingRight="15px"
			>
				<Image
					src={darkMode ? LightLogo : DarkLogo}
					width="30px"
					height="30px"
					cursor="pointer"
					onClick={() => {
						db.get("defaultDriveUUID")
							.then(defaultDriveUUID => {
								if (typeof defaultDriveUUID == "string" && defaultDriveUUID.length > 32) {
									navigate("/#/" + defaultDriveUUID)
								}
							})
							.catch(console.error)
					}}
				/>
			</Flex>
			<Divider
				darkMode={darkMode}
				marginTop={0}
				marginBottom={10}
			/>
			<Flex
				width={sidebarWidth + "px"}
				height="auto"
				maxHeight={treeMaxHeight + "px"}
				flexDirection="column"
				overflowX="hidden"
				overflowY={treeMaxHeight > 40 ? "auto" : "hidden"}
				userSelect="none"
			>
				{!isMobile ? (
					<CloudTree
						darkMode={darkMode}
						isMobile={isMobile}
						parent={{
							type: "folder",
							parent: "base",
							uuid: "base",
							name: "Cloud Drive",
							size: 0,
							mime: "",
							lastModified: 0,
							lastModifiedSort: 0,
							timestamp: 0,
							selected: false,
							color: "default",
							sharerEmail: "",
							sharerId: 0,
							receiverEmail: "",
							receiverId: 0,
							version: 0,
							rm: "",
							favorited: 0,
							chunks: 0,
							writeAccess: true,
							root: "",
							key: "",
							region: "",
							bucket: ""
						}}
						path="base"
						depth={0}
						sidebarFolderOpen={sidebarFolderOpen}
						setSidebarFolderOpen={setSidebarFolderOpen}
						items={items}
						setItems={setItems}
						setActiveItem={setActiveItem}
						sidebarWidth={sidebarWidth}
					/>
				) : (
					<Button
						darkMode={darkMode}
						isMobile={isMobile}
						type="cloudDrive"
						text={i18n(lang, "cloudDrive")}
						to="/"
					/>
				)}
			</Flex>
			<Divider
				darkMode={darkMode}
				marginTop={10}
				marginBottom={10}
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="shared-in"
				text={i18n(lang, "sharedWithMe")}
				to="/#/shared-in"
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="shared-out"
				text={i18n(lang, "sharedWithOthers")}
				to="/#/shared-out"
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="links"
				text={i18n(lang, "links")}
				to="/#/links"
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="favorites"
				text={i18n(lang, "favorites")}
				to="/#/favorites"
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="recent"
				text={i18n(lang, "recents")}
				to="/#/recent"
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="trash"
				text={i18n(lang, "trash")}
				to="/#/trash"
			/>
			<Divider
				darkMode={darkMode}
				marginTop={10}
				marginBottom={10}
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="chats"
				text={i18n(lang, "chats")}
				to="/#/chats"
			/>
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				type="notes"
				text={i18n(lang, "notes")}
				to="/#/notes"
			/>
			<Usage
				darkMode={darkMode}
				isMobile={isMobile}
				sidebarWidth={sidebarWidth}
				lang={lang}
			/>
		</Flex>
	)
})

export default Sidebar
