import { memo, useEffect, useState, useRef, useCallback } from "react"
import type { BreadcrumbsProps, BreadcrumbProps, ItemProps, FolderRenamedEvent } from "../../types"
import { Flex } from "@chakra-ui/react"
import AppText from "../AppText"
import { getColor } from "../../styles/colors"
import { IoChevronForward, IoGrid, IoList } from "react-icons/io5"
import { useLocation, useNavigate } from "react-router-dom"
import { validate as validateUUID } from "uuid"
import memoryCache from "../../lib/memoryCache"
import db from "../../lib/db"
import { buildBreadcrumbHashLink, getCurrentParent } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { moveToParent } from "../../lib/services/move"
import Button from "../Button"
import { DROP_NAVIGATION_TIMEOUT } from "../../lib/constants"
import { i18n } from "../../i18n"

const Breadcrumb = memo(({ darkMode, isMobile, crumb, length, index, lang }: BreadcrumbProps) => {
	const navigate = useNavigate()
	const [dragHover, setDragHover] = useState<boolean>(false)
	const dropNavigationTimer = useRef<number | undefined | ReturnType<typeof setTimeout>>(undefined)
	const [name, setName] = useState<string>(crumb.name)

	const openSidebarFolder = useCallback(async (uuid: string): Promise<void> => {
		eventListener.emit("openSidebarFolder", uuid)
	}, [])

	const goToFolder = useCallback((uuid: string): void => {
		if (getCurrentParent() == uuid) {
			return
		}

		if (uuid == "shared/in") {
			navigate("/#/shared/in")
		} else if (uuid == "shared/out") {
			navigate("/#/shared/out")
		} else if (uuid == "links") {
			navigate("/#/links")
		} else if (uuid == "favorites") {
			navigate("/#/favorites")
		} else if (uuid == "recents") {
			navigate("/#/recents")
		} else if (uuid == "trash") {
			navigate("/#/trash")
		} else {
			openSidebarFolder(uuid)

			navigate(buildBreadcrumbHashLink(uuid))
		}
	}, [])

	const handleOnDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
		e.preventDefault()

		const droppedItems: ItemProps[] = memoryCache.get("draggedItems") || []

		clearTimeout(dropNavigationTimer.current)

		dropNavigationTimer.current = undefined

		moveToParent(droppedItems, crumb.uuid)
	}, [])

	const handleOnDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
		e.preventDefault()

		setDragHover(true)

		if (typeof dropNavigationTimer.current !== "number") {
			clearTimeout(dropNavigationTimer.current)

			dropNavigationTimer.current = setTimeout(() => {
				openSidebarFolder(crumb.uuid)

				navigate(buildBreadcrumbHashLink(crumb.uuid))

				clearTimeout(dropNavigationTimer.current)

				dropNavigationTimer.current = undefined
			}, DROP_NAVIGATION_TIMEOUT)
		}
	}, [])

	const handleOnDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
		e.preventDefault()

		setDragHover(false)

		clearTimeout(dropNavigationTimer.current)

		dropNavigationTimer.current = undefined
	}, [])

	useEffect(() => {
		const folderRenamedListener = eventListener.on("folderRenamed", (data: FolderRenamedEvent) => {
			if (data.item.uuid == crumb.uuid) {
				setName(data.to)
			}
		})

		return () => {
			folderRenamedListener.remove()

			clearTimeout(dropNavigationTimer.current)

			dropNavigationTimer.current = undefined
		}
	}, [])

	return (
		<Flex
			key={crumb.uuid}
			flexDirection="row"
			alignItems="center"
			onDrop={handleOnDrop}
			onDragOver={handleOnDragOver}
			onDragLeave={handleOnDragLeave}
			height="41px"
			flexShrink={0}
		>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				noOfLines={1}
				color={dragHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
				_hover={{
					color: getColor(darkMode, "textPrimary")
				}}
				cursor="pointer"
				onClick={() => goToFolder(crumb.uuid)}
				marginRight="3px"
				flexShrink={0}
			>
				{name}
			</AppText>
			{index < length - 1 && (
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
})

const Breadcrumbs = memo(({ darkMode, isMobile, lang, gridFolders, setGridFolders, items }: BreadcrumbsProps) => {
	const location = useLocation()
	const [breadcrumbs, setBreadcrumbs] = useState<{ uuid: string; name: string }[]>([])
	const [hoveringListLayoutToggle, setHoveringListLayoutToggle] = useState<boolean>(false)

	const update = useCallback(async () => {
		try {
			const [defaultDriveUUID, folderNames] = await Promise.all([db.get("defaultDriveUUID"), db.get("folderNames", "metadata")])

			const ex = location.hash.split("/")
			const validFolders = []
			const crumbs = []

			for (let i = 0; i < ex.length; i++) {
				if (validateUUID(ex[i])) {
					validFolders.push(ex[i])
				}
			}

			if (location.hash.indexOf("shared-in") !== -1) {
				crumbs.push({
					uuid: "shared-in",
					name: i18n(lang, "sharedWithMe")
				})
			} else if (location.hash.indexOf("shared-out") !== -1) {
				crumbs.push({
					uuid: "shared-out",
					name: i18n(lang, "sharedWithOthers")
				})
			} else if (location.hash.indexOf("links") !== -1) {
				crumbs.push({
					uuid: "links",
					name: i18n(lang, "links")
				})
			} else if (location.hash.indexOf("favorites") !== -1) {
				crumbs.push({
					uuid: "favorites",
					name: i18n(lang, "favorites")
				})
			} else if (location.hash.indexOf("recent") !== -1) {
				crumbs.push({
					uuid: "recent",
					name: i18n(lang, "recents")
				})
			} else if (location.hash.indexOf("trash") !== -1) {
				crumbs.push({
					uuid: "trash",
					name: i18n(lang, "trash")
				})
			}

			for (let i = 0; i < validFolders.length; i++) {
				if (validFolders[i] == defaultDriveUUID) {
					crumbs.push({
						uuid: validFolders[i],
						name: i18n(lang, "cloudDrive")
					})
				} else {
					crumbs.push({
						uuid: validFolders[i],
						name:
							typeof folderNames[validFolders[i]] == "string"
								? folderNames[validFolders[i]]
								: memoryCache.has("folderName:" + validFolders[i])
								? memoryCache.get("folderName:" + validFolders[i])
								: validFolders[i]
					})
				}
			}

			setBreadcrumbs(crumbs)
		} catch (e) {
			console.error(e)
		}
	}, [location])

	useEffect(() => {
		update()
	}, [location])

	return (
		<Flex
			height="41px"
			width="100%"
			flexDirection="row"
			alignItems="center"
			paddingLeft="15px"
			paddingRight="15px"
			borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
			justifyContent="space-between"
		>
			<Flex
				height="41px"
				width="80%"
				justifyContent="flex-start"
				alignItems="center"
			>
				{breadcrumbs.map((crumb, index) => {
					return (
						<Breadcrumb
							key={crumb.uuid}
							darkMode={darkMode}
							isMobile={isMobile}
							crumb={crumb}
							index={index}
							length={breadcrumbs.length}
							lang={lang}
						/>
					)
				})}
			</Flex>
			<Flex
				height="41px"
				width="20%"
				justifyContent="flex-end"
				alignItems="center"
				className="do-not-unselect-items"
			>
				{location.hash.indexOf("trash") !== -1 && (
					<Button
						darkMode={darkMode}
						isMobile={isMobile}
						color="white"
						height="25px"
						paddingLeft="10px"
						paddingRight="10px"
						fontSize={13}
						border={"1px solid " + darkMode ? "white" : "gray"}
						onClick={() => eventListener.emit("openEmptyTrashModal")}
						borderRadius="5px"
						marginRight="15px"
						backgroundColor="red.500"
						flexShrink={0}
						_hover={{
							color: "white",
							backgroundColor: "red.600"
						}}
					>
						{i18n(lang, "emptyTrash")}
					</Button>
				)}
				{items.length > 0 && (
					<>
						{!gridFolders[window.location.href] ? (
							<IoGrid
								size={18}
								color={hoveringListLayoutToggle ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								onClick={() => setGridFolders({ ...gridFolders, [window.location.href]: true })}
								cursor="pointer"
								className="do-not-unselect-items"
								onMouseEnter={() => setHoveringListLayoutToggle(true)}
								onMouseLeave={() => setHoveringListLayoutToggle(false)}
								style={{
									flexShrink: 0
								}}
							/>
						) : (
							<IoList
								size={18}
								color={hoveringListLayoutToggle ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
								onClick={() => setGridFolders({ ...gridFolders, [window.location.href]: false })}
								cursor="pointer"
								className="do-not-unselect-items"
								onMouseEnter={() => setHoveringListLayoutToggle(true)}
								onMouseLeave={() => setHoveringListLayoutToggle(false)}
								style={{
									flexShrink: 0
								}}
							/>
						)}
					</>
				)}
			</Flex>
		</Flex>
	)
})

export default Breadcrumbs
