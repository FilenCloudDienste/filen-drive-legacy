import { memo, useState, useEffect, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import type { ListHeaderProps } from "../../types"
import AppText from "../AppText"
import { getColor } from "../../styles/colors"
import useDb from "../../lib/hooks/useDb"
import { IoCaretUp, IoCaretDown } from "react-icons/io5"
import { i18n } from "../../i18n"

const ListHeader = memo(({ darkMode, isMobile, items, setItems, loadingItems, listWidth, lang }: ListHeaderProps) => {
	const [checkAllItems, setCheckAllItems] = useState<boolean>(false)
	const [gridFolders, setGridFolders] = useDb("gridFolders", {})
	const [sortBy, setSortBy] = useDb("sortBy", {})

	const [markerWidth, nameWidth, sizeWidth, lastModifiedWidth, actionsWidth] = useMemo(() => {
		const markerWidth: number = isMobile ? 0 : 35
		const listWidthMinusMarker: number = Math.floor(listWidth - markerWidth)
		const nameWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.5 : 0.7)) - (isMobile ? 8 : 13)
		const sizeWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.2 : 0.1))
		const lastModifiedWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.3 : 0.2))
		const actionsWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0 : 0.05))

		return [markerWidth, nameWidth, sizeWidth, lastModifiedWidth, actionsWidth]
	}, [listWidth, isMobile])

	useEffect(() => {
		if (items.length > 0) {
			if (items.filter(filterItem => filterItem.selected).length == items.length) {
				setCheckAllItems(true)
			} else {
				setCheckAllItems(false)
			}
		}
	}, [items])

	if (!loadingItems && items.length == 0) {
		return null
	}

	if (gridFolders[window.location.href]) {
		return null
	}

	return (
		<Flex
			height="40px"
			width="100%"
			flexDirection="row"
			alignItems="center"
			justifyContent="space-between"
			paddingLeft="15px"
			paddingRight="15px"
			borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
		>
			<Flex
				width={nameWidth + "px"}
				justifyContent="flex-start"
				alignItems="center"
				cursor="pointer"
				onClick={() => {
					setSortBy({
						...sortBy,
						[window.location.href]:
							typeof sortBy[window.location.href] == "undefined" ||
							sortBy[window.location.href] == "nameAsc"
								? "nameDesc"
								: "nameAsc"
					})
				}}
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					color={getColor(darkMode, "textSecondary")}
					wordBreak="break-all"
					paddingRight="15px"
				>
					{i18n(lang, "name")}
				</AppText>
				{typeof sortBy[window.location.href] == "undefined" ? (
					<IoCaretUp
						size={14}
						color={getColor(darkMode, "textSecondary")}
						style={{
							marginTop: "3px"
						}}
					/>
				) : sortBy[window.location.href] == "nameAsc" ? (
					<IoCaretUp
						size={14}
						color={getColor(darkMode, "textSecondary")}
						style={{
							marginTop: "3px"
						}}
					/>
				) : (
					sortBy[window.location.href] == "nameDesc" && (
						<IoCaretDown
							size={14}
							color={getColor(darkMode, "textSecondary")}
							style={{
								marginTop: "3px"
							}}
						/>
					)
				)}
			</Flex>
			<Flex
				width={sizeWidth + "px"}
				justifyContent="flex-start"
				alignItems="center"
				cursor="pointer"
				onClick={() => {
					setSortBy({
						...sortBy,
						[window.location.href]:
							typeof sortBy[window.location.href] == "undefined" ||
							sortBy[window.location.href] == "sizeAsc"
								? "sizeDesc"
								: "sizeAsc"
					})
				}}
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					color={getColor(darkMode, "textSecondary")}
					wordBreak="break-all"
					paddingRight="15px"
				>
					{i18n(lang, "size")}
				</AppText>
				{sortBy[window.location.href] == "sizeAsc" ? (
					<IoCaretUp
						size={14}
						color={getColor(darkMode, "textSecondary")}
						style={{
							marginTop: "3px"
						}}
					/>
				) : (
					sortBy[window.location.href] == "sizeDesc" && (
						<IoCaretDown
							size={14}
							color={getColor(darkMode, "textSecondary")}
							style={{
								marginTop: "3px"
							}}
						/>
					)
				)}
			</Flex>
			<Flex
				width={lastModifiedWidth + "px"}
				justifyContent="flex-start"
				alignItems="center"
				cursor="pointer"
				onClick={() => {
					setSortBy({
						...sortBy,
						[window.location.href]:
							typeof sortBy[window.location.href] == "undefined" ||
							sortBy[window.location.href] == "lastModifiedAsc"
								? "lastModifiedDesc"
								: "lastModifiedAsc"
					})
				}}
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					color={getColor(darkMode, "textSecondary")}
					wordBreak="break-all"
					paddingRight="15px"
				>
					{i18n(lang, "lastModified")}
				</AppText>
				{sortBy[window.location.href] == "lastModifiedAsc" ? (
					<IoCaretUp
						size={14}
						color={getColor(darkMode, "textSecondary")}
						style={{
							marginTop: "3px"
						}}
					/>
				) : (
					sortBy[window.location.href] == "lastModifiedDesc" && (
						<IoCaretDown
							size={14}
							color={getColor(darkMode, "textSecondary")}
							style={{
								marginTop: "3px"
							}}
						/>
					)
				)}
			</Flex>
			{!isMobile && (
				<Flex
					width={actionsWidth + "px"}
					justifyContent="flex-start"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						color={getColor(darkMode, "textSecondary")}
						wordBreak="break-all"
						paddingRight="15px"
					>
						&nbsp;
					</AppText>
				</Flex>
			)}
		</Flex>
	)
})

export default ListHeader
