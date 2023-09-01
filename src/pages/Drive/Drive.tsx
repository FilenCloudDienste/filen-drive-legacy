import { memo, useEffect, useState, useRef, useCallback, useMemo } from "react"
import { AppBaseProps } from "../../types"
import { useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { Flex, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import {
	ItemProps,
	ItemDragState,
	DragSelectState,
	ItemFavoritedEvent,
	ItemMovedEvent,
	ItemRestoredEvent,
	FileUploadedEvent,
	AddFolderEvent,
	ItemColorChangedEvent,
	ItemUpdatedEvent
} from "../../types"
import {
	getDragSelectCoords,
	getDragSelectCollisions,
	orderItemsByType,
	getCurrentURLParentFolder,
	readLocalDroppedDirectory,
	getCurrentParent,
	convertTimestampToMs
} from "../../lib/helpers"
import throttle from "lodash/throttle"
import ContextMenus from "../../components/ContextMenus"
import { contextMenu } from "react-contexify"
import Sidebar from "../../components/Sidebar"
import Topbar from "../../components/Topbar"
import Breadcrumbs from "../../components/Breadcrumbs"
import ListHeader from "../../components/ListHeader"
import List from "../../components/List"
import DragSelect from "../../components/DragSelect"
import ItemDragTooltip from "../../components/ItemDragTooltip"
import db from "../../lib/db"
import { updateKeys } from "../../lib/user"
import { loadItems } from "../../lib/services/items"
import useDb from "../../lib/hooks/useDb"
import UploadModal from "../../components/UploadModal"
import eventListener from "../../lib/eventListener"
import PreviewModal from "../../components/PreviewModal"
import memoryCache from "../../lib/memoryCache"
import RenameModal from "../../components/RenameModal"
import { show as showToast, dismiss as dismissToast } from "../../components/Toast/Toast"
import DeleteModal from "../../components/DeleteModal"
import CreateFolderModal from "../../components/CreateFolderModal"
import DeletePermanentlyModal from "../../components/DeletePermanentlyModal"
import ShareModal from "../../components/ShareModal"
import StopSharingModal from "../../components/StopSharingModal"
import RemoveSharedInModal from "../../components/RemoveSharedInModal"
import PublicLinkModal from "../../components/PublicLinkModal"
import VersionsModal from "../../components/VersionsModal"
import MoveModal from "../../components/MoveModal"
import Account from "../../components/Account"
import DragAndDropModal from "../../components/DragAndDropModal"
import EventInfoModal from "../../components/EventInfoModal"
import SharedWithInfoModal from "../../components/SharedWithInfoModal"
import { SocketEvent } from "../../lib/services/socket"
import { decryptFileMetadata, decryptFolderName } from "../../lib/worker/worker.com"
import striptags from "striptags"
import LogoAnimated from "../../assets/images/logo_animated.gif"
import MaxStorageModal from "../../components/MaxStorageModal"
import { CreateTextFileModal, CreateTextFileModalEditor } from "../../components/CreateTextFileModal"
import cookies from "../../lib/cookies"
import debounce from "lodash/debounce"
import EmptryTrashModal from "../../components/EmptyTrashModal"
import { validate } from "uuid"
import Chats from "../../components/Chats"
import Notes from "../../components/Notes"
import Contacts from "../../components/Contacts"
import { i18n } from "../../i18n"
import SelectFromCloud from "../../components/SelectFromCloud"
import UserProfileModal from "../../components/Chats/UserProfileModal"

const Drive = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
	const navigate = useNavigate()
	const location = useLocation()
	const [params] = useSearchParams()
	const [initDone, setInitDone] = useState<boolean>(false)
	const [sidebarWidth, setSidebarWidth] = useState<number>(isMobile ? 55 : 250)
	const [items, setItems] = useState<ItemProps[]>([])
	const [activeItem, setActiveItem] = useState<ItemProps | null>(null)
	const [itemDragState, setItemDragState] = useState<ItemDragState>({ clientX: 0, clientY: 0, items: [] })
	const [dragSelectState, setDragSelectState] = useState<DragSelectState>({
		start: { clientX: 0, clientY: 0 },
		current: { clientX: 0, clientY: 0 }
	})
	const dragSelectStart = useRef({ clientX: 0, clientY: 0 })
	const isDragSelecting = useRef<boolean>(false)
	const dragSelectDidCollideOnce = useRef<boolean>(false)
	const hideContextMenusWhileDragSelecting = useRef<boolean>(false)
	const [loadingItems, setLoadingItems] = useState<boolean>(false)
	const lastDragSelectCollisions = useRef<(string | null)[]>([])
	const draggingItems = useRef<boolean>(false)
	const [sortBy] = useDb("sortBy", {})
	const [gridFolders, setGridFolders] = useDb("gridFolders", {})
	const currentItems = useRef<ItemProps[]>([])
	const [searchTerm, setSearchTerm] = useState<string>("")
	const currentSearchTerm = useRef<string>("")
	const [showDragAndDropModal, setShowDragAndDropModal] = useState<boolean>(false)

	const debounceReloadSizesEvent = useCallback(
		debounce(() => {
			eventListener.emit("reloadFolderSizes")
		}, 60000),
		[]
	)

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
				window.location.hash.indexOf("chats") !== -1 ||
				window.location.hash.indexOf("notes") !== -1 ||
				window.location.hash.indexOf("contacts") !== -1 ||
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

	const windowOnKeyDown = useCallback((e: KeyboardEvent): void => {
		const selected = currentItems.current.filter(item => item.selected)

		if (
			e.ctrlKey &&
			e.which == 65 &&
			currentSearchTerm.current.length == 0 &&
			document.querySelectorAll(".chakra-modal__overlay").length == 0
		) {
			setItems(prev => prev.map(mapItem => ({ ...mapItem, selected: true })))
		} else if (e.which == 45 && selected.length == 1) {
			eventListener.emit("openRenameModal", {
				item: selected[0]
			})
		} else if (e.which == 46 && selected.length > 0) {
			if (window.location.hash.indexOf("trash") !== -1) {
				eventListener.emit("openDeletePermanentlyModal", {
					items: selected
				})
			} else if (window.location.hash.indexOf("shared-out") !== -1) {
				eventListener.emit("openStopSharingModal", {
					items: selected
				})
			} else if (window.location.hash.indexOf("shared-in") !== -1) {
				eventListener.emit("openRemoveSharedInModal", {
					items: selected
				})
			} else {
				eventListener.emit("openDeleteModal", {
					items: selected
				})
			}
		}
	}, [])

	const bodyOnClickListener = useCallback((e: MouseEvent): void => {
		const path = e.composedPath() as HTMLElement[]

		if (
			path.filter(
				el => typeof el !== "undefined" && typeof el.className == "string" && el.className.indexOf("do-not-unselect-items") !== -1
			).length == 0 &&
			!isDragSelecting.current
		) {
			setItems(prev => prev.map(mapItem => ({ ...mapItem, selected: false })))
		}
	}, [])

	const readDroppedFiles = useCallback(
		async (e: DragEvent): Promise<void> => {
			if (
				window.location.hash.indexOf("shared-in") !== -1 ||
				window.location.hash.indexOf("trash") !== -1 ||
				window.location.hash.indexOf("links") !== -1 ||
				window.location.hash.indexOf("favorites") !== -1 ||
				window.location.hash.indexOf("recent") !== -1 ||
				window.location.hash.indexOf("notes") !== -1 ||
				window.location.hash.indexOf("contacts") !== -1 ||
				window.location.hash.indexOf("account") !== -1
			) {
				return
			}

			const items = e.dataTransfer?.items

			if (!items) {
				return
			}

			const preparingToast = showToast("loading", i18n(lang, "preparingFilesDots"), "bottom", 8640000)

			try {
				const files = await readLocalDroppedDirectory(items)

				if (files.filter(file => typeof (file as any).uuid !== "undefined").length > 0) {
					dismissToast(preparingToast)

					return
				}

				const filteredFiles = files.filter(file => file.size > 0)

				if (filteredFiles.length > 0) {
					if (window.location.href.indexOf("chats") !== -1) {
						if (filteredFiles.length > 3) {
							dismissToast(preparingToast)

							showToast("error", i18n(lang, "chatAttachmentTooManyFiles", true, ["__LIMIT__"], ["3"]), "bottom", 5000)

							return
						}

						const requestId = window.location.href

						const sub = eventListener.on(
							"uploadsDone",
							({ requestId: rId, items }: { requestId: string; items: ItemProps[] }) => {
								if (rId === requestId) {
									sub.remove()

									eventListener.emit("chatAddFiles", {
										conversation: getCurrentParent(requestId),
										items
									})
								}
							}
						)

						eventListener.emit("openUploadModal", {
							files: filteredFiles,
							openModal: filteredFiles.length > 0,
							chatUpload: true,
							requestId
						})
					} else {
						eventListener.emit("openUploadModal", {
							files: filteredFiles,
							openModal: filteredFiles.length > 0
						})
					}
				}
			} catch (e: any) {
				console.error(e)

				showToast("error", e.toString(), "bottom", 5000)
			}

			dismissToast(preparingToast)
		},
		[lang]
	)

	const bodyOnDropListener = useCallback((e: DragEvent): void => {
		setShowDragAndDropModal(false)

		setItemDragState({
			clientX: 0,
			clientY: 0,
			items: []
		})

		if ((e.dataTransfer?.files && e.dataTransfer?.files[0]) || (e.dataTransfer?.items && e.dataTransfer?.items[0])) {
			readDroppedFiles(e)
		}

		e.preventDefault()
	}, [])

	const bodyOnDragLeaveListener = useCallback((e: DragEvent): void => {
		const fileList = e.dataTransfer?.items

		if (!fileList) {
			return
		}

		let hasFile: boolean = false

		for (let i = 0; i < fileList.length; i++) {
			if (fileList[i].kind == "file") {
				hasFile = true
			}
		}

		if (hasFile) {
			setShowDragAndDropModal(false)
		} else {
			if (draggingItems.current) {
				return
			}

			setItemDragState({
				clientX: 0,
				clientY: 0,
				items: []
			})
		}
	}, [])

	const bodyOnDragOverListener = useCallback((e: DragEvent) => {
		const fileList = e.dataTransfer?.items

		if (!fileList) {
			return
		}

		let hasFile: boolean = false

		for (let i = 0; i < fileList.length; i++) {
			if (fileList[i].kind == "file") {
				hasFile = true
			}
		}

		if (!hasFile) {
			return
		}

		setShowDragAndDropModal(true)
	}, [])

	const setup = useCallback((): void => {
		if (window.doingSetup) {
			return
		}

		window.doingSetup = true

		Promise.all([db.set("isOnline", true), db.get("apiKey"), db.get("defaultDriveUUID"), db.get("userId"), db.get("masterKeys")])
			.then(([_, apiKey, defaultDriveUUID, userId, masterKeys]) => {
				if (apiKey == null || defaultDriveUUID == null || userId == null || masterKeys == null) {
					cookies.set("loggedIn", "false")

					navigate("/login" + (typeof params.get("pro") == "string" ? "?pro=" + params.get("pro") : ""), {
						replace: true
					})

					window.doingSetup = false

					return
				}

				if (typeof apiKey !== "string" || typeof defaultDriveUUID !== "string" || typeof userId !== "number") {
					cookies.set("loggedIn", "false")

					navigate("/login" + (typeof params.get("pro") == "string" ? "?pro=" + params.get("pro") : ""), {
						replace: true
					})

					window.doingSetup = false

					return
				}

				if (!apiKey || !defaultDriveUUID || apiKey.length !== 64 || defaultDriveUUID.length < 32 || userId <= 0) {
					cookies.set("loggedIn", "false")

					navigate("/login" + (typeof params.get("pro") == "string" ? "?pro=" + params.get("pro") : ""), {
						replace: true
					})

					window.doingSetup = false

					return
				}

				if (!masterKeys || !Array.isArray(masterKeys)) {
					cookies.set("loggedIn", "false")

					navigate("/login" + (typeof params.get("pro") == "string" ? "?pro=" + params.get("pro") : ""), {
						replace: true
					})

					window.doingSetup = false

					return
				}

				updateKeys()
					.then(() => {
						setInitDone(true)
						//setLoadingItems(true)

						cookies.set("loggedIn", "true")

						if (typeof params.get("pro") == "string") {
							navigate("/#/account/plans?pro=" + params.get("pro"))
						} else {
							//navigate("/#/" + defaultDriveUUID)
						}

						window.doingSetup = false
					})
					.catch(err => {
						window.doingSetup = false

						console.error(err)

						cookies.set("loggedIn", "false")

						navigate("/login" + (typeof params.get("pro") == "string" ? "?pro=" + params.get("pro") : ""), {
							replace: true
						})
					})
			})
			.catch(err => {
				window.doingSetup = false

				console.error(err)

				cookies.set("loggedIn", "false")

				navigate("/login" + (typeof params.get("pro") == "string" ? "?pro=" + params.get("pro") : ""), {
					replace: true
				})
			})
	}, [])

	const populateList = useCallback(
		async (refresh: boolean = false): Promise<void> => {
			const startingURL = window.location.href

			if (
				startingURL.indexOf("#/") === -1 ||
				startingURL.indexOf("chats") !== -1 ||
				startingURL.indexOf("notes") !== -1 ||
				startingURL.indexOf("contacts") !== -1
			) {
				return
			}

			const currentParent = getCurrentParent(startingURL)

			if (!validate(currentParent) && !["shared-in", "shared-out", "links", "recent", "favorites", "trash"].includes(currentParent)) {
				return
			}

			const getItemsInDb = await db.get("loadItems:" + currentParent, "metadata")
			const hasItemsInDb = Array.isArray(getItemsInDb)

			if (!hasItemsInDb) {
				setLoadingItems(true)
				setItems([])
			}

			loadItems(startingURL, refresh)
				.then(loadedItems => {
					if (startingURL !== window.location.href) {
						return
					}

					setItems(orderItemsByType(loadedItems.items, sortBy[startingURL], startingURL))
					setLoadingItems(false)

					if (loadedItems.cache) {
						populateList(true)
					}

					contextMenu.hideAll()
				})
				.catch(err => {
					console.error(err)

					if (startingURL !== window.location.href) {
						return
					}

					setItems([])
					setLoadingItems(false)
				})
		},
		[sortBy]
	)

	const windowOnFocus = useCallback(() => {
		if (currentSearchTerm.current.length > 0) {
			return
		}

		populateList(true)
	}, [searchTerm])

	const unduplicatedItems = useMemo(() => {
		return items.filter((value, index, self) => {
			return self.findIndex(v => v.uuid === value.uuid) === index
		})
	}, [items])

	const filteredSearchItems = useMemo(() => {
		if (searchTerm.length <= 0) {
			return unduplicatedItems
		}

		return unduplicatedItems.filter(item => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1)
	}, [unduplicatedItems, searchTerm])

	useEffect(() => {
		if (initDone && location.hash.split("/").length < 2) {
			db.get("defaultDriveUUID")
				.then(defaultDriveUUID => {
					if (typeof defaultDriveUUID == "string" && defaultDriveUUID.length >= 32) {
						navigate("/#/" + defaultDriveUUID, { replace: true })
					}
				})
				.catch(console.error)
		}
	}, [location, initDone])

	useEffect(() => {
		if (location.hash.indexOf("account") !== -1 || !initDone) {
			return
		}

		populateList()
	}, [location.hash, initDone])

	useEffect(() => {
		if (itemDragState.items.length > 0) {
			draggingItems.current = true

			document.body.removeEventListener("mousemove", mouseMoveListener)

			if (dragSelectState.start.clientX > 0 || dragSelectState.start.clientY > 0) {
				isDragSelecting.current = false
				dragSelectDidCollideOnce.current = false

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
			}

			resetDragSelect()
		} else {
			draggingItems.current = false
		}
	}, [itemDragState])

	useEffect(() => {
		setSidebarWidth(isMobile ? 55 : 250)
	}, [isMobile])

	useEffect(() => {
		currentItems.current = items
	}, [items])

	useEffect(() => {
		currentSearchTerm.current = searchTerm
	}, [searchTerm])

	useEffect(() => {
		if (initDone) {
			db.get("defaultDriveUUID")
				.then(defaultDriveUUID => {
					Promise.all([
						db.get("loadItems:" + defaultDriveUUID, "metadata"),
						db.get("loadItems:shared-in", "metadata"),
						db.get("loadItems:shared-out", "metadata"),
						db.get("loadItems:links", "metadata"),
						db.get("loadItems:favorites", "metadata"),
						db.get("loadItems:recent", "metadata"),
						db.get("loadItems:trash", "metadata"),
						db.get("loadSidebarItems:" + defaultDriveUUID, "metadata")
					]).catch(console.error)
				})
				.catch(console.error)
		}
	}, [initDone])

	useEffect(() => {
		setup()

		const transfersToastId = showToast("transfers")

		window.addEventListener("keydown", windowOnKeyDown)
		window.addEventListener("focus", windowOnFocus)

		document.body.addEventListener("mousedown", mouseDownListener)
		document.body.addEventListener("mouseup", resetDragSelect)
		document.body.addEventListener("click", bodyOnClickListener)
		document.body.addEventListener("drop", bodyOnDropListener)
		document.body.addEventListener("dragleave", bodyOnDragLeaveListener)
		document.body.addEventListener("dragover", bodyOnDragOverListener)

		const updateListListener = eventListener.on("updateList", (parent: string) => {
			if (getCurrentURLParentFolder() == parent) {
				populateList(true)
			}
		})

		const itemFavoritedListener = eventListener.on("itemFavorited", (data: ItemFavoritedEvent) => {
			setItems(prev => {
				if (prev.filter(item => item.uuid == data.item.uuid).length > 0) {
					return prev.map(item => (item.uuid == data.item.uuid ? { ...item, favorited: data.favorited } : item))
				}

				return prev
			})
		})

		const itemMovedListener = eventListener.on("itemMoved", (data: ItemMovedEvent) => {
			setItems(prev => {
				if (window.location.href.indexOf("recent") !== -1) {
					return prev
				}

				const windowParent: string = getCurrentURLParentFolder()
				const itemFilter: number = prev.filter(item => item.uuid == data.item.uuid).length

				if (windowParent == data.to && itemFilter > 0) {
					return prev
				}

				if (windowParent == data.to && itemFilter == 0) {
					let added = [...prev]

					added.push(data.item)

					added = orderItemsByType(added, sortBy[window.location.href], window.location.href)

					return added
				}

				return prev.filter(item => item.uuid !== data.item.uuid)
			})
		})

		const itemRestoredListener = eventListener.on("itemRestored", (data: ItemRestoredEvent) => {
			setItems(prev => {
				if (getCurrentURLParentFolder() == "trash") {
					return prev.filter(item => item.uuid !== data.item.uuid)
				}

				return prev
			})
		})

		const fileUploadedListener = eventListener.on("fileUploaded", (data: FileUploadedEvent) => {
			if (getCurrentURLParentFolder() == data.item.parent) {
				setItems(prev =>
					orderItemsByType(
						[...prev.filter(item => item.name !== data.item.name && item.uuid !== data.item.uuid), data.item],
						sortBy[window.location.href],
						window.location.href
					)
				)
			}
		})

		const addFolderListener = eventListener.on("addFolder", (data: AddFolderEvent) => {
			if (getCurrentURLParentFolder() == data.item.parent) {
				setItems(prev =>
					orderItemsByType(
						[...prev.filter(item => item.name !== data.item.name && item.uuid !== data.item.uuid), data.item],
						sortBy[window.location.href],
						window.location.href
					)
				)
			}
		})

		const itemColorChangedListener = eventListener.on("itemColorChanged", (data: ItemColorChangedEvent) => {
			setItems(prev => prev.map(item => (item.uuid == data.item.uuid ? { ...item, color: data.color } : item)))
		})

		const updateItemListener = eventListener.on("updateItem", ({ uuid, updated }: ItemUpdatedEvent) => {
			setItems(prev => prev.map(item => (item.uuid == uuid ? { ...item, ...updated } : item)))
		})

		const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			await new Promise(resolve => setTimeout(resolve, 100))

			if (event.type == "fileArchived" || event.type == "fileTrash" || event.type == "folderTrash") {
				setItems(prev => prev.filter(item => item.uuid !== event.data.uuid))
			} else if (event.type == "fileRename") {
				const masterKeys = (await db.get("masterKeys")) || []
				const decrypted = await decryptFileMetadata(event.data.metadata, masterKeys)

				if (typeof decrypted.name == "string") {
					if (decrypted.name.length > 0) {
						setItems(prev =>
							prev.map(item => (item.uuid == event.data.uuid ? { ...item, name: striptags(decrypted.name) } : item))
						)
					}
				}
			} else if (event.type == "folderRename") {
				const masterKeys = (await db.get("masterKeys")) || []
				const decrypted = await decryptFolderName(event.data.name, masterKeys)

				if (typeof decrypted == "string") {
					if (decrypted.length > 0) {
						setItems(prev => prev.map(item => (item.uuid == event.data.uuid ? { ...item, name: striptags(decrypted) } : item)))
					}
				}
			} else if (event.type == "folderColorChanged") {
				setItems(prev => prev.map(item => (item.uuid == event.data.uuid ? { ...item, color: event.data.color } : item)))
			} else if (event.type == "folderSubCreated" || event.type == "folderRestore") {
				if (getCurrentParent() == event.data.parent) {
					const masterKeys = (await db.get("masterKeys")) || []
					const sortBy = (await db.get("sortBy")) || {}
					const decrypted = await decryptFolderName(event.data.name, masterKeys)

					if (typeof decrypted == "string") {
						if (decrypted.length > 0) {
							setItems(prev => {
								if (
									getCurrentParent() == event.data.parent &&
									prev.filter(item => item.uuid == event.data.uuid).length == 0
								) {
									const newFolderItem: ItemProps = {
										type: "folder",
										parent: event.data.parent,
										uuid: event.data.uuid,
										name: striptags(decrypted),
										size: 0,
										mime: "Folder",
										lastModified: convertTimestampToMs(event.data.timestamp),
										lastModifiedSort: convertTimestampToMs(event.data.timestamp),
										timestamp: event.data.timestamp,
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
										bucket: "",
										region: ""
									}

									setItems(prev =>
										orderItemsByType(
											[...prev, ...[{ ...newFolderItem, selected: false }]],
											sortBy[window.location.href],
											window.location.href
										)
									)
								}

								return prev
							})
						}
					}
				}
			} else if (event.type == "fileNew" || event.type == "fileRestore" || event.type == "fileArchiveRestored") {
				if (getCurrentParent() == event.data.parent) {
					const masterKeys = (await db.get("masterKeys")) || []
					const sortBy = (await db.get("sortBy")) || {}
					const decrypted = await decryptFileMetadata(event.data.metadata, masterKeys)

					if (typeof decrypted.name == "string") {
						if (decrypted.name.length > 0) {
							setItems(prev => {
								if (
									getCurrentParent() == event.data.parent &&
									prev.filter(item => item.uuid == event.data.uuid).length == 0
								) {
									const newItem: ItemProps = {
										root: "",
										type: "file",
										uuid: event.data.uuid,
										name: striptags(decrypted.name),
										size: decrypted.size,
										mime: striptags(decrypted.mime),
										lastModified: convertTimestampToMs(decrypted.lastModified),
										lastModifiedSort: convertTimestampToMs(decrypted.lastModified),
										timestamp: event.data.timestamp,
										selected: false,
										color: "default",
										parent: event.data.parent,
										rm: event.data.rm,
										version: event.data.version,
										sharerEmail: "",
										sharerId: 0,
										receiverEmail: "",
										receiverId: 0,
										writeAccess: false,
										chunks: event.data.chunks,
										favorited: 0,
										key: striptags(decrypted.key),
										bucket: event.data.bucket,
										region: event.data.region
									}

									return orderItemsByType(
										[...prev, ...[{ ...newItem, selected: false }]],
										sortBy[window.location.href],
										window.location.href
									)
								}

								return prev
							})
						}
					}
				}
			} else if (event.type == "fileMove" || event.type == "folderMove") {
				if (getCurrentParent() == event.data.parent) {
					const masterKeys = (await db.get("masterKeys")) || []
					const sortBy = (await db.get("sortBy")) || {}

					if (event.type == "fileMove") {
						const decrypted = await decryptFileMetadata(event.data.metadata, masterKeys)

						if (typeof decrypted.name == "string") {
							if (decrypted.name.length > 0) {
								setItems(prev => {
									if (
										getCurrentParent() == event.data.parent &&
										prev.filter(item => item.uuid == event.data.uuid).length == 0
									) {
										const newItem: ItemProps = {
											root: "",
											type: "file",
											uuid: event.data.uuid,
											name: striptags(decrypted.name),
											size: decrypted.size,
											mime: striptags(decrypted.mime),
											lastModified: convertTimestampToMs(decrypted.lastModified),
											lastModifiedSort: convertTimestampToMs(decrypted.lastModified),
											timestamp: event.data.timestamp,
											selected: false,
											color: "default",
											parent: event.data.parent,
											rm: event.data.rm,
											version: event.data.version,
											sharerEmail: "",
											sharerId: 0,
											receiverEmail: "",
											receiverId: 0,
											writeAccess: false,
											chunks: event.data.chunks,
											favorited: 0,
											key: striptags(decrypted.key),
											bucket: event.data.bucket,
											region: event.data.region
										}

										return orderItemsByType(
											[...prev, ...[{ ...newItem, selected: false }]],
											sortBy[window.location.href],
											window.location.href
										)
									}

									return prev
								})
							}
						}
					} else {
						const decrypted = await decryptFolderName(event.data.name, masterKeys)

						if (typeof decrypted == "string") {
							if (decrypted.length > 0) {
								setItems(prev => {
									if (
										getCurrentParent() == event.data.parent &&
										prev.filter(item => item.uuid == event.data.uuid).length == 0
									) {
										const newFolderItem: ItemProps = {
											type: "folder",
											parent: event.data.parent,
											uuid: event.data.uuid,
											name: striptags(decrypted),
											size: 0,
											mime: "Folder",
											lastModified: convertTimestampToMs(event.data.timestamp),
											lastModifiedSort: convertTimestampToMs(event.data.timestamp),
											timestamp: event.data.timestamp,
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
											bucket: "",
											region: ""
										}

										return orderItemsByType(
											[...prev, ...[{ ...newFolderItem, selected: false }]],
											sortBy[window.location.href],
											window.location.href
										)
									}

									return prev
								})
							}
						}
					}
				} else {
					setItems(prev => prev.filter(item => item.uuid !== event.data.uuid))
				}
			} else if (event.type == "trashEmpty") {
				if (window.location.href.indexOf("trash") !== -1) {
					setItems([])
				}
			}
		})

		const socketEventReloadSizesListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			if (
				event.type == "fileArchived" ||
				event.type == "fileTrash" ||
				event.type == "folderTrash" ||
				event.type == "folderSubCreated" ||
				event.type == "folderRestore" ||
				event.type == "fileNew" ||
				event.type == "fileRestore" ||
				event.type == "fileArchiveRestored" ||
				event.type == "fileMove" ||
				event.type == "folderMove"
			) {
				debounceReloadSizesEvent()
			}
		})

		return () => {
			window.removeEventListener("keydown", windowOnKeyDown)
			window.removeEventListener("focus", windowOnFocus)

			document.body.removeEventListener("mousedown", mouseDownListener)
			document.body.removeEventListener("mouseup", resetDragSelect)
			document.body.removeEventListener("mousemove", mouseMoveListener)
			document.body.removeEventListener("click", bodyOnClickListener)
			document.body.removeEventListener("drop", bodyOnDropListener)
			document.body.removeEventListener("dragleave", bodyOnDragLeaveListener)
			document.body.removeEventListener("dragover", bodyOnDragOverListener)

			dismissToast(transfersToastId)

			updateListListener.remove()
			itemFavoritedListener.remove()
			itemMovedListener.remove()
			itemRestoredListener.remove()
			fileUploadedListener.remove()
			addFolderListener.remove()
			itemColorChangedListener.remove()
			updateItemListener.remove()
			socketEventListener.remove()
			socketEventReloadSizesListener.remove()
		}
	}, [])

	if (!initDone) {
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
		<Flex
			className="full-viewport"
			flexDirection="column"
			backgroundColor={getColor(darkMode, "backgroundPrimary")}
			overflow="hidden"
			onDragOver={e => {
				e.preventDefault()

				if (e.clientX > 0 && e.clientY > 0) {
					setItemDragState(prev => ({
						...prev,
						clientX: e.clientX,
						clientY: e.clientY
					}))
				}
			}}
		>
			<input
				type="file"
				id="folder-input"
				multiple={true}
				// @ts-ignore
				directory=""
				webkitdirectory=""
				mozdirectory=""
				onChange={e => {
					if (!e.target.files) {
						e.target.value = ""

						return
					}

					const preparingToast = showToast("loading", i18n(lang, "preparingFilesDots"))

					const files = e.target.files
					const toUpload = []

					for (let i = 0; i < files.length; i++) {
						if (typeof files[i].webkitRelativePath !== "string") {
							continue
						}

						if (files[i].webkitRelativePath.length <= 0) {
							continue
						}

						Object.defineProperty(files[i], "fullPath", {
							value: files[i].webkitRelativePath,
							writable: true
						})

						toUpload.push(files[i])
					}

					eventListener.emit("openUploadModal", {
						files: toUpload.filter(file => file.size > 0),
						openModal: true
					})

					dismissToast(preparingToast)

					e.target.value = ""
				}}
				style={{
					display: "none"
				}}
			/>
			<input
				type="file"
				id="file-input"
				multiple={true}
				onChange={e => {
					if (!e.target.files) {
						e.target.value = ""

						return
					}

					const preparingToast = showToast("loading", i18n(lang, "preparingFilesDots"))

					const files = e.target.files
					const toUpload = []

					for (let i = 0; i < files.length; i++) {
						Object.defineProperty(files[i], "fullPath", {
							value: files[i].name,
							writable: true
						})

						toUpload.push(files[i])
					}

					eventListener.emit("openUploadModal", {
						files: toUpload.filter(file => file.size > 0),
						openModal: true
					})

					dismissToast(preparingToast)

					e.target.value = ""
				}}
				style={{
					display: "none"
				}}
			/>
			<input
				type="file"
				id="file-input-chat"
				multiple={true}
				onChange={e => {
					if (!e.target.files) {
						e.target.value = ""

						return
					}

					const preparingToast = showToast("loading", i18n(lang, "preparingFilesDots"))

					const files = e.target.files
					const toUpload = []

					for (let i = 0; i < files.length; i++) {
						Object.defineProperty(files[i], "fullPath", {
							value: files[i].name,
							writable: true
						})

						toUpload.push(files[i])
					}

					const requestId = window.location.href

					const sub = eventListener.on("uploadsDone", ({ requestId: rId, items }: { requestId: string; items: ItemProps[] }) => {
						if (rId === requestId) {
							sub.remove()

							eventListener.emit("chatAddFiles", {
								conversation: getCurrentParent(requestId),
								items
							})
						}
					})

					eventListener.emit("openUploadModal", {
						files: toUpload.filter(file => file.size > 0),
						openModal: true,
						chatUpload: true,
						requestId
					})

					dismissToast(preparingToast)

					e.target.value = ""
				}}
				style={{
					display: "none"
				}}
			/>
			<Flex
				width="100%"
				height={windowHeight + "px"}
			>
				<Sidebar
					darkMode={darkMode}
					isMobile={isMobile}
					sidebarWidth={sidebarWidth}
					windowHeight={windowHeight}
					lang={lang}
					items={items}
					setItems={setItems}
					setActiveItem={setActiveItem}
				/>
				<Flex
					width={windowWidth - sidebarWidth + "px"}
					height="100%"
					flexDirection="column"
					outline="none"
				>
					{location.hash.indexOf("account") === -1 &&
						location.hash.indexOf("chats") === -1 &&
						location.hash.indexOf("notes") === -1 &&
						location.hash.indexOf("contacts") === -1 && (
							<Topbar
								darkMode={darkMode}
								isMobile={isMobile}
								windowWidth={windowWidth}
								lang={lang}
								searchTerm={searchTerm}
								setSearchTerm={setSearchTerm}
							/>
						)}
					{location.hash.indexOf("account") !== -1 ? (
						<Account
							darkMode={darkMode}
							isMobile={isMobile}
							windowWidth={windowWidth}
							windowHeight={windowHeight}
							sidebarWidth={sidebarWidth}
							lang={lang}
						/>
					) : location.hash.indexOf("chats") !== -1 ? (
						<Chats
							darkMode={darkMode}
							isMobile={isMobile}
							windowWidth={windowWidth}
							windowHeight={windowHeight}
							sidebarWidth={sidebarWidth}
							lang={lang}
						/>
					) : location.hash.indexOf("notes") !== -1 ? (
						<Notes
							sidebarWidth={sidebarWidth}
							isMobile={isMobile}
							windowHeight={windowHeight}
							windowWidth={windowWidth}
						/>
					) : location.hash.indexOf("contacts") !== -1 ? (
						<Contacts
							sidebarWidth={sidebarWidth}
							isMobile={isMobile}
							darkMode={darkMode}
							windowWidth={windowWidth}
							lang={lang}
						/>
					) : (
						<>
							<Breadcrumbs
								darkMode={darkMode}
								isMobile={isMobile}
								lang={lang}
								gridFolders={gridFolders}
								setGridFolders={setGridFolders}
								items={items}
							/>
							<ListHeader
								darkMode={darkMode}
								isMobile={isMobile}
								items={items}
								setItems={setItems}
								loadingItems={loadingItems}
								listWidth={windowWidth - sidebarWidth}
								lang={lang}
							/>
							<List
								darkMode={darkMode}
								isMobile={isMobile}
								windowWidth={windowWidth}
								windowHeight={windowHeight}
								sidebarWidth={sidebarWidth}
								items={filteredSearchItems}
								setItems={setItems}
								setActiveItem={setActiveItem}
								setItemDragState={setItemDragState}
								setDragSelectState={setDragSelectState}
								loadingItems={loadingItems}
								gridFolders={gridFolders}
								lang={lang}
								searchTerm={searchTerm}
							/>
						</>
					)}
				</Flex>
			</Flex>
			<DragSelect
				darkMode={darkMode}
				dragSelectState={dragSelectState}
			/>
			<ItemDragTooltip
				darkMode={darkMode}
				isMobile={isMobile}
				itemDragState={itemDragState}
			/>
			<ContextMenus
				darkMode={darkMode}
				isMobile={isMobile}
				items={items}
				lang={lang}
				activeItem={activeItem}
			/>
			<UploadModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				lang={lang}
				items={items}
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
			<RenameModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<CreateFolderModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<DeleteModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<ShareModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<StopSharingModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<RemoveSharedInModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<PublicLinkModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<MoveModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<DeletePermanentlyModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<EmptryTrashModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<DragAndDropModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				open={showDragAndDropModal}
				setOpen={setShowDragAndDropModal}
				lang={lang}
			/>
			<EventInfoModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				lang={lang}
			/>
			<VersionsModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
			<SharedWithInfoModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
			<MaxStorageModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
			<CreateTextFileModal
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<CreateTextFileModalEditor
				darkMode={darkMode}
				isMobile={isMobile}
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				items={items}
				setItems={setItems}
				lang={lang}
			/>
			<SelectFromCloud
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
			<UserProfileModal />
		</Flex>
	)
})

export default Drive
