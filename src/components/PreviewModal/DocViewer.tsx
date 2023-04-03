import { memo } from "react"
import type { ItemProps } from "../../types"
import { Spinner, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import DOCViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer"

export interface DocViewerProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	currentItem: ItemProps
	doc: string
}

const DocViewer = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, doc }: DocViewerProps) => {
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
				{doc.length > 0 ? (
					<DOCViewer
						documents={[
							{
								uri: doc,
								fileName: currentItem.name,
								fileType: currentItem.mime
							}
						]}
						pluginRenderers={DocViewerRenderers}
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

export default DocViewer
