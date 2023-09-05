import { memo, useEffect, useState, useRef, lazy, Suspense } from "react"
import useWindowWidth from "./lib/hooks/useWindowWidth"
import useDarkMode from "./lib/hooks/useDarkMode"
import useIsMobile from "./lib/hooks/useIsMobile"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import useLang from "./lib/hooks/useLang"
import useWindowHeight from "./lib/hooks/useWindowHeight"
import useCookie from "./lib/hooks/useCookie"
import { getColor } from "./styles/colors"
import { Helmet } from "react-helmet-async"
import { ICFG } from "./types"
import eventListener from "./lib/eventListener"
import cookies from "./lib/cookies"
import { getCfg } from "./lib/api"
import { Flex, Image } from "@chakra-ui/react"
import { AiOutlineTwitter } from "react-icons/ai"
import { helmetStyle } from "./styles/helmet"
import { decode as decodeBase64 } from "js-base64"
import { ErrorBoundary } from "react-error-boundary"
import "react-quill/dist/quill.snow.css"
import "react-contexify/dist/ReactContexify.css"

const Drive = lazy(() => import("./pages/Drive"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const ResendConfirmation = lazy(() => import("./pages/ResendConfirmation"))
const PublicLinkFile = lazy(() => import("./pages/PublicLinkFile"))
const PublicLinkFolder = lazy(() => import("./pages/PublicLinkFolder"))
const CookieConsent = lazy(() => import("./components/CookieConsent"))
const Announcements = lazy(() => import("./components/Announcements"))
const AppText = lazy(() => import("./components/AppText"))

const App = memo(() => {
	const windowWidth = useWindowWidth()
	const windowHeight = useWindowHeight()
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [loggedIn] = window.location.href.indexOf("?embed") !== -1 ? ["false"] : useCookie("loggedIn")
	const [analytics, setAnalytics] = useState<boolean>(
		typeof cookies.get("cookieConsent") === "string" &&
			(cookies.get("cookieConsent") === "full" || cookies.get("cookieConsent") === "all")
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
			if (window.location.href.indexOf("?embed") !== -1) {
				const urlParams = new URLSearchParams(window.location.href)

				body.style.backgroundColor =
					typeof urlParams.get("bgColor") === "string"
						? decodeBase64(urlParams.get("bgColor")!.split("#")[0].trim())
						: getColor(darkMode, "backgroundPrimary")
			} else {
				body.style.backgroundColor = getColor(darkMode, "backgroundPrimary")
			}
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

	if (typeof cfg === "undefined") {
		return (
			<Flex
				className="full-viewport"
				flexDirection="column"
				backgroundColor={getColor(darkMode, "backgroundPrimary")}
				overflow="hidden"
				justifyContent="center"
				alignItems="center"
				width={windowWidth + "px"}
				height={windowHeight + "px"}
			>
				{window.location.href.indexOf("?embed") === -1 && (
					<Image
						src={require("./assets/images/logo_animated.gif")}
						width="128px"
						height="128px"
					/>
				)}
			</Flex>
		)
	}

	return (
		<>
			<Helmet
				style={[
					{
						cssText: helmetStyle(darkMode)
					}
				]}
			>
				<meta
					name="theme-color"
					content={getColor(darkMode, "backgroundPrimary")}
				/>
				{typeof analytics === "boolean" && analytics && window.location.href.indexOf("?embed") === -1 && (
					<script
						defer
						data-domain="drive.filen.io"
						src="https://analytics.filen.io/js/plausible.js"
					></script>
				)}
			</Helmet>
			<ErrorBoundary
				fallback={
					<Flex
						className="full-viewport"
						flexDirection="column"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						overflow="hidden"
						justifyContent="center"
						alignItems="center"
					>
						<Image
							src={darkMode ? require("./assets/images/light_logo.svg") : require("./assets/images/dark_logo.svg")}
							width="100px"
							height="100px"
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							marginTop="20px"
						>
							Someting went wrong. Try reloading the page.
						</AppText>
					</Flex>
				}
			>
				<Suspense
					fallback={
						<Flex
							className="full-viewport"
							flexDirection="column"
							backgroundColor={getColor(darkMode, "backgroundPrimary")}
							overflow="hidden"
							justifyContent="center"
							alignItems="center"
							width={windowWidth + "px"}
							height={windowHeight + "px"}
						>
							{window.location.href.indexOf("?embed") === -1 && (
								<Image
									src={require("./assets/images/logo_animated.gif")}
									width="128px"
									height="128px"
								/>
							)}
						</Flex>
					}
				>
					<Flex
						width="100%"
						height="100%"
					>
						<BrowserRouter>
							<Routes>
								{cfg.maintenance ? (
									<Route
										path="/*"
										element={
											<Flex
												className="full-viewport"
												flexDirection="column"
												backgroundColor={getColor(darkMode, "backgroundPrimary")}
												overflow="hidden"
												justifyContent="center"
												alignItems="center"
											>
												<Image
													src={
														darkMode
															? require("./assets/images/light_logo.svg")
															: require("./assets/images/dark_logo.svg")
													}
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
										}
									/>
								) : (
									<>
										{window.location.href.indexOf("?embed") !== -1 ? (
											<>
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
											</>
										) : (
											<>
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
											</>
										)}
									</>
								)}
							</Routes>
						</BrowserRouter>
						{window.location.href.indexOf("?embed") === -1 && (
							<>
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
						)}
					</Flex>
				</Suspense>
			</ErrorBoundary>
		</>
	)
})

export default App
