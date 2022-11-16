import { memo, useEffect } from "react"
import useWindowWidth from "./lib/hooks/useWindowWidth"
import useDarkMode from "./lib/hooks/useDarkMode"
import useIsMobile from "./lib/hooks/useIsMobile"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import useLang from "./lib/hooks/useLang"
import Drive from "./pages/Drive"
import ForgotPassword from "./pages/ForgotPassword"
import ResendConfirmation from "./pages/ResendConfirmation"
import useWindowHeight from "./lib/hooks/useWindowHeight"
import useCookie from "./lib/hooks/useCookie"
import { getColor } from "./styles/colors"
import { Helmet } from "react-helmet-async"
import type { ItemProps } from "./types"
import type { ToastId } from "@chakra-ui/react"
import PublicLinkFile from "./pages/PublicLinkFile"
import PublicLinkFolder from "./pages/PublicLinkFolder"

declare global {
    interface Window {
        currentReceiverId: number,
        doingSetup: boolean,
        transfersToastId: ToastId | undefined,
        visibleItems: ItemProps[]
    }
}

window.doingSetup = false
window.transfersToastId = undefined
window.visibleItems = []

const App = memo(() => {
    const windowWidth: number = useWindowWidth()
    const windowHeight: number = useWindowHeight()
    const darkMode: boolean = useDarkMode()
    const isMobile: boolean = useIsMobile()
    const lang: string = useLang()
    const [loggedIn, setLoggedIn] = useCookie("loggedIn")
    
    const paramsEx: string[] = window.location.href.split("?")
    const includesPlanRedirect: boolean = paramsEx.length >= 2 && paramsEx[1].indexOf("pro=") !== -1

    useEffect(() => {
        const body = document.querySelector("body") as HTMLElement

        if(body){
            body.style.backgroundColor = getColor(darkMode, "backgroundPrimary")
        }
    }, [darkMode])

    return (
        <>
            <Helmet>
                <link rel="stylesheet" href={darkMode ? "/dark.css" : "/light.css"} />
            </Helmet>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/*"
                        element={
                            loggedIn == "true" ? (
                                <Drive
                                    windowWidth={windowWidth}
                                    windowHeight={windowHeight}
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    lang={lang}
                                />
                            ) : (
                                <Navigate
                                    replace={true}
                                    to={includesPlanRedirect ? "/login?" + paramsEx[1] : "/login"}
                                />
                            )
                        }
                    />
                    <Route
                        path="/d/:uuid"
                        element={
                            <PublicLinkFile
                                windowWidth={windowWidth}
                                windowHeight={windowHeight}
                                darkMode={darkMode}
                                isMobile={isMobile}
                                lang={lang}
                            />
                        }
                    />
                    <Route
                        path="/f/:uuid"
                        element={
                            <PublicLinkFolder
                                windowWidth={windowWidth}
                                windowHeight={windowHeight}
                                darkMode={darkMode}
                                isMobile={isMobile}
                                lang={lang}
                            />
                        }
                    />
                    <Route
                        path="/login"
                        element={
                            loggedIn == "true" ? (
                                <Navigate
                                    replace={true}
                                    to={includesPlanRedirect ? "/?" + paramsEx[1] : "/"}
                                />
                            ) : (
                                <Login
                                    windowWidth={windowWidth}
                                    windowHeight={windowHeight}
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    lang={lang}
                                />
                            )
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            loggedIn == "true" ? (
                                <Navigate
                                    replace={true}
                                    to={includesPlanRedirect ? "/?" + paramsEx[1] : "/"}
                                />
                            ) : (
                                <Register
                                    windowWidth={windowWidth}
                                    windowHeight={windowHeight}
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    lang={lang}
                                />
                            )
                        }
                    />
                    <Route
                        path="/forgot-password"
                        element={
                            loggedIn == "true" ? (
                                <Navigate
                                    replace={true}
                                    to={includesPlanRedirect ? "/?" + paramsEx[1] : "/"}
                                />
                            ) : (
                                <ForgotPassword
                                    windowWidth={windowWidth}
                                    windowHeight={windowHeight}
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    lang={lang}
                                />
                            )
                        }
                    />
                    <Route
                        path="/forgot-password/:token"
                        element={
                            loggedIn == "true" ? (
                                <Navigate
                                    replace={true}
                                    to={includesPlanRedirect ? "/?" + paramsEx[1] : "/"}
                                />
                            ) : (
                                <ForgotPassword
                                    windowWidth={windowWidth}
                                    windowHeight={windowHeight}
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    lang={lang}
                                />
                            )
                        }
                    />
                    <Route
                        path="/resend-confirmation"
                        element={
                            loggedIn == "true" ? (
                                <Navigate
                                    replace={true}
                                    to={includesPlanRedirect ? "/?" + paramsEx[1] : "/"}
                                />
                            ) : (
                                <ResendConfirmation
                                    windowWidth={windowWidth}
                                    windowHeight={windowHeight}
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    lang={lang}
                                />
                            )
                        }
                    />
                </Routes>
            </BrowserRouter>
        </>
    )
})

export default App