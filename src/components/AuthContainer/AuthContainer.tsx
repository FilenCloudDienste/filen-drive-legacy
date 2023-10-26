import { memo } from "react"
import { AuthContainerProps } from "../../types"
import { Flex, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { getRandomArbitrary } from "../../lib/helpers"

const AuthContainer = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang, children }: AuthContainerProps) => {
	return (
		<Flex
			className="full-viewport"
			flexDirection="row"
		>
			{windowWidth <= 1200 ? (
				<Flex
					backgroundColor={getColor(darkMode, "backgroundPrimary")}
					width="100%"
					height="100%"
					justifyContent="center"
					alignItems="center"
					padding="25px"
				>
					{children}
				</Flex>
			) : (
				<>
					<Flex
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						width={windowWidth - 600 + "px"}
						height="100%"
						justifyContent="center"
						alignItems="center"
					>
						{children}
					</Flex>
					<Flex
						backgroundColor={getColor(darkMode, "backgroundSecondary")}
						width="600px"
						height="100%"
						overflow="hidden"
					>
						<Flex
							width="100%"
							height="100%"
							overflow="hidden"
							top="-100px"
							left="-100px"
							right="-100px"
							bottom="-100px"
						>
							<Image
								src={"/login" + getRandomArbitrary(1, 6) + ".webp"}
								fit="cover"
								filter="blur(1px)"
							/>
						</Flex>
					</Flex>
				</>
			)}
		</Flex>
	)
})

export default AuthContainer
