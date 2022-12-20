import { memo, useCallback, useMemo } from "react"
import type { AppBaseProps } from "../../types"
import { Flex, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import Cookies from "../../lib/cookies"
import eventListener from "../../lib/eventListener"
import DarkLogo from "../../assets/images/dark_logo.svg"
import LightLogo from "../../assets/images/light_logo.svg"
import AppText from "../../components/AppText"
import { BsFillShieldFill } from "react-icons/bs"
import { RiSendToBack } from "react-icons/ri"
import { FaLock } from "react-icons/fa"
import { MdVisibilityOff } from "react-icons/md"
import Button from "../Button"
import useCookie from "../../lib/hooks/useCookie"

export interface PublicLinkContainerProps extends AppBaseProps {
    children?: React.ReactNode
}

const Container = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang, children }: PublicLinkContainerProps) => {
    const [loggedIn, setLoggedIn] = useCookie("loggedIn")

    const sidebarWidth: number = useMemo(() => {
        return isMobile ? 0 : 400
    }, [isMobile])

    const toggleColorMode = useCallback((): void => {
        Cookies.set("colorMode", darkMode ? "light" : "dark")

        eventListener.emit("colorModeChanged", !darkMode)
    }, [darkMode])

    return (
        <Flex
            width="100vw"
            height="100vh"
            flexDirection="row"
            backgroundColor={getColor(darkMode, "backgroundPrimary")}
            overflow="hidden"
        >
            {
                !isMobile && (
                    <Flex
                        width={sidebarWidth + "px"}
                        height="100vh"
                        flexDirection="column"
                        backgroundColor={getColor(darkMode, "backgroundSecondary")}
                        justifyContent="center"
                        paddingTop="50px"
                    >
                        <Image
                            src={darkMode ? LightLogo : DarkLogo}
                            width="70px"
                            height="70px"
                            onClick={toggleColorMode}
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
                            {
                                loggedIn !== "true" && (
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
                                            onClick={() => window.location.href = "https://drive.filen.io/register"}
                                        >
                                            Sign up for free
                                        </Button>
                                    </Flex>
                                )
                            }
                        </Flex>
                    </Flex>
                )
            }
            <Flex
                width={isMobile ? "100vw" : (sidebarWidth - windowWidth) + "px"}
                height="100vh"
                flexDirection="column"
            >
                {children}
            </Flex>
        </Flex>
    )
})

export default Container