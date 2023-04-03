import { memo, useState, useEffect, useCallback, useMemo } from "react"
import type { MoveModalProps, ItemProps } from "../../types"
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalBody,
	ModalCloseButton,
	Spinner,
	ModalFooter,
	ModalHeader,
	Flex
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { loadSidebarItems } from "../../lib/services/items"
import { IoCloud, IoFolderOpen, IoFolder, IoChevronDown, IoChevronForward } from "react-icons/io5"
import { getFolderColor } from "../../lib/helpers"
import db from "../../lib/db"
import { moveToParent } from "../../lib/services/move"
import { i18n } from "../../i18n"
import { addItemsToStore, removeItemsFromStore } from "../../lib/services/metadata"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"

export const CloudTreeItem = memo(
	({
		darkMode,
		isMobile,
		parent,
		depth,
		folders,
		loading,
		path,
		moveModalFolderOpen,
		setMoveModalFolderOpen,
		selected,
		setSelected,
		toMove
	}: {
		darkMode: boolean
		isMobile: boolean
		parent: ItemProps
		depth: number
		folders: ItemProps[]
		loading: boolean
		path: string
		moveModalFolderOpen: { [key: string]: boolean }
		setMoveModalFolderOpen: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
		selected: ItemProps | undefined
		setSelected: React.Dispatch<React.SetStateAction<ItemProps | undefined>>
		toMove: ItemProps[]
	}) => {
		const [hovering, setHovering] = useState<boolean>(false)

		const bgHover: boolean = useMemo(() => {
			return hovering || selected?.uuid == parent.uuid
		}, [hovering, selected])

		const canMove: boolean = useMemo(() => {
			const uuids: string[] = toMove.map(item => item.uuid)
			const pathEx: string[] = path.split("/")

			for (let i = 0; i < pathEx.length; i++) {
				if (uuids.includes(pathEx[i])) {
					return false
				}
			}

			return true
		}, [path, toMove])

		return (
			<Flex
				height="auto"
				width="100%"
				flexDirection="column"
			>
				<Flex
					height={parent.uuid == "base" ? "40px" : "35px"}
					width="100%"
					alignItems="center"
					paddingLeft="15px"
					paddingRight="15px"
					flexDirection="row"
					cursor={canMove ? "pointer" : "not-allowed"}
					transition="200ms"
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
					backgroundColor={bgHover ? getColor(darkMode, "backgroundPrimary") : "transparent"}
					onClick={() => {
						if (canMove) {
							setSelected(parent)
						}

						if (parent.uuid == "base" || !canMove) {
							return
						}

						setMoveModalFolderOpen(prev => ({
							...prev,
							[parent.uuid]: typeof prev[parent.uuid] == "boolean" ? !prev[parent.uuid] : true
						}))
					}}
				>
					<Flex
						height={parent.uuid == "base" ? "40px" : "35px"}
						width="100%"
						alignItems="center"
						flexDirection="row"
						cursor={canMove ? "pointer" : "not-allowed"}
						paddingLeft={depth * (depth == 1 ? 18 : 17) + "px"}
					>
						{loading ? (
							<Spinner
								width={parent.uuid == "base" ? "16px" : "13px"}
								height={parent.uuid == "base" ? "16px" : "13px"}
								color={
									bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
								}
								flexShrink={0}
							/>
						) : moveModalFolderOpen[parent.uuid] ? (
							<IoChevronDown
								size={parent.uuid == "base" ? 16 : 13}
								color={
									bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
								}
								onClick={() => {
									if (parent.uuid == "base" || !canMove) {
										return
									}

									setMoveModalFolderOpen(prev => ({
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
								color={
									bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
								}
								onClick={() => {
									if (parent.uuid == "base" || !canMove) {
										return
									}

									setMoveModalFolderOpen(prev => ({
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
							<IoCloud
								size={parent.uuid == "base" ? 20 : 16}
								color={
									bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
								}
								style={{
									marginLeft: "6px",
									flexShrink: 0
								}}
							/>
						) : moveModalFolderOpen[parent.uuid] ? (
							<IoFolderOpen
								size={parent.uuid == "base" ? 20 : 16}
								color={getFolderColor("default")}
								onClick={() => {
									if (!canMove) {
										return
									}

									setMoveModalFolderOpen(prev => ({
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
								color={getFolderColor("default")}
								onClick={() => {
									if (!canMove) {
										return
									}

									setMoveModalFolderOpen(prev => ({
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
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							marginLeft="8px"
							width="100%"
							noOfLines={1}
							wordBreak="break-all"
							color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
							fontSize={parent.uuid == "base" ? 16 : 14}
						>
							{parent.name}
						</AppText>
					</Flex>
				</Flex>
				<Flex
					height="auto"
					width="auto"
					flexDirection="column"
				>
					{moveModalFolderOpen[parent.uuid] &&
						folders.length > 0 &&
						folders.map(folder => {
							return (
								<CloudTree
									key={folder.uuid}
									darkMode={darkMode}
									isMobile={isMobile}
									parent={folder}
									depth={depth + 1}
									moveModalFolderOpen={moveModalFolderOpen}
									setMoveModalFolderOpen={setMoveModalFolderOpen}
									path={path + "/" + folder.uuid}
									selected={selected}
									setSelected={setSelected}
									toMove={toMove}
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
		path,
		moveModalFolderOpen,
		setMoveModalFolderOpen,
		selected,
		setSelected,
		toMove
	}: {
		darkMode: boolean
		isMobile: boolean
		depth: number
		parent: ItemProps
		path: string
		moveModalFolderOpen: { [key: string]: boolean }
		setMoveModalFolderOpen: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
		selected: ItemProps | undefined
		setSelected: React.Dispatch<React.SetStateAction<ItemProps | undefined>>
		toMove: ItemProps[]
	}) => {
		const [folders, setFolders] = useState<ItemProps[]>([])
		const [loading, setLoading] = useState<boolean>(false)

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
			if (moveModalFolderOpen[parent.uuid] || parent.uuid == "base") {
				fetchSidebarItems(false)
			}
		}, [moveModalFolderOpen[parent.uuid]])

		return (
			<CloudTreeItem
				darkMode={darkMode}
				isMobile={isMobile}
				parent={parent}
				depth={depth}
				folders={folders}
				moveModalFolderOpen={moveModalFolderOpen}
				setMoveModalFolderOpen={setMoveModalFolderOpen}
				loading={loading}
				path={path}
				selected={selected}
				setSelected={setSelected}
				toMove={toMove}
			/>
		)
	}
)

const MoveModal = memo(({ darkMode, isMobile, lang }: MoveModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const [toMove, setToMove] = useState<ItemProps[]>([])
	const [moveModalFolderOpen, setMoveModalFolderOpen] = useState<{ [key: string]: boolean }>({ base: true })
	const [selected, setSelected] = useState<ItemProps | undefined>(undefined)

	const move = useCallback(async (): Promise<void> => {
		if (typeof selected == "undefined") {
			return
		}

		setLoading(true)

		try {
			let moveUUID: string = selected.uuid

			if (moveUUID == "base") {
				moveUUID = await db.get("defaultDriveUUID")
			}

			await moveToParent(toMove, moveUUID)

			for (let i = 0; i < toMove.length; i++) {
				removeItemsFromStore([toMove[i]], toMove[i].parent).catch(console.error)
				addItemsToStore([toMove[i]], moveUUID).catch(console.error)
			}
		} catch (e: any) {
			console.error(e)

			showToast("error", e.toString(), "bottom", 5000)
		}

		setSelected(undefined)
		setLoading(false)
		setOpen(false)
	}, [selected, toMove])

	useEffect(() => {
		const openMoveModalListener = eventListener.on("openMoveModal", ({ items }: { items: ItemProps[] }) => {
			setToMove(items)

			if (!loading) {
				setMoveModalFolderOpen({
					base: true
				})

				setSelected(undefined)
			}

			setOpen(true)
		})

		return () => {
			openMoveModalListener.remove()
		}
	}, [])

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
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "selectDestination")}</ModalHeader>
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
					height={
						isMobile
							? (document.documentElement.clientHeight || window.innerHeight) - 62 - 75 + "px"
							: "500px"
					}
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					<Flex
						height={
							isMobile
								? (document.documentElement.clientHeight || window.innerHeight) - 62 - 75 + "px"
								: "500px"
						}
						overflow="auto"
					>
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
							moveModalFolderOpen={moveModalFolderOpen}
							setMoveModalFolderOpen={setMoveModalFolderOpen}
							selected={selected}
							setSelected={setSelected}
							toMove={toMove}
						/>
					</Flex>
				</ModalBody>
				<ModalFooter>
					{loading || typeof selected == "undefined" ? (
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "textSecondary")}
							cursor="not-allowed"
						>
							{i18n(lang, "move")}
						</AppText>
					) : (
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							cursor="pointer"
							onClick={() => move()}
						>
							{i18n(
								lang,
								"moveModalBtn",
								true,
								["__COUNT__", "__DEST__"],
								[
									toMove.length.toString(),
									selected.name.length >= 16
										? selected.name.length > 16
											? selected.name.slice(0, 16) + ".."
											: selected.name.slice(0, 16)
										: selected.name
								]
							)}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default MoveModal
