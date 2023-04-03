import { memo, useEffect, useState, useRef } from "react"
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
import type { ItemProps, ICFG } from "./types"
import type { ToastId } from "@chakra-ui/react"
import PublicLinkFile from "./pages/PublicLinkFile"
import PublicLinkFolder from "./pages/PublicLinkFolder"
import CookieConsent from "./components/CookieConsent"
import eventListener from "./lib/eventListener"
import cookies from "./lib/cookies"
import { getCfg } from "./lib/api"
import { Flex, Image } from "@chakra-ui/react"
import LogoAnimated from "./assets/images/logo_animated.gif"
import LogoLight from "./assets/images/light_logo.svg"
import LogoDark from "./assets/images/dark_logo.svg"
import AppText from "./components/AppText"
import { AiOutlineTwitter } from "react-icons/ai"
import Announcements from "./components/Announcements"

declare global {
	interface Window {
		currentReceiverId: number
		doingSetup: boolean
		transfersToastId: ToastId | undefined
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
	const [loggedIn] = useCookie("loggedIn")
	const [analytics, setAnalytics] = useState<boolean>(
		typeof cookies.get("cookieConsent") == "string" &&
			(cookies.get("cookieConsent") == "full" || cookies.get("cookieConsent") == "all")
			? true
			: false
	)
	const [cfg, setCFG] = useState<ICFG | undefined>(undefined)
	const didMount = useRef<boolean>(false)
	const paramsEx = useRef<string[]>(window.location.href.split("?")).current
	const includesPlanRedirect = useRef<boolean>(paramsEx.length >= 2 && paramsEx[1].indexOf("pro=") !== -1).current

	useEffect(() => {
		const body = document.querySelector("body") as HTMLElement

		if (body) {
			body.style.backgroundColor = getColor(darkMode, "backgroundPrimary")
		}
	}, [darkMode])

	useEffect(() => {
		if (!didMount.current) {
			didMount.current = true

			const includeAnalyticsListener = eventListener.on("includeAnalytics", () => setAnalytics(true))

			getCfg().then(setCFG).catch(console.error)

			const cfgInterval = setInterval(() => getCfg().then(setCFG).catch(console.error), 60000)

			return () => {
				includeAnalyticsListener.remove()

				clearInterval(cfgInterval)
			}
		}
	}, [])

	if (typeof cfg == "undefined") {
		return (
			<Flex
				className="full-viewport"
				flexDirection="column"
				backgroundColor={getColor(darkMode, "backgroundPrimary")}
				overflow="hidden"
				justifyContent="center"
				alignItems="center"
			>
				<Image
					src={LogoAnimated}
					width="128px"
					height="128px"
				/>
			</Flex>
		)
	}

	if (cfg.maintenance) {
		return (
			<Flex
				className="full-viewport"
				flexDirection="column"
				backgroundColor={getColor(darkMode, "backgroundPrimary")}
				overflow="hidden"
				justifyContent="center"
				alignItems="center"
			>
				<Image
					src={darkMode ? LogoLight : LogoDark}
					width="100px"
					height="100px"
				/>
				<AppText
					darkMode={darkMode}
					isMobile={isMobile}
					marginTop="20px"
				>
					Filen is currently unavailable due to maintenance. We will be back as soon as possible.
				</AppText>
				<Flex
					marginTop="10px"
					alignItems="center"
					gap="5px"
				>
					<AiOutlineTwitter
						color={getColor(darkMode, "linkPrimary")}
						size="20"
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "linkPrimary")}
						onClick={() => window.open("https://twitter.com/filen_io", "_blank")}
						cursor="pointer"
						_hover={{
							textDecoration: "underline"
						}}
					>
						Updates on Twitter
					</AppText>
				</Flex>
			</Flex>
		)
	}

	return (
		<>
			<Helmet>
				<link
					rel="stylesheet"
					href={darkMode ? "/dark.css" : "/light.css"}
				/>
				<meta
					name="theme-color"
					content={getColor(darkMode, "backgroundPrimary")}
				/>
				{typeof analytics == "boolean" && analytics && (
					<script
						defer
						data-domain="drive.filen.io"
						src="https://analytics.filen.io/js/plausible.js"
					></script>
				)}
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
			<CookieConsent
				darkMode={darkMode}
				isMobile={isMobile}
			/>
			<Announcements
				darkMode={darkMode}
				isMobile={isMobile}
				cfg={cfg}
			/>
		</>
	)
})

export default App
