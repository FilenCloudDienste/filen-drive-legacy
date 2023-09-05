import { memo, useMemo, useRef, useState, useEffect, useCallback } from "react"
import {
	Menu as ContextMenu,
	Item as ContextMenuItem,
	Separator as ContextMenuSeparator,
	Submenu as ContextMenuSubmenu,
	contextMenu,
	animation
} from "react-contexify"
import { normalDownload, zipDownload } from "../../lib/services/download"
import db from "../../lib/db"
import { ItemProps, ContextMenusProps, MoveSubmenuProps, FolderColors } from "../../types"
import { getFileExt, getFilePreviewType, getFolderColor, getCurrentParent } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { markAsFavorite } from "../../lib/services/favorites"
import { loadSidebarItems } from "../../lib/services/items"
import { Spinner, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { moveToParent } from "../../lib/services/move"
import { useLocation } from "react-router-dom"
import { restoreFromTrash } from "../../lib/services/restore"
import useDb from "../../lib/hooks/useDb"
import { changeColor } from "../../lib/services/color"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { IoChevronForward } from "react-icons/io5"
import { ONE_YEAR } from "../../lib/constants"
import { i18n } from "../../i18n"
import { PREVIEW_MAX_SIZE } from "../../lib/constants"

const MoveSubmenu = memo(({ parent, load, uuid, darkMode, isMobile, items, lang }: MoveSubmenuProps) => {
	const didLoad = useRef<boolean>(false)
	const [loaded, setLoaded] = useState<boolean>(false)
	const [folders, setFolders] = useState<ItemProps[]>([])
	const [triggerLoad, setTriggerLoad] = useState<boolean>(false)
	const [preloadFolders, setPreloadFolders] = useDb("loadSidebarItems:" + uuid, [])

	const [selected, selectedIncludesSelf, selectedIsInsideParent] = useMemo(() => {
		const selected: ItemProps[] = items.filter(item => item.selected)
		const selectedIncludesSelf: boolean = selected.filter(item => item.uuid == uuid).length > 0
		const selectedIsInsideParent: boolean = selected.filter(item => item.parent == uuid).length > 0

		return [selected, selectedIncludesSelf, selectedIsInsideParent]
	}, [items])

	const move = useCallback(async (): Promise<void> => {
		contextMenu.hideAll()

		if (selected.length == 0) {
			return
		}

		let moveUUID: string = uuid

		if (moveUUID == "base") {
			moveUUID = await db.get("defaultDriveUUID")
		}

		moveToParent(selected, moveUUID)
	}, [uuid])

	const fetchFolders = useCallback((uuid: string, skipCache: boolean = false): Promise<{ cache: boolean; items: ItemProps[] }> => {
		return new Promise((resolve, reject) => {
			if (uuid == "base") {
				db.get("defaultDriveUUID")
					.then(defaultDriveUUID => {
						loadSidebarItems(defaultDriveUUID, skipCache).then(resolve).catch(reject)
					})
					.catch(reject)
			} else {
				loadSidebarItems(uuid, skipCache).then(resolve).catch(reject)
			}
		})
	}, [])

	const loadFolders = useCallback((uuid: string, skipCache: boolean = false) => {
		fetchFolders(uuid, skipCache)
			.then(data => {
				setFolders(data.items)
				setLoaded(true)

				if (data.cache) {
					loadFolders(uuid, true)
				}
			})
			.catch(console.error)
	}, [])

	useEffect(() => {
		if (Array.isArray(preloadFolders)) {
			if (preloadFolders.length > 0) {
				setFolders(preloadFolders)
			}
		}
	}, [preloadFolders])

	useEffect(() => {
		if (!load) {
			return
		}

		if (didLoad.current) {
			return
		}

		didLoad.current = true

		loadFolders(uuid, false)
	}, [load])

	if (!loaded && Array.isArray(preloadFolders) && preloadFolders.length == 0) {
		return (
			<ContextMenuItem>
				<Spinner
					width="16px"
					height="16px"
					color={getColor(darkMode, "textPrimary")}
				/>
			</ContextMenuItem>
		)
	}

	if (selectedIncludesSelf) {
		return (
			<ContextMenuItem>
				<Flex
					width="100%"
					height="100%"
					maxWidth="140px"
					cursor="not-allowed"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						cursor="not-allowed"
					>
						{uuid == "base" ? i18n(lang, "cloudDrive") : parent}
					</AppText>
				</Flex>
			</ContextMenuItem>
		)
	}

	if (folders.length == 0) {
		return (
			<ContextMenuItem>
				<Flex
					onClick={() => move()}
					width="100%"
					height="100%"
					maxWidth="140px"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
					>
						{uuid == "base" ? i18n(lang, "cloudDrive") : parent}
					</AppText>
				</Flex>
			</ContextMenuItem>
		)
	}

	return (
		<ContextMenuSubmenu
			arrow={<IoChevronForward fontSize={16} />}
			label={
				<Flex
					onClick={() => {
						if (selectedIsInsideParent || selectedIncludesSelf) {
							return
						}

						move()
					}}
					width="100%"
					height="100%"
					maxWidth="140px"
					cursor={selectedIsInsideParent ? "not-allowed" : "pointer"}
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
					>
						{uuid == "base" ? i18n(lang, "cloudDrive") : parent}
					</AppText>
				</Flex>
			}
			onMouseEnter={() => setTriggerLoad(true)}
		>
			{folders.map(folder => {
				return (
					<MoveSubmenu
						key={folder.uuid}
						parent={folder.name}
						uuid={folder.uuid}
						load={triggerLoad}
						darkMode={darkMode}
						isMobile={isMobile}
						items={items}
						lang={lang}
					/>
				)
			})}
		</ContextMenuSubmenu>
	)
})

const ContextMenus = memo(({ darkMode, isMobile, items, lang, activeItem }: ContextMenusProps) => {
	const location = useLocation()

	const [selected, selectedCount, fileCount, folderCount, canEdit, canPreview, favoriteEnabledCount, favoriteDisabledCount] =
		useMemo(() => {
			const selected: ItemProps[] = items.filter(item => item.selected)
			const selectedCount: number = selected.length
			const fileCount: number = items.filter(item => item.selected && item.type == "file").length
			const folderCount: number = items.filter(item => item.selected && item.type == "folder").length
			const canEdit: boolean =
				selectedCount == 1 &&
				fileCount == 1 &&
				folderCount == 0 &&
				items.filter(
					item => item.selected && item.type == "file" && ["text", "code"].includes(getFilePreviewType(getFileExt(item.name)))
				).length == 1 &&
				location.hash.indexOf("shared-in") == -1
			const canPreview: boolean =
				selectedCount == 1 &&
				fileCount == 1 &&
				folderCount == 0 &&
				items.filter(item => item.selected && item.type == "file" && getFilePreviewType(getFileExt(item.name)) !== "none").length ==
					1
			const favoriteEnabledCount: number = selected.filter(item => item.favorited == 1).length
			const favoriteDisabledCount: number = selected.filter(item => item.favorited == 0).length

			return [selected, selectedCount, fileCount, folderCount, canEdit, canPreview, favoriteEnabledCount, favoriteDisabledCount]
		}, [items, location])

	const deleteItems = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (passedItem) {
				eventListener.emit("openDeleteModal", {
					items: [passedItem]
				})
			}

			if (selected.length == 0) {
				return
			}

			eventListener.emit("openDeleteModal", {
				items: selected
			})
		},
		[selected, activeItem]
	)

	const deleteItemsPermanently = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				eventListener.emit("openDeletePermanentlyModal", {
					items: [passedItem]
				})
			}

			if (selected.length == 0) {
				return
			}

			eventListener.emit("openDeletePermanentlyModal", {
				items: selected
			})
		},
		[selected, activeItem]
	)

	const removeSharedIn = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				eventListener.emit("openRemoveSharedInModal", {
					items: [passedItem]
				})
			}

			if (selected.length == 0) {
				return
			}

			eventListener.emit("openRemoveSharedInModal", {
				items: selected
			})
		},
		[selected, activeItem]
	)

	const stopSharing = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				eventListener.emit("openStopSharingModal", {
					items: [passedItem]
				})
			}

			if (selected.length == 0) {
				return
			}

			eventListener.emit("openStopSharingModal", {
				items: selected
			})
		},
		[selected, activeItem]
	)

	const shareItems = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				eventListener.emit("openShareModal", {
					items: [passedItem]
				})
			}

			eventListener.emit("openShareModal", {
				items: selected
			})
		},
		[selected, activeItem]
	)

	const publicLink = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				eventListener.emit("openPublicLinkModal", {
					item: passedItem
				})
			}

			if (selected.length !== 1) {
				return
			}

			eventListener.emit("openPublicLinkModal", {
				item: selected[0]
			})
		},
		[selected, activeItem]
	)

	const versions = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				eventListener.emit("openVersionsModal", {
					items: passedItem
				})
			}

			if (selected.length !== 1) {
				return
			}

			eventListener.emit("openVersionsModal", {
				item: selected[0]
			})
		},
		[selected, activeItem]
	)

	const moveModal = useCallback(
		(passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				eventListener.emit("openMoveModal", {
					items: [passedItem]
				})
			}

			if (selected.length == 0) {
				return
			}

			eventListener.emit("openMoveModal", {
				items: selected
			})
		},
		[selected, activeItem]
	)

	const color = useCallback(
		(color: FolderColors, passedItem: ItemProps | undefined = undefined) => {
			if (typeof passedItem !== "undefined") {
				changeColor([passedItem], color)

				return
			}

			if (selected.length == 0) {
				return
			}

			changeColor(selected, color)
		},
		[selected, activeItem]
	)

	const createTextFile = useCallback(() => {
		eventListener.emit("openCreateTextFileModal")
	}, [])

	return (
		<>
			<ContextMenu
				id="mainContextMenu"
				animation={{
					enter: animation.fade,
					exit: false
				}}
				theme={darkMode ? "filendark" : "filenlight"}
			>
				<ContextMenuItem
					onClick={() => eventListener.emit("openCreateFolderModal")}
					className="react-contexify__item_brt"
				>
					{i18n(lang, "createFolder")}
				</ContextMenuItem>
				<ContextMenuItem onClick={() => createTextFile()}>{i18n(lang, "createTextFile")}</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={() => document.getElementById("file-input")?.click()}>
					{i18n(lang, "uploadFiles")}
				</ContextMenuItem>
				<ContextMenuItem
					onClick={() => document.getElementById("folder-input")?.click()}
					className="react-contexify__item_brb"
				>
					{i18n(lang, "uploadFolders")}
				</ContextMenuItem>
			</ContextMenu>
			<ContextMenu
				id="itemsContextMenu"
				animation={{
					enter: animation.fade,
					exit: false
				}}
				theme={darkMode ? "filendark" : "filenlight"}
			>
				{selectedCount == 1 && canPreview && selected[0].size < PREVIEW_MAX_SIZE && (
					<>
						<ContextMenuItem
							onClick={() => {
								eventListener.emit("openPreviewModal", {
									item: items.filter(item => item.selected)[0]
								})
							}}
						>
							{canEdit ? i18n(lang, "edit") : i18n(lang, "preview")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				<ContextMenuItem
					onClick={() => {
						const downloadingToast = showToast("loading", i18n(lang, "preparingDownload"), "bottom", ONE_YEAR)

						normalDownload(selected, () => {
							dismissToast(downloadingToast)
						}).catch(err => {
							console.error(err)

							showToast("error", err.toString(), "bottom", 5000)

							dismissToast(downloadingToast)
						})
					}}
				>
					{i18n(lang, "download")}
				</ContextMenuItem>
				{location.pathname.indexOf("/f/") == -1 && <ContextMenuSeparator />}
				{location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && (
						<>
							{selectedCount == 1 && (
								<ContextMenuItem onClick={() => publicLink()}>{i18n(lang, "publicLink")}</ContextMenuItem>
							)}
							<ContextMenuItem onClick={() => shareItems()}>{i18n(lang, "share")}</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
				{fileCount == 1 &&
					folderCount == 0 &&
					location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && (
						<>
							<ContextMenuItem onClick={() => versions()}>{i18n(lang, "versions")}</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
				{fileCount == 0 &&
					location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && (
						<ContextMenuSubmenu
							label={i18n(lang, "color")}
							arrow={<IoChevronForward fontSize={16} />}
						>
							<ContextMenuItem onClick={() => color("default")}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("default")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_default")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("blue")}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("blue")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_blue")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("green")}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("green")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_green")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("purple")}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("purple")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_purple")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("red")}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("red")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_red")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("gray")}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("gray")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_gray")}</Flex>
								</Flex>
							</ContextMenuItem>
						</ContextMenuSubmenu>
					)}
				{favoriteEnabledCount > 0 &&
					location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && (
						<ContextMenuItem onClick={() => markAsFavorite(selected, 0)}>{i18n(lang, "unfavorite")}</ContextMenuItem>
					)}
				{favoriteDisabledCount > 0 &&
					location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && (
						<ContextMenuItem onClick={() => markAsFavorite(selected, 1)}>{i18n(lang, "favorite")}</ContextMenuItem>
					)}
				{(favoriteEnabledCount + favoriteDisabledCount > 0 || fileCount == 0) &&
					location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && <ContextMenuSeparator />}
				{(fileCount == 1 || folderCount == 1) &&
					location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && (
						<>
							<ContextMenuItem
								onClick={() => {
									eventListener.emit("openRenameModal", {
										item: selected[0]
									})
								}}
							>
								{i18n(lang, "rename")}
							</ContextMenuItem>
						</>
					)}
				{fileCount + folderCount > 0 &&
					location.hash.indexOf("trash") == -1 &&
					location.hash.indexOf("shared-in") == -1 &&
					location.pathname.indexOf("/f/") == -1 && (
						<>
							{location.hash.indexOf("shared-out") == -1 && (
								<ContextMenuSubmenu
									label={i18n(lang, "move")}
									arrow={<IoChevronForward fontSize={16} />}
								>
									<ContextMenuItem onClick={() => moveModal()}>{i18n(lang, "selectDestination")}</ContextMenuItem>
									<ContextMenuSeparator />
									<MoveSubmenu
										parent={i18n(lang, "move")}
										uuid="base"
										load={true}
										darkMode={darkMode}
										isMobile={isMobile}
										items={items}
										lang={lang}
									/>
								</ContextMenuSubmenu>
							)}
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => deleteItems()}>
								<Flex color={getColor(darkMode, "red")}>{i18n(lang, "trash")}</Flex>
							</ContextMenuItem>
						</>
					)}
				{location.hash.indexOf("trash") !== -1 && location.pathname.indexOf("/f/") == -1 && (
					<>
						<ContextMenuItem onClick={() => restoreFromTrash(items.filter(item => item.selected))}>
							{i18n(lang, "restore")}
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => deleteItemsPermanently()}>
							<Flex color={getColor(darkMode, "red")}>{i18n(lang, "deletePerm")}</Flex>
						</ContextMenuItem>
					</>
				)}
				{location.hash.indexOf("shared-in") !== -1 && location.pathname.indexOf("/f/") == -1 && getCurrentParent().length < 32 && (
					<ContextMenuItem onClick={() => removeSharedIn()}>
						<Flex color={getColor(darkMode, "red")}>{i18n(lang, "remove")}</Flex>
					</ContextMenuItem>
				)}
				{location.hash.indexOf("shared-out") !== -1 && location.pathname.indexOf("/f/") == -1 && getCurrentParent().length < 32 && (
					<ContextMenuItem onClick={() => stopSharing()}>
						<Flex color={getColor(darkMode, "red")}>{i18n(lang, "stopSharing")}</Flex>
					</ContextMenuItem>
				)}
			</ContextMenu>
			<ContextMenu
				id="sidebarContextMenu"
				animation={{
					enter: animation.fade,
					exit: false
				}}
				theme={darkMode ? "filendark" : "filenlight"}
			>
				{activeItem && typeof activeItem !== "undefined" && (
					<>
						<ContextMenuItem
							onClick={() => {
								const downloadingToast = showToast("loading", i18n(lang, "preparingDownload"), "bottom", ONE_YEAR)

								normalDownload([activeItem], () => {
									dismissToast(downloadingToast)
								}).catch(err => {
									console.error(err)

									showToast("error", err.toString(), "bottom", 5000)

									dismissToast(downloadingToast)
								})
							}}
						>
							{i18n(lang, "download")}
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => publicLink(activeItem)}>{i18n(lang, "publicLink")}</ContextMenuItem>
						<ContextMenuItem onClick={() => shareItems(activeItem)}>{i18n(lang, "share")}</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuSubmenu
							label={i18n(lang, "color")}
							arrow={<IoChevronForward fontSize={16} />}
						>
							<ContextMenuItem onClick={() => color("default", activeItem)}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("default")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_default")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("blue", activeItem)}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("blue")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_blue")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("green", activeItem)}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("green")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_green")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("purple", activeItem)}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("purple")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_purple")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("red", activeItem)}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("red")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_red")}</Flex>
								</Flex>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => color("gray", activeItem)}>
								<Flex
									justifyContent="flex-start"
									alignItems="center"
								>
									<Flex
										width="16px"
										height="16px"
										borderRadius="50%"
										backgroundColor={getFolderColor("gray")}
									/>
									<Flex marginLeft="8px">{i18n(lang, "color_gray")}</Flex>
								</Flex>
							</ContextMenuItem>
						</ContextMenuSubmenu>
						{favoriteEnabledCount > 0 && (
							<ContextMenuItem onClick={() => markAsFavorite([activeItem], 0)}>{i18n(lang, "unfavorite")}</ContextMenuItem>
						)}
						{favoriteDisabledCount > 0 && (
							<ContextMenuItem onClick={() => markAsFavorite([activeItem], 1)}>{i18n(lang, "favorite")}</ContextMenuItem>
						)}
						<ContextMenuSeparator />
						<ContextMenuItem
							onClick={() => {
								eventListener.emit("openRenameModal", {
									item: activeItem
								})
							}}
						>
							{i18n(lang, "rename")}
						</ContextMenuItem>
						{location.hash.indexOf("shared-out") == -1 && (
							<ContextMenuSubmenu
								label={i18n(lang, "move")}
								arrow={<IoChevronForward fontSize={16} />}
							>
								<ContextMenuItem onClick={() => moveModal(activeItem)}>{i18n(lang, "selectDestination")}</ContextMenuItem>
								<ContextMenuSeparator />
								<MoveSubmenu
									parent={i18n(lang, "move")}
									uuid="base"
									load={true}
									darkMode={darkMode}
									isMobile={isMobile}
									items={items}
									lang={lang}
								/>
							</ContextMenuSubmenu>
						)}
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => deleteItems(activeItem)}>
							<Flex color={getColor(darkMode, "red")}>{i18n(lang, "trash")}</Flex>
						</ContextMenuItem>
					</>
				)}
			</ContextMenu>
		</>
	)
})

export default ContextMenus
