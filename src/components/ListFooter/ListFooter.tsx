import { memo, useMemo } from "react"
import { Flex, Tooltip } from "@chakra-ui/react"
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
				height="auto"
				width={isMobile ? windowWidth * 0.6 + "px" : "auto"}
				position="fixed"
				bottom="-10px"
				left="50%"
				transform="translate(-50%, -50%)"
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				border={"1px solid " + getColor(darkMode, "borderSecondary")}
				borderRadius="10px"
				zIndex={10001}
				flexDirection="row"
				justifyContent="space-between"
				alignItems="center"
				paddingLeft="10px"
				paddingRight="10px"
				paddingBottom="5px"
				paddingTop="5px"
				boxShadow="sm"
				transition="200ms"
				gap="25px"
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
						backgroundColor={getColor(darkMode, "backgroundTertiary")}
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
						<Tooltip
							label={i18n(lang, "download")}
							placement="top"
							borderRadius="5px"
							backgroundColor={getColor(darkMode, "backgroundTertiary")}
							boxShadow="md"
							color={getColor(darkMode, "textSecondary")}
							hasArrow={true}
						>
							<Flex
								backgroundColor="transparent"
								color={getColor(darkMode, "textSecondary")}
								_hover={{
									backgroundColor: getColor(darkMode, "backgroundPrimary"),
									color: getColor(darkMode, "textPrimary")
								}}
								width="36px"
								height="36px"
								justifyContent="center"
								alignItems="center"
								borderRadius="full"
								cursor="pointer"
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
								<MdOutlineDownloading
									fontSize={24}
									style={{
										flexShrink: 0
									}}
								/>
							</Flex>
						</Tooltip>
						{location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Tooltip
									label={i18n(lang, "share")}
									placement="top"
									borderRadius="5px"
									backgroundColor={getColor(darkMode, "backgroundTertiary")}
									boxShadow="md"
									color={getColor(darkMode, "textSecondary")}
									hasArrow={true}
								>
									<Flex
										backgroundColor="transparent"
										color={getColor(darkMode, "textSecondary")}
										_hover={{
											backgroundColor: getColor(darkMode, "backgroundPrimary"),
											color: getColor(darkMode, "textPrimary")
										}}
										width="36px"
										height="36px"
										justifyContent="center"
										alignItems="center"
										borderRadius="full"
										cursor="pointer"
										onClick={() => {
											eventListener.emit("openShareModal", {
												items: selected
											})
										}}
									>
										<MdShare
											fontSize={22}
											style={{
												flexShrink: 0
											}}
										/>
									</Flex>
								</Tooltip>
							)}
						{favoriteEnabledCount > 0 &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Tooltip
									label={i18n(lang, "unfavorite")}
									placement="top"
									borderRadius="5px"
									backgroundColor={getColor(darkMode, "backgroundTertiary")}
									boxShadow="md"
									color={getColor(darkMode, "textSecondary")}
									hasArrow={true}
								>
									<Flex
										backgroundColor="transparent"
										color={getColor(darkMode, "textSecondary")}
										_hover={{
											backgroundColor: getColor(darkMode, "backgroundPrimary"),
											color: getColor(darkMode, "textPrimary")
										}}
										width="36px"
										height="36px"
										justifyContent="center"
										alignItems="center"
										borderRadius="full"
										cursor="pointer"
										onClick={() => markAsFavorite(selected, 0)}
									>
										<MdFavoriteBorder
											fontSize={22}
											style={{
												flexShrink: 0
											}}
										/>
									</Flex>
								</Tooltip>
							)}
						{favoriteDisabledCount > 0 &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Tooltip
									label={i18n(lang, "favorite")}
									placement="top"
									borderRadius="5px"
									backgroundColor={getColor(darkMode, "backgroundTertiary")}
									boxShadow="md"
									color={getColor(darkMode, "textSecondary")}
									hasArrow={true}
								>
									<Flex
										backgroundColor="transparent"
										color={getColor(darkMode, "textSecondary")}
										_hover={{
											backgroundColor: getColor(darkMode, "backgroundPrimary"),
											color: getColor(darkMode, "textPrimary")
										}}
										width="36px"
										height="36px"
										justifyContent="center"
										alignItems="center"
										borderRadius="full"
										cursor="pointer"
										onClick={() => markAsFavorite(selected, 1)}
									>
										<MdFavorite
											fontSize={22}
											style={{
												flexShrink: 0
											}}
										/>
									</Flex>
								</Tooltip>
							)}
						{(fileCount == 1 || folderCount == 1) &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<Tooltip
									label={i18n(lang, "rename")}
									placement="top"
									borderRadius="5px"
									backgroundColor={getColor(darkMode, "backgroundTertiary")}
									boxShadow="md"
									color={getColor(darkMode, "textSecondary")}
									hasArrow={true}
								>
									<Flex
										backgroundColor="transparent"
										color={getColor(darkMode, "textSecondary")}
										_hover={{
											backgroundColor: getColor(darkMode, "backgroundPrimary"),
											color: getColor(darkMode, "textPrimary")
										}}
										width="36px"
										height="36px"
										justifyContent="center"
										alignItems="center"
										borderRadius="full"
										cursor="pointer"
										onClick={() => {
											eventListener.emit("openRenameModal", {
												item: selected[0]
											})
										}}
									>
										<MdEditNote
											fontSize={22}
											style={{
												flexShrink: 0
											}}
										/>
									</Flex>
								</Tooltip>
							)}
						{fileCount + folderCount > 0 &&
							location.hash.indexOf("trash") == -1 &&
							location.hash.indexOf("shared-in") == -1 &&
							location.pathname.indexOf("/f/") == -1 && (
								<>
									<Tooltip
										label={i18n(lang, "move")}
										placement="top"
										borderRadius="5px"
										backgroundColor={getColor(darkMode, "backgroundTertiary")}
										boxShadow="md"
										color={getColor(darkMode, "textSecondary")}
										hasArrow={true}
									>
										<Flex
											backgroundColor="transparent"
											color={getColor(darkMode, "textSecondary")}
											_hover={{
												backgroundColor: getColor(darkMode, "backgroundPrimary"),
												color: getColor(darkMode, "textPrimary")
											}}
											width="36px"
											height="36px"
											justifyContent="center"
											alignItems="center"
											borderRadius="full"
											cursor="pointer"
											onClick={() => {
												eventListener.emit("openMoveModal", {
													items: selected
												})
											}}
										>
											<IoMove
												fontSize={22}
												style={{
													flexShrink: 0
												}}
											/>
										</Flex>
									</Tooltip>
									<Tooltip
										label={i18n(lang, "trash")}
										placement="top"
										borderRadius="5px"
										backgroundColor={getColor(darkMode, "backgroundTertiary")}
										boxShadow="md"
										color={getColor(darkMode, "textSecondary")}
										hasArrow={true}
									>
										<Flex
											backgroundColor="transparent"
											color={getColor(darkMode, "textSecondary")}
											_hover={{
												backgroundColor: getColor(darkMode, "backgroundPrimary"),
												color: getColor(darkMode, "textPrimary")
											}}
											width="36px"
											height="36px"
											justifyContent="center"
											alignItems="center"
											borderRadius="full"
											cursor="pointer"
											onClick={() => {
												eventListener.emit("openDeleteModal", {
													items: selected
												})
											}}
										>
											<IoTrashBinOutline
												fontSize={22}
												style={{
													flexShrink: 0
												}}
											/>
										</Flex>
									</Tooltip>
								</>
							)}
					</Flex>
				)}
			</Flex>
		)
	}
)

export default ListFooter
