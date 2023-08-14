import { memo } from "react"
import { ItemProps } from "../../types"
import { Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import eventListener from "../../lib/eventListener"
import { i18n } from "../../i18n"

export interface ErrorProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	currentItem: ItemProps | undefined
	error: string
	lang: string
}

const Error = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, error, lang }: ErrorProps) => {
	return (
		<Flex
			className="full-viewport"
			flexDirection="column"
			backgroundColor={getColor(darkMode, "backgroundPrimary")}
		>
			<Flex
				width={windowWidth}
				height="50px"
				flexDirection="row"
				alignItems="center"
				justifyContent="space-between"
				paddingLeft="15px"
				paddingRight="15px"
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				position="absolute"
				zIndex={100001}
				borderBottom={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<Flex>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
					>
						{currentItem?.name}
					</AppText>
				</Flex>
			</Flex>
			<Flex
				width={windowWidth + "px"}
				height={windowHeight - 50 + "px"}
				alignItems="center"
				justifyContent="center"
				marginTop="50px"
				flexDirection="column"
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					color={getColor(darkMode, "textSecondary")}
					maxWidth="700px"
					paddingLeft="15px"
					paddingRight="15px"
					textAlign="center"
				>
					{error}
				</AppText>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					color={getColor(darkMode, "linkPrimary")}
					textAlign="center"
					marginTop="20px"
					cursor="pointer"
					_hover={{
						textDecoration: "underline"
					}}
					onClick={() => eventListener.emit("closePreviewModal")}
				>
					{i18n(lang, "close")}
				</AppText>
			</Flex>
		</Flex>
	)
})

export default Error
