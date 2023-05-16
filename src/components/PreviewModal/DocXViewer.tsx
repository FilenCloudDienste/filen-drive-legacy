import { memo, useEffect } from "react"
import type { ItemProps } from "../../types"
import { Spinner, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import * as docx from "docx-preview"

export interface DocViewerProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	currentItem: ItemProps
	docX: Uint8Array
}

const DocXViewer = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, docX }: DocViewerProps) => {
	const container = document.getElementById("docXContainer")!

	useEffect(() => {
		if (docX.byteLength > 0) {
			docx.renderAsync(docX, container, container, {
				ignoreHeight: false,
				ignoreWidth: false,
				ignoreFonts: false,
				breakPages: true,
				debug: process.env.NODE_ENV === "development",
				experimental: true,
				inWrapper: true,
				trimXmlDeclaration: true,
				ignoreLastRenderedPageBreak: true,
				renderHeaders: true,
				renderFooters: true,
				renderFootnotes: true
			})
		}
	}, [docX])

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
				backgroundColor={getColor(darkMode, "backgroundPrimary")}
			>
				<div
					id="docXContainer"
					style={{
						maxWidth: windowWidth,
						maxHeight: windowHeight - 50,
						overflowY: "auto",
						overflowX: "auto"
					}}
				/>
				{docX.byteLength <= 0 && (
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

export default DocXViewer
