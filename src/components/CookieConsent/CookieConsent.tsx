import { memo, useEffect } from "react"
import { useToast, ToastId, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import Button from "../Button"
import eventListener from "../../lib/eventListener"
import cookies from "../../lib/cookies"

export interface CookieConsentProps {
    darkMode: boolean,
    isMobile: boolean
}

const CookieConsent = memo(({ darkMode, isMobile }: CookieConsentProps) => {
    const toast = useToast()

    useEffect(() => {
        let cookieToastId: ToastId = 0

        if(typeof cookies.get("cookieConsent") !== "string"){
            cookieToastId = toast({
                duration: 864000000,
                position: "bottom",
                styleConfig: {
                    zIndex: 999999
                },
                render: () => {
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
                                <Flex
                                    flex={2}
                                >
                                    <Flex
                                        _hover={{
                                            backgroundColor: getColor(darkMode, "backgroundSecondary")
                                        }}
                                        padding="10px"
                                        marginLeft="-10px"
                                        borderRadius="10px"
                                        cursor="pointer"
                                        onClick={() => {
                                            cookies.set("cookieConsent", "deny")

                                            toast.close(cookieToastId)
                                        }}
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
                                <Flex
                                    flex={2}
                                >
                                    <Flex
                                        _hover={{
                                            backgroundColor: getColor(darkMode, "backgroundSecondary")
                                        }}
                                        padding="10px"
                                        marginLeft="-10px"
                                        borderRadius="10px"
                                        cursor="pointer"
                                        onClick={() => {
                                            cookies.set("cookieConsent", "needed")

                                            toast.close(cookieToastId)
                                        }}
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
                                        cookies.set("cookieConsent", "full")

                                        eventListener.emit("includeAnalytics")

                                        toast.close(cookieToastId)
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
                }
            })
        }

        return () => {
            toast.close(cookieToastId)
        }
    }, [darkMode, isMobile, toast])

    return null
})

export default CookieConsent