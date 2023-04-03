import { memo } from "react"
import type { AppBaseProps } from "../../types"
import { Flex } from "@chakra-ui/react"
import AppText from "../AppText"
import { getColor } from "../../styles/colors"
import Container from "./Container"

const InvalidLink = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
	return (
		<Container
			windowWidth={windowWidth}
			windowHeight={windowHeight}
			darkMode={darkMode}
			isMobile={isMobile}
			lang={lang}
		>
			<Flex
				width={windowWidth - 400 + "px"}
				height="100%"
				flexDirection="column"
				justifyContent="center"
				alignItems="center"
			>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					fontSize={30}
					color={getColor(darkMode, "textPrimary")}
					marginTop="20px"
				>
					Invalid link
				</AppText>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					fontSize={18}
					color={getColor(darkMode, "textSecondary")}
				>
					This public link does not exist or is expired
				</AppText>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					noOfLines={1}
					fontSize={14}
					color={getColor(darkMode, "linkPrimary")}
					_hover={{
						textDecoration: "underline"
					}}
					cursor="pointer"
					marginTop="10px"
					onClick={() => (window.location.href = "https://filen.io")}
				>
					Go back
				</AppText>
			</Flex>
		</Container>
	)
})

export default InvalidLink
