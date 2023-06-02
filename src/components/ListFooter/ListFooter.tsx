import { memo, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import { ListFooterProps, ItemProps } from "../../types"
import AppText from "../AppText"
import { getColor } from "../../styles/colors"
import { formatBytes } from "../../lib/helpers"
import { MdOutlineDownloading, MdShare, MdFavorite, MdFavoriteBorder, MdEditNote } from "react-icons/md"
import { normalDownload, zipDownload } from "../../lib/services/download"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { ONE_YEAR } from "../../lib/constants"
import eventListener from "../../lib/eventListener"
import { useLocation } from "react-router-dom"
import { getFilePreviewType, getFileExt } from "../../lib/helpers"
import { markAsFavorite } from "../../lib/services/favorites"
import { IoMove, IoTrashBinOutline } from "react-icons/io5"
import { i18n } from "../../i18n"

const ListFooter = memo(
	({ darkMode, isMobile, items, loadingItems, listScrollState, windowWidth, sidebarWidth, lang }: ListFooterProps) => {
		const location = useLocation()

		const [
			selected,
			selectedCount,
			fileCount,
			folderCount,
			canEdit,
			canPreview,
			favoriteEnabledCount,
			favoriteDisabledCount,
			selectedItemsSize
		] = useMemo(() => {
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
			const selectedItemsSize: number = selected
				.filter(item => typeof item.size === "number" && !isNaN(item.size) && item.size >= 0)
				.reduce((a, b) => a + b.size, 0)

			return [
				selected,
				selectedCount,
				fileCount,
				folderCount,
				canEdit,
				canPreview,
				favoriteEnabledCount,
				favoriteDisabledCount,
				selectedItemsSize
			]
		}, [items, location])

		if (
			loadingItems ||
			items.length == 0 ||
			listScrollState.scrollHeight - listScrollState.clientHeight - 50 < listScrollState.scrollTop
		) {
			if (listScrollState.scrollHeight >= listScrollState.clientHeight) {
				return null
			}
		}

		if (selectedCount == 0) {
			return null
		}

		return (
			<Flex
				height={isMobile ? "45px" : "55px"}
				width={windowWidth - sidebarWidth + "px"}
				position="fixed"
				bottom="0px"
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				borderTop={"3px solid " + getColor(darkMode, "backgroundPrimary")}
				zIndex={10001}
				flexDirection="row"
				justifyContent="space-between"
				alignItems="center"
				paddingLeft="15px"
				paddingRight="15px"
			>
				<Flex
					flexDirection="row"
					alignItems="center"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
					>
						{i18n(
							lang,
							"listFooterSelected",
							true,
							["__COUNT__", "__TOTAL__"],
							[selectedCount.toString(), items.length.toString()]
						)}
					</AppText>
					<Flex
						width="auto"
						height="auto"
						padding="5px"
						paddingLeft="10px"
						paddingRight="10px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						borderRadius="20px"
						marginLeft="15px"
						marginTop="2px"
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							fontSize={12}
						>
							{formatBytes(selectedItemsSize)}
						</AppText>
					</Flex>
				</Flex>
				{!isMobile && selectedCount > 0 && (
					<Flex>
						<Flex
							backgroundColor="transparent"
							color={getColor(darkMode, "textSecondary")}
							_hover={{
								backgroundColor: getColor(darkMode, "backgroundPrimary"),
								color: getColor(darkMode, "textPrimary")
							}}
							padding="5px"
							paddingLeft="10px"
							paddingRight="10px"
							borderRadius="5px"
							cursor="pointer"
							onClick={() => {
								if (folderCount > 0 || fileCount >= 2) {
									const downloadingToast = showToast("loading", "Preparing download", "bottom", ONE_YEAR)

									zipDownload(selected, () => {
										dismissToast(downloadingToast)
									}).catch(err => {
										console.error(err)

										showToast("error", err.toString(), "bottom", 5000)

										dismissToast(downloadingToast)
									})
								} else {
									const downloadingToast = showToast("loading", "Preparing download", "bottom", ONE_YEAR)

									normalDownload(selected, () => {
										dismissToast(downloadingToast)
									}).catch(err => {
										console.error(err)

										showToast("error", err.toString(), "bottom", 5000)

										dismissToast(downloadingToast)
									})
								}
							}}
						>
							<MdOutlineDownloading fontSize={24} />
						</Flex>
						{location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Flex
									backgroundColor="transparent"
									color={getColor(darkMode, "textSecondary")}
									_hover={{
										backgroundColor: getColor(darkMode, "backgroundPrimary"),
										color: getColor(darkMode, "textPrimary")
									}}
									padding="5px"
									paddingLeft="10px"
									paddingRight="10px"
									borderRadius="5px"
									cursor="pointer"
									onClick={() => {
										eventListener.emit("openShareModal", {
											items: selected
										})
									}}
								>
									<MdShare fontSize={22} />
								</Flex>
							)}
						{favoriteEnabledCount > 0 &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Flex
									backgroundColor="transparent"
									color={getColor(darkMode, "textSecondary")}
									_hover={{
										backgroundColor: getColor(darkMode, "backgroundPrimary"),
										color: getColor(darkMode, "textPrimary")
									}}
									padding="5px"
									paddingLeft="10px"
									paddingRight="10px"
									borderRadius="5px"
									cursor="pointer"
									onClick={() => markAsFavorite(selected, 0)}
								>
									<MdFavoriteBorder fontSize={22} />
								</Flex>
							)}
						{favoriteDisabledCount > 0 &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Flex
									backgroundColor="transparent"
									color={getColor(darkMode, "textSecondary")}
									_hover={{
										backgroundColor: getColor(darkMode, "backgroundPrimary"),
										color: getColor(darkMode, "textPrimary")
									}}
									padding="5px"
									paddingLeft="10px"
									paddingRight="10px"
									borderRadius="5px"
									cursor="pointer"
									onClick={() => markAsFavorite(selected, 1)}
								>
									<MdFavorite fontSize={22} />
								</Flex>
							)}
						{(fileCount == 1 || folderCount == 1) &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Flex
									backgroundColor="transparent"
									color={getColor(darkMode, "textSecondary")}
									_hover={{
										backgroundColor: getColor(darkMode, "backgroundPrimary"),
										color: getColor(darkMode, "textPrimary")
									}}
									padding="5px"
									paddingLeft="10px"
									paddingRight="10px"
									borderRadius="5px"
									cursor="pointer"
									onClick={() => {
										eventListener.emit("openRenameModal", {
											item: selected[0]
										})
									}}
								>
									<MdEditNote fontSize={22} />
								</Flex>
							)}
						{fileCount + folderCount > 0 &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<>
									<Flex
										backgroundColor="transparent"
										color={getColor(darkMode, "textSecondary")}
										_hover={{
											backgroundColor: getColor(darkMode, "backgroundPrimary"),
											color: getColor(darkMode, "textPrimary")
										}}
										padding="5px"
										paddingLeft="10px"
										paddingRight="10px"
										borderRadius="5px"
										cursor="pointer"
										onClick={() => {
											eventListener.emit("openMoveModal", {
												items: selected
											})
										}}
									>
										<IoMove fontSize={22} />
									</Flex>
									<Flex
										backgroundColor="transparent"
										color={getColor(darkMode, "textSecondary")}
										_hover={{
											backgroundColor: getColor(darkMode, "backgroundPrimary"),
											color: getColor(darkMode, "textPrimary")
										}}
										padding="5px"
										paddingLeft="10px"
										paddingRight="10px"
										borderRadius="5px"
										cursor="pointer"
										onClick={() => {
											eventListener.emit("openDeleteModal", {
												items: selected
											})
										}}
									>
										<IoTrashBinOutline fontSize={22} />
									</Flex>
								</>
							)}
					</Flex>
				)}
			</Flex>
		)
	}
)

export default ListFooter
