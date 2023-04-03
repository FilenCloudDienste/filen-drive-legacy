import { memo } from "react"
import { Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import Button from "../Button"
import eventListener from "../../lib/eventListener"
import useCookie from "../../lib/hooks/useCookie"

export interface CookieConsentProps {
	darkMode: boolean
	isMobile: boolean
}

const CookieConsent = memo(({ darkMode, isMobile }: CookieConsentProps) => {
	const [cookieConsent, setCookieConsent] = useCookie("cookieConsent")

	if (typeof cookieConsent == "string" && cookieConsent.length > 0) {
		return null
	}

	return (
		<Flex
			backgroundColor={getColor(darkMode, "backgroundPrimary")}
			border={"2px solid " + getColor(darkMode, "borderPrimary")}
			height="auto"
			width="auto"
			flexDirection="column"
			padding="15px"
			borderRadius="10px"
			zIndex={999999}
			position="fixed"
			bottom={15}
			left="50%"
			transform="translate(-50%, 0%)"
		>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				fontWeight="normal"
				fontSize={16}
				color={getColor(darkMode, "textPrimary")}
			>
				This site uses cookies to measure and improve your experience.
			</AppText>
			<Flex
				flexDirection="row"
				justifyContent="space-between"
				alignItems="center"
				gap="20px"
				marginTop="15px"
			>
				<Flex flex={2}>
					<Flex
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						padding="10px"
						marginLeft="-10px"
						borderRadius="10px"
						cursor="pointer"
						onClick={() => setCookieConsent("deny")}
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							fontWeight="normal"
							fontSize={16}
							color={getColor(darkMode, "textPrimary")}
							textDecoration="underline"
						>
							Opt-out
						</AppText>
					</Flex>
				</Flex>
				<Flex flex={2}>
					<Flex
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						padding="10px"
						marginLeft="-10px"
						borderRadius="10px"
						cursor="pointer"
						onClick={() => setCookieConsent("needed")}
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							fontWeight="normal"
							fontSize={16}
							color={getColor(darkMode, "textPrimary")}
							textDecoration="underline"
						>
							Only needed
						</AppText>
					</Flex>
				</Flex>
				<Button
					flex={2}
					darkMode={darkMode}
					isMobile={isMobile}
					height="35px"
					width="100%"
					onClick={() => {
						setCookieConsent("full")

						eventListener.emit("includeAnalytics")
					}}
					_hover={{
						textDecoration: "underline"
					}}
				>
					Accept
				</Button>
			</Flex>
		</Flex>
	)
})

export default CookieConsent
