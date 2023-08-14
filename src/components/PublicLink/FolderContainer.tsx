import { memo, useMemo, useState } from "react"
import { AppBaseProps, LinkDirInfo, ItemProps } from "../../types"
import { Flex, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../../components/AppText"
import Button from "../Button"
import { formatBytes } from "../../lib/helpers"
import { MdReportGmailerrorred } from "react-icons/md"
import eventListener from "../../lib/eventListener"
import { IoGridOutline, IoList } from "react-icons/io5"

export interface FolderContainerProps extends AppBaseProps {
	children?: React.ReactNode
	info: LinkDirInfo | undefined
	toggleColorMode: any
	previewContainerHeight: number
	previewContainerWidth: number
	name: string
	breadcrumbs: React.ReactNode
	items: ItemProps[]
	downloadFolder: (loadCallback: Function) => Promise<any>
	password: string
	viewMode: "list" | "grid"
	setViewMode: React.Dispatch<React.SetStateAction<"list" | "grid">>
}

const FolderContainer = memo(
	({
		windowWidth,
		windowHeight,
		darkMode,
		isMobile,
		lang,
		children,
		info,
		toggleColorMode,
		previewContainerHeight,
		previewContainerWidth,
		name,
		breadcrumbs,
		items,
		downloadFolder,
		password,
		viewMode,
		setViewMode
	}: FolderContainerProps) => {
		const [loadingDownload, setLoadingDownload] = useState<boolean>(false)

		const [selectedItems, selectedItemsSize] = useMemo(() => {
			const selectedItems = items.filter(filterItem => filterItem.selected)
			const selectedItemsSize = selectedItems.reduce((a, b) => a + b.size, 0)

			return [selectedItems, selectedItemsSize]
		}, [items])

		if (typeof info == "undefined") {
			return null
		}

		return (
			<>
				<Flex
					width={previewContainerWidth + "px"}
					height="auto"
					justifyContent="space-between"
					alignItems="center"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					padding="5px"
					paddingTop="8px"
					borderTopRadius={isMobile ? "0px" : "5px"}
					paddingLeft="15px"
					paddingRight="15px"
				>
					{breadcrumbs}
				</Flex>
				<Flex
					width={previewContainerWidth + "px"}
					height={previewContainerHeight + "px"}
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					padding="5px"
					paddingLeft={isMobile ? "0px" : "5px"}
					paddingRight={isMobile ? "0px" : "5px"}
				>
					<Flex
						width="100%"
						height="100%"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						borderRadius={isMobile ? "0px" : "5px"}
					>
						{children}
					</Flex>
				</Flex>
				<Flex
					width={previewContainerWidth + "px"}
					height="auto"
					justifyContent="space-between"
					alignItems="center"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					padding="5px"
					borderBottomRadius={isMobile ? "0px" : "5px"}
					paddingLeft="15px"
					paddingRight="15px"
					paddingBottom="10px"
				>
					{selectedItems.length > 0 && windowWidth > 400 ? (
						<Flex
							flexDirection="row"
							alignItems="center"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
							>
								{selectedItems.length} selected of {items.length}
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
					) : (
						<>{!isMobile && <Flex />}</>
					)}
					<Flex
						alignItems="center"
						justifyContent={isMobile ? "space-between" : undefined}
						width={isMobile ? "100%" : undefined}
					>
						<Button
							darkMode={darkMode}
							isMobile={isMobile}
							backgroundColor={darkMode ? "white" : "gray"}
							color={darkMode ? "black" : "white"}
							border={"1px solid " + (darkMode ? "white" : "gray")}
							height="35px"
							disabled={loadingDownload || items.length == 0}
							_hover={{
								backgroundColor: getColor(darkMode, "backgroundSecondary"),
								border: "1px solid " + (darkMode ? "white" : "gray"),
								color: darkMode ? "white" : "gray"
							}}
							onClick={() => {
								setLoadingDownload(true)

								downloadFolder(() => {
									setLoadingDownload(false)
								}).catch(err => {
									console.error(err)

									setLoadingDownload(false)
								})
							}}
						>
							{loadingDownload ? (
								<Spinner
									color={darkMode ? "black" : "white"}
									width="16px"
									height="16px"
								/>
							) : (
								<>Download folder</>
							)}
						</Button>
						<Button
							darkMode={darkMode}
							isMobile={isMobile}
							backgroundColor={darkMode ? "white" : "gray"}
							color={darkMode ? "black" : "white"}
							border={"1px solid " + (darkMode ? "white" : "gray")}
							height="35px"
							marginLeft="10px"
							disabled={loadingDownload || items.length == 0}
							_hover={{
								backgroundColor: getColor(darkMode, "backgroundSecondary"),
								border: "1px solid " + (darkMode ? "white" : "gray"),
								color: darkMode ? "white" : "gray"
							}}
							onClick={() => setViewMode(viewMode == "list" ? "grid" : "list")}
						>
							{viewMode == "list" ? <IoGridOutline fontSize={24} /> : <IoList fontSize={24} />}
						</Button>
						<Button
							darkMode={darkMode}
							isMobile={isMobile}
							backgroundColor={darkMode ? "white" : "gray"}
							color={darkMode ? "black" : "white"}
							border={"1px solid " + (darkMode ? "white" : "gray")}
							height="35px"
							marginLeft="10px"
							disabled={loadingDownload || items.length == 0}
							_hover={{
								backgroundColor: getColor(darkMode, "backgroundSecondary"),
								border: "1px solid " + (darkMode ? "white" : "gray"),
								color: darkMode ? "white" : "gray"
							}}
							onClick={() =>
								eventListener.emit("openAbuseReportModal", {
									password
								})
							}
						>
							<MdReportGmailerrorred fontSize={24} />
						</Button>
					</Flex>
				</Flex>
			</>
		)
	}
)

export default FolderContainer
