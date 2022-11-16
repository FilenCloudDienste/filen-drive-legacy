import { memo, useState, useRef } from "react"
import type { AppBaseProps } from "../../types"
import { Flex, Image, Spinner, Checkbox } from "@chakra-ui/react"
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
import toast from "../../components/Toast"
import { apiRequest, deriveKeyFromPassword } from "../../lib/worker/worker.com"
import { useParams, useNavigate } from "react-router-dom"
import { generateRandomString } from "../../lib/helpers"
import { AUTH_VERSION } from "../../lib/constants"

const CryptoJS = require("crypto-js")

const ResetPasswordForm = memo(({ windowWidth, darkMode, isMobile, lang }: AppBaseProps) => {
    const [newPassword, setNewPassword] = useState<string>("")
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const params = useParams()
    const navigate = useNavigate()
    const checkboxRef = useRef(null)
    const [checkboxRequired, setCheckboxRequired] = useState<boolean>(false)

    const toggleColorMode = (): void => {
        Cookies.set("colorMode", darkMode ? "light" : "dark", {
            domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
        })

        eventListener.emit("colorModeChanged", !darkMode)
    }

    const reset = async () => {
        setLoading(true)

        const sNewPassword: string = newPassword.trim()
        const sConfirmNewPassword: string = confirmNewPassword.trim()

        if(!sNewPassword || !sConfirmNewPassword){
            toast.show("error", i18n(lang, "invalidPassword"), "bottom", 5000)

            setLoading(false)

            return
        }

        if(sNewPassword !== sConfirmNewPassword){
            toast.show("error", i18n(lang, "passwordsDoNotMatch"), "bottom", 5000)

            setLoading(false)

            return
        }

        if(sNewPassword.length < 10){
            toast.show("error", i18n(lang, "registerWeakPassword"), "bottom", 5000)

            setLoading(false)

            return
        }

        if(!checkboxRef.current){
            setLoading(false)

            return
        }

        const checkbox = (checkboxRef.current as HTMLInputElement)

        if(!checkbox.checked){
            setCheckboxRequired(true)
            setLoading(false)

            return
        }

        setNewPassword("")
        setConfirmNewPassword("")
        setCheckboxRequired(false)

        try{
            if(AUTH_VERSION == 2){
                var salt = generateRandomString(256)
                const derivedKey = await deriveKeyFromPassword(sNewPassword, salt, 200000, "SHA-512", 512, true) as string
                const derivedAuthKey = derivedKey.substring((derivedKey.length / 2), derivedKey.length)
                var password = CryptoJS.SHA512(derivedAuthKey).toString()
                var passwordRepeat = password
            }
            else{
                toast.show("error", "Invalid auth version", "bottom", 5000)

                setLoading(false)

                return
            }

            const res = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/password/forgot/reset",
                data: {
                    token: params.token,
                    password,
                    passwordRepeat,
                    salt,
                    authVersion: AUTH_VERSION
                }
            })

            if(!res.status){
                setLoading(false)

                toast.show("error", res.message, "bottom", 5000)

                return
            }

            setLoading(false)

            toast.show("success", i18n(lang, "passwordResetSuccess"), "bottom", 5000)

            setTimeout(() => {
                navigate("/login")
            }, 5000)
        }
        catch(e: any){
            console.error(e)

            setLoading(false)

            toast.show("error", e.toString(), "bottom", 5000)

            return
        }

        setLoading(false)
    }

    return (
        <Flex
            flexDirection="column"
            width="300px"
        >
            <Flex
                alignItems="center"
                flexDirection="column"
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    marginTop="30px"
                    placeholder="New password"
                    type="password"
                    color={getColor(darkMode, "textSecondary")}
                    _placeholder={{
                        color: getColor(darkMode, "textSecondary")
                    }}
                />
                <Input
                    darkMode={darkMode}
                    isMobile={isMobile}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    marginTop="10px"
                    placeholder="Confirm new password"
                    type="password"
                    color={getColor(darkMode, "textSecondary")}
                    _placeholder={{
                        color: getColor(darkMode, "textSecondary")
                    }}
                />
            </Flex>
            <Flex
                marginTop="15px"
                alignItems="flex-start"
            >
                <Checkbox
                    borderColor={checkboxRequired ? "red.500" : getColor(darkMode, "borderActive")}
                    marginTop="5px"
                    ref={checkboxRef}
                    onChange={() => setCheckboxRequired(false)}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    marginLeft="15px"
                    fontSize={14}
                    color={getColor(darkMode, "textSecondary")}
                >
                    I understand that by resetting my password I will render all data stored on my account inaccessible due to how zero-knowledge end-to-end encryption works.
                </AppText>
            </Flex>
            <Flex
                alignItems="center"
                flexDirection="column"
            >
                <Button
                    darkMode={darkMode}
                    isMobile={isMobile}
                    marginTop="20px"
                    width="100%"
                    colorMode="blue"
                    height="35px"
                    color="white"
                    onClick={() => reset()}
                >
                    {
                        loading ? (
                            <Spinner
                                width="16px"
                                height="16px"
                                color="white"
                            />
                        ) : i18n(lang, "resetPasswordBtn")
                    }
                </Button>
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    marginTop="25px"
                >
                    <Link
                        to="/login"
                        style={{
                            color: getColor(darkMode, "linkPrimary"),
                            marginLeft: "5px"
                        }}
                        className="hover-underline"
                    >
                        {i18n(lang, "goBack")}
                    </Link>
                </AppText>
            </Flex>
        </Flex>
    )
})

const ForgotPasswordForm = memo(({ windowWidth, darkMode, isMobile, lang }: AppBaseProps) => {
    const [email, setEmail] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)

    const toggleColorMode = (): void => {
        Cookies.set("colorMode", darkMode ? "light" : "dark", {
            domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
        })

        eventListener.emit("colorModeChanged", !darkMode)
    }

    const forgot = async () => {
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
                endpoint: "/v1/forgot-password",
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

            toast.show("success", i18n(lang, "forgotPasswordEmailSent"), "bottom", 5000)
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
                placeholder="Email"
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
                color="white"
                onClick={() => forgot()}
            >
                {
                    loading ? (
                        <Spinner
                            width="16px"
                            height="16px"
                            color="white"
                        />
                    ) : i18n(lang, "forgotPasswordSendInstructions")
                }
            </Button>
            <AppText
                darkMode={darkMode}
                isMobile={isMobile}
                marginTop="25px"
            >
                <Link
                    to="/login"
                    style={{
                        color: getColor(darkMode, "linkPrimary"),
                        marginLeft: "5px"
                    }}
                    className="hover-underline"
                >
                    {i18n(lang, "goBack")}
                </Link>
            </AppText>
        </Flex>
    )
})

const ForgotPassword = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
    const params = useParams()

    return (
        <AuthContainer
            windowWidth={windowWidth}
            windowHeight={windowHeight}
            darkMode={darkMode}
            isMobile={isMobile}
            lang={lang}
        >
            {
                typeof params.token == "string" && params.token.length >= 1 && params.token.length <= 256 ? (
                    <ResetPasswordForm
                        windowWidth={windowWidth}
                        windowHeight={windowHeight}
                        darkMode={darkMode}
                        isMobile={isMobile}
                        lang={lang}
                    />
                ) : (
                    <ForgotPasswordForm
                        windowWidth={windowWidth}
                        windowHeight={windowHeight}
                        darkMode={darkMode}
                        isMobile={isMobile}
                        lang={lang}
                    />
                )
            }
        </AuthContainer>
    )
})

export default ForgotPassword