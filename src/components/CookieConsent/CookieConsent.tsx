import { memo, useEffect } from "react"
import { useToast, ToastId, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import Button from "../Button"
import cookies from "../../lib/cookies"
import { ONE_YEAR } from "../../lib/constants"
import { i18n } from "../../i18n"

export interface CookieConsentProps {
    darkMode: boolean,
    isMobile: boolean,
    lang: string
}

const CookieConsent = memo(({ darkMode, isMobile, lang }: CookieConsentProps) => {
    const toast = useToast()

    useEffect(() => {
        let cookieToastId: ToastId = 0

        if(typeof cookies.get("cookieConsent") !== "string"){
            cookieToastId = toast({
                duration: ONE_YEAR,
                position: "bottom",
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
                            zIndex={1}
                        >
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                fontWeight="normal"
                                fontSize={16}
                                color={getColor(darkMode, "textPrimary")}
                            >
                                {i18n(lang, "cookieConsent")}
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
                                            cookies.set("cookieConsent", "deny", {
                                                domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
                                            })

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
                                            {i18n(lang, "optOut")}
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
                                            cookies.set("cookieConsent", "needed", {
                                                domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
                                            })

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
                                            {i18n(lang, "onlyNeeded")}
                                        </AppText>
                                    </Flex>
                                </Flex>
                                <Button
                                    flex={2}
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    backgroundColor={darkMode ? "white" : "gray"}
                                    color={darkMode ? "black" : "white"}
                                    border={"1px solid " + (darkMode ? "white" : "gray")}
                                    height="35px"
                                    width="100%"
                                    _hover={{
                                        backgroundColor: getColor(darkMode, "backgroundPrimary"),
                                        border: "1px solid " + (darkMode ? "white" : "gray"),
                                        color: darkMode ? "white" : "gray"
                                    }}
                                    onClick={() => {
                                        cookies.set("cookieConsent", "full", {
                                            domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
                                        })

                                        toast.close(cookieToastId)
                                    }}
                                >
                                    {i18n(lang, "accept")}
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