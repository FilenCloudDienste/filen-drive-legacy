import { memo } from "react"
import { ItemProps } from "../../types"
import { Spinner, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"

export interface PDFViewerProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	currentItem: ItemProps
	pdf: string
}

const PDFViewer = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, pdf }: PDFViewerProps) => {
	return (
		<Flex
			className="full-viewport"
			flexDirection="column"
			backgroundColor={getColor(darkMode, "backgroundSecondary")}
		>
			<Flex
				width={windowWidth}
				height="50px"
				flexDirection="row"
				alignItems="center"
				justifyContent="space-between"
				paddingLeft="15px"
				paddingRight="15px"
			>
				<Flex>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
					>
						{currentItem.name}
					</AppText>
				</Flex>
			</Flex>
			<Flex
				width={windowWidth + "px"}
				height={windowHeight - 50 + "px"}
				alignItems="center"
				justifyContent="center"
			>
				{pdf.length > 0 ? (
					<iframe
						src={pdf}
						width={windowWidth}
						height={windowHeight - 50}
					/>
				) : (
					<Spinner
						width="64px"
						height="64px"
						color={getColor(darkMode, "textPrimary")}
					/>
				)}
			</Flex>
		</Flex>
	)
})

export default PDFViewer
