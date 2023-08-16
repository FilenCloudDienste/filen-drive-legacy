import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader, Flex, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { loadItems } from "../../lib/services/items"
import { IoCloud, IoFolderOpen, IoFolder, IoChevronDown, IoChevronForward } from "react-icons/io5"
import { getFolderColor, getFileExt, getImageForFileByExt } from "../../lib/helpers"
import db from "../../lib/db"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { v4 as uuidv4 } from "uuid"

export const CloudTreeItem = memo(
	({
		darkMode,
		isMobile,
		parent,
		depth,
		folders,
		loading,
		path,
		foldersOpen,
		setFoldersOpen,
		selected,
		setSelected
	}: {
		darkMode: boolean
		isMobile: boolean
		parent: ItemProps
		depth: number
		folders: ItemProps[]
		loading: boolean
		path: string
		foldersOpen: Record<string, boolean>
		setFoldersOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
		selected: Record<string, ItemProps>
		setSelected: React.Dispatch<React.SetStateAction<Record<string, ItemProps>>>
	}) => {
		const [hovering, setHovering] = useState<boolean>(false)

		const bgHover = useMemo(() => {
			return hovering || typeof selected[parent.uuid] !== "undefined"
		}, [hovering, selected])

		const onClick = useCallback(() => {
			if (parent.type === "folder") {
				setFoldersOpen(prev => ({
					...prev,
					[parent.uuid]: prev[parent.uuid] ? false : true
				}))
			} else {
				if (typeof selected[parent.uuid] !== "undefined") {
					setSelected(prev =>
						Object.keys(prev)
							.filter(key => key !== parent.uuid)
							.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
					)
				} else {
					setSelected(prev => ({
						...prev,
						[parent.uuid]: parent
					}))
				}
			}
		}, [parent, selected])

		return (
			<Flex
				height="auto"
				width="100%"
				flexDirection="column"
			>
				<Flex
					height={parent.uuid === "base" ? "40px" : "35px"}
					width="100%"
					alignItems="center"
					paddingLeft="15px"
					paddingRight="15px"
					flexDirection="row"
					cursor="pointer"
					transition="200ms"
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
					borderRadius="10px"
					backgroundColor={bgHover ? getColor(darkMode, "backgroundPrimary") : "transparent"}
					onClick={onClick}
				>
					<Flex
						height={parent.uuid === "base" ? "40px" : "35px"}
						width="100%"
						alignItems="center"
						flexDirection="row"
						cursor="pointer"
						paddingLeft={depth * (depth === 1 ? 18 : 17) + (parent.type === "file" ? (depth <= 2 ? 19 : 3) : 0) + "px"}
					>
						{parent.type === "folder" ? (
							<>
								{loading ? (
									<Spinner
										width={parent.uuid === "base" ? "16px" : "13px"}
										height={parent.uuid === "base" ? "16px" : "13px"}
										color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
										flexShrink={0}
									/>
								) : foldersOpen[parent.uuid] ? (
									<IoChevronDown
										size={parent.uuid === "base" ? 16 : 13}
										color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
										onClick={onClick}
										style={{
											flexShrink: 0
										}}
									/>
								) : (
									<IoChevronForward
										size={parent.uuid === "base" ? 16 : 13}
										color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
										onClick={onClick}
										style={{
											flexShrink: 0
										}}
									/>
								)}
								{parent.uuid === "base" ? (
									<IoCloud
										size={parent.uuid === "base" ? 20 : 16}
										color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
										style={{
											marginLeft: "6px",
											flexShrink: 0
										}}
									/>
								) : foldersOpen[parent.uuid] ? (
									<IoFolderOpen
										size={parent.uuid === "base" ? 20 : 16}
										color={getFolderColor("default")}
										onClick={onClick}
										style={{
											marginLeft: "6px",
											flexShrink: 0
										}}
									/>
								) : (
									<IoFolder
										size={parent.uuid === "base" ? 20 : 16}
										color={getFolderColor("default")}
										onClick={onClick}
										style={{
											marginLeft: "6px",
											flexShrink: 0
										}}
									/>
								)}
							</>
						) : (
							<Image
								src={getImageForFileByExt(getFileExt(parent.name))}
								width="16px"
								height="16px"
								flexShrink={0}
								objectFit="cover"
								onClick={onClick}
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
							fontSize={parent.uuid === "base" ? 16 : 14}
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
					{foldersOpen[parent.uuid] &&
						folders.length > 0 &&
						folders.map(folder => {
							return (
								<CloudTree
									key={folder.uuid}
									darkMode={darkMode}
									isMobile={isMobile}
									parent={folder}
									depth={depth + 1}
									foldersOpen={foldersOpen}
									setFoldersOpen={setFoldersOpen}
									path={path + "/" + folder.uuid}
									selected={selected}
									setSelected={setSelected}
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
		foldersOpen,
		setFoldersOpen,
		selected,
		setSelected
	}: {
		darkMode: boolean
		isMobile: boolean
		depth: number
		parent: ItemProps
		path: string
		foldersOpen: Record<string, boolean>
		setFoldersOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
		selected: Record<string, ItemProps>
		setSelected: React.Dispatch<React.SetStateAction<Record<string, ItemProps>>>
	}) => {
		const [folders, setFolders] = useState<ItemProps[]>([])
		const [loading, setLoading] = useState<boolean>(false)

		const fetchItems = useCallback(
			async (refresh: boolean = false): Promise<void> => {
				const getItemsInDb = await db.get("loadItems:" + parent.uuid, "metadata")
				const hasItemsInDb = Array.isArray(getItemsInDb)

				if (!hasItemsInDb) {
					setLoading(true)
				}

				loadItems(parent.uuid, refresh)
					.then(data => {
						setFolders(data.items)
						setLoading(false)

						if (data.cache) {
							fetchItems(true)
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
			if (foldersOpen[parent.uuid] || parent.uuid === "base") {
				fetchItems(false)
			}
		}, [foldersOpen[parent.uuid]])

		return (
			<CloudTreeItem
				darkMode={darkMode}
				isMobile={isMobile}
				parent={parent}
				depth={depth}
				folders={folders}
				foldersOpen={foldersOpen}
				setFoldersOpen={setFoldersOpen}
				loading={loading}
				path={path}
				selected={selected}
				setSelected={setSelected}
			/>
		)
	}
)

const SelectFromCloudModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	const [open, setOpen] = useState<boolean>(false)
	const [foldersOpen, setFoldersOpen] = useState<Record<string, boolean>>({ base: true })
	const [selected, setSelected] = useState<Record<string, ItemProps>>({})
	const requestIdRef = useRef<string>("")

	const select = useCallback(() => {
		if (Object.keys(selected).length === 0) {
			return
		}

		eventListener.emit("selectFromCloudResult", {
			requestId: requestIdRef.current,
			items: Object.keys(selected).map(key => selected[key])
		})

		setOpen(false)
	}, [selected])

	useEffect(() => {
		const openSelectFromCloudListener = eventListener.on("openSelectFromCloud", ({ requestId }: { requestId: string }) => {
			requestIdRef.current = requestId

			setSelected({})
			setFoldersOpen({ base: true })
			setOpen(true)
		})

		return () => {
			openSelectFromCloudListener.remove()
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
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "selectFromCloud")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height={isMobile ? (document.documentElement.clientHeight || window.innerHeight) - 62 - 75 + "px" : "500px"}
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					<Flex
						height={isMobile ? (document.documentElement.clientHeight || window.innerHeight) - 62 - 75 + "px" : "500px"}
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
							foldersOpen={foldersOpen}
							setFoldersOpen={setFoldersOpen}
							selected={selected}
							setSelected={setSelected}
						/>
					</Flex>
				</ModalBody>
				<ModalFooter>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={Object.keys(selected).length > 0 ? getColor(darkMode, "linkPrimary") : getColor(darkMode, "textSecondary")}
						cursor={Object.keys(selected).length > 0 ? "pointer" : "not-allowed"}
						onClick={select}
						_hover={{
							textDecoration: "underline"
						}}
					>
						{Object.keys(selected).length > 0
							? i18n(lang, "selectNumItems", true, ["__NUM__"], [Object.keys(selected).length.toString()])
							: i18n(lang, "select")}
					</AppText>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export const selectFromCloud = (): Promise<ItemProps[]> => {
	return new Promise(resolve => {
		const requestId = uuidv4()

		const sub = eventListener.on("selectFromCloudResult", ({ requestId: rId, items }: { requestId: string; items: ItemProps[] }) => {
			if (rId === requestId) {
				sub.remove()

				resolve(items)
			}
		})

		eventListener.emit("openSelectFromCloud", {
			requestId
		})
	})
}

export default SelectFromCloudModal
