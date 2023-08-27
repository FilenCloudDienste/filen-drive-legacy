import { memo, useMemo } from "react"
import { AppBaseProps } from "../../types"
import { Flex, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import DarkLogo from "../../assets/images/dark_logo.svg"
import LightLogo from "../../assets/images/light_logo.svg"
import AppText from "../../components/AppText"
import { BsFillShieldFill } from "react-icons/bs"
import { RiSendToBack } from "react-icons/ri"
import { FaLock } from "react-icons/fa"
import { MdVisibilityOff } from "react-icons/md"
import Button from "../Button"
import useCookie from "../../lib/hooks/useCookie"
import { toggleColorMode } from "../../lib/helpers"
import { decode as decodeBase64 } from "js-base64"

export interface PublicLinkContainerProps extends AppBaseProps {
	children?: React.ReactNode
}

const Container = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang, children }: PublicLinkContainerProps) => {
	const [loggedIn] = useCookie("loggedIn")

	const sidebarWidth: number = useMemo(() => {
		return isMobile ? 0 : 400
	}, [isMobile])

	if (window.location.href.indexOf("?embed") !== -1) {
		const urlParams = new URLSearchParams(window.location.href)

		return (
			<Flex
				className="full-viewport"
				flexDirection="row"
				backgroundColor={
					typeof urlParams.get("bgColor") === "string"
						? decodeBase64(urlParams.get("bgColor")!.split("#")[0].trim())
						: getColor(darkMode, "backgroundPrimary")
				}
				overflow="hidden"
			>
				{children}
			</Flex>
		)
	}

	return (
		<Flex
			className="full-viewport"
			flexDirection="row"
			backgroundColor={getColor(darkMode, "backgroundPrimary")}
			overflow="hidden"
		>
			{!isMobile && (
				<Flex
					className="full-viewport-height"
					width={sidebarWidth + "px"}
					flexDirection="column"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					justifyContent="center"
					paddingTop="50px"
					borderRight={"1px solid " + getColor(darkMode, "borderPrimary")}
				>
					<Image
						src={darkMode ? LightLogo : DarkLogo}
						width="70px"
						height="70px"
						onClick={() => (window.location.href = "https://filen.io")}
						cursor="pointer"
						position="absolute"
						top="50px"
						left={sidebarWidth / 2 - 35}
					/>
					<Flex
						justifyContent="flex-start"
						paddingLeft="40px"
						paddingRight="40px"
						flexDirection="column"
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							fontSize={17}
						>
							WE ARE FILEN
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textPrimary")}
							fontSize={26}
							lineHeight="1"
						>
							Private and secure cloud storage
						</AppText>
						<Flex
							flexDirection="row"
							alignItems="center"
							marginTop="50px"
						>
							<BsFillShieldFill
								fontSize={18}
								color={getColor(darkMode, "textSecondary")}
							/>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={getColor(darkMode, "textPrimary")}
								fontSize={17}
								paddingTop="3px"
								marginLeft="15px"
							>
								Privacy by design
							</AppText>
						</Flex>
						<Flex
							flexDirection="row"
							alignItems="center"
							marginTop="2px"
						>
							<RiSendToBack
								fontSize={18}
								color={getColor(darkMode, "textSecondary")}
							/>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={getColor(darkMode, "textPrimary")}
								fontSize={17}
								paddingTop="3px"
								marginLeft="15px"
							>
								End-to-end encryption
							</AppText>
						</Flex>
						<Flex
							flexDirection="row"
							alignItems="center"
							marginTop="2px"
						>
							<FaLock
								fontSize={18}
								color={getColor(darkMode, "textSecondary")}
							/>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={getColor(darkMode, "textPrimary")}
								fontSize={17}
								paddingTop="3px"
								marginLeft="15px"
							>
								Military grade encryption
							</AppText>
						</Flex>
						<Flex
							flexDirection="row"
							alignItems="center"
							marginTop="2px"
						>
							<MdVisibilityOff
								fontSize={18}
								color={getColor(darkMode, "textSecondary")}
							/>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={getColor(darkMode, "textPrimary")}
								fontSize={17}
								paddingTop="3px"
								marginLeft="15px"
							>
								Zero knowledge technology
							</AppText>
						</Flex>
						{loggedIn !== "true" && (
							<Flex
								flexDirection="row"
								alignItems="center"
								marginTop="50px"
							>
								<Button
									darkMode={darkMode}
									isMobile={isMobile}
									backgroundColor={darkMode ? "white" : "gray"}
									color={darkMode ? "black" : "white"}
									border={"1px solid " + (darkMode ? "white" : "gray")}
									_hover={{
										backgroundColor: getColor(darkMode, "backgroundSecondary"),
										border: "1px solid " + (darkMode ? "white" : "gray"),
										color: darkMode ? "white" : "gray"
									}}
									onClick={() => (window.location.href = "https://drive.filen.io/register")}
								>
									Sign up for free
								</Button>
							</Flex>
						)}
					</Flex>
				</Flex>
			)}
			<Flex
				width={isMobile ? "100vw" : sidebarWidth - windowWidth + "px"}
				className="full-viewport-height"
				flexDirection="column"
			>
				{children}
			</Flex>
		</Flex>
	)
})

export default Container
