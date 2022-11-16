import { memo, useState } from "react"
import type { AppBaseProps } from "../../types"
import { Flex, Image, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import DarkLogo from "../../assets/images/dark_logo.svg"
import LightLogo from "../../assets/images/light_logo.svg"
import Input from "../../components/Input"
import Button from "../../components/Button"
import AppText from "../../components/AppText"
import { Link } from "react-router-dom"
import Cookies from "../../lib/cookies"
import eventListener from "../../lib/eventListener"
import AuthContainer from "../../components/AuthContainer"
import { i18n } from "../../i18n"
import { RegisterDoneModal } from "../Register/Register"
import { apiRequest } from "../../lib/worker/worker.com"
import toast from "../../components/Toast"

const ResendConfirmationForm = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
    const [email, setEmail] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)

    const toggleColorMode = (): void => {
        Cookies.set("colorMode", darkMode ? "light" : "dark", {
            domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
        })

        eventListener.emit("colorModeChanged", !darkMode)
    }

    const resend = async () => {
        const userEmail: string = email.trim()

        if(!userEmail){
            toast.show("error", i18n(lang, "invalidEmail"), "bottom", 5000)

            setLoading(false)

            return
        }

        if(userEmail.length == 0){
            toast.show("error", i18n(lang, "invalidEmailAndPassword"), "bottom", 5000)

            setLoading(false)

            return
        }

        try{
            const res = await apiRequest({
                method: "POST",
                endpoint: "/v1/confirmation/resend",
                data: {
                    email: userEmail
                }
            })

            if(!res.status){
                setEmail("")

                setLoading(false)

                toast.show("error", res.message, "bottom", 5000)

                return
            }

            setEmail("")

            setLoading(false)

            eventListener.emit("openRegisterDoneModal")
        }
        catch(e: any){
            console.error(e)

            setEmail("")

            setLoading(false)

            toast.show("error", e.toString(), "bottom", 5000)

            return
        }

        setLoading(false)
    }

    return (
        <Flex
            flexDirection="column"
            alignItems="center"
            width="300px"
        >
            <Image
                src={darkMode ? LightLogo : DarkLogo}
                width="64px"
                height="64px"
                onClick={toggleColorMode}
                cursor="pointer"
            />
            <Input
                darkMode={darkMode}
                isMobile={isMobile}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                marginTop="30px"
                placeholder={i18n(lang, "email")}
                type="email"
                color={getColor(darkMode, "textSecondary")}
                _placeholder={{
                    color: getColor(darkMode, "textSecondary")
                }}
            />
            <Button
                darkMode={darkMode}
                isMobile={isMobile}
                marginTop="20px"
                width="100%"
                colorMode="blue"
                height="35px"
                onClick={() => resend()}
                color="white"
            >
                {
                    loading ? (
                        <Spinner
                            width="16px"
                            height="16px"
                            color="white"
                        />
                    ) : i18n(lang, "resendConfirmationEmail")
                }
            </Button>
            <AppText
                darkMode={darkMode}
                isMobile={isMobile}
                marginTop="25px"
            >
                <Link
                    to="/register"
                    style={{
                        color: getColor(darkMode, "linkPrimary"),
                        marginLeft: "5px"
                    }}
                    className="hover-underline"
                >
                    {i18n(lang, "goBack")}
                </Link>
            </AppText>
            <RegisterDoneModal
                darkMode={darkMode}
                isMobile={isMobile}
                lang={lang}
            />
        </Flex>
    )
})

const ResendConfirmation = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
    return (
        <AuthContainer
            windowWidth={windowWidth}
            windowHeight={windowHeight}
            darkMode={darkMode}
            isMobile={isMobile}
            lang={lang}
        >
            <ResendConfirmationForm
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                darkMode={darkMode}
                isMobile={isMobile}
                lang={lang}
            />
        </AuthContainer>
    )
})

export default ResendConfirmation