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
import toast from "../../components/Toast"
import { authInfo, login as apiLogin, userInfo, baseFolders } from "../../lib/api"
import { generatePasswordAndMasterKeysBasedOnAuthVersion } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { useNavigate, useSearchParams } from "react-router-dom"
import cookies from "../../lib/cookies"
import { i18n } from "../../i18n"

const LoginForm = memo(({ windowWidth, darkMode, isMobile, lang }: AppBaseProps) => {
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const [tfa, setTfa] = useState<string>("")
	const [showTfa, setShowTfa] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	const navigate = useNavigate()
	const [params] = useSearchParams()

	const toggleColorMode = (): void => {
		Cookies.set("colorMode", darkMode ? "light" : "dark")

		eventListener.emit("colorModeChanged", !darkMode)
	}

	const login = async (): Promise<void> => {
		setLoading(true)

		try {
			let sEmail: string = email.trim()
			let sPassword: string = password.trim()
			let sTfa: string = tfa.trim()

			if (!sEmail || !sPassword) {
				toast.show("error", i18n(lang, "invalidEmailAndPassword"), "bottom", 5000)

				setLoading(false)

				return
			}

			if (sEmail.length == 0 || sPassword.length == 0) {
				toast.show("error", i18n(lang, "invalidEmailAndPassword"), "bottom", 5000)

				setLoading(false)

				return
			}

			if (sTfa.length == 0) {
				sTfa = "XXXXXX"
			}

			const authInfoResponse = await authInfo({ email: sEmail })

			const authVersion: number = authInfoResponse.authVersion
			const salt: string = authInfoResponse.salt
			let masterKeys: string = ""

			const { derivedPassword, derivedMasterKeys } = await generatePasswordAndMasterKeysBasedOnAuthVersion(sPassword, authVersion, salt)

			sPassword = derivedPassword
			masterKeys = derivedMasterKeys

			const loginResponse = await apiLogin({
				email: sEmail,
				password: sPassword,
				twoFactorCode: sTfa,
				authVersion
			})

			const userInfoResponse = await userInfo(loginResponse.apiKey)
			const baseFoldersResponse = await baseFolders(loginResponse.apiKey)

			const defaultDriveUUID = baseFoldersResponse.folders.filter((folder: any) => folder.is_default)

			if (defaultDriveUUID.length == 0) {
				toast.show("error", i18n(lang, "couldNotFindDefaultFolder"), "bottom", 5000)

				setLoading(false)

				return
			}

			await Promise.all([
				db.set("apiKey", loginResponse.apiKey),
				db.set("userId", userInfoResponse.id),
				db.set("masterKeys", [masterKeys]),
				db.set("authVersion", authVersion),
				db.set("defaultDriveUUID", defaultDriveUUID[0].uuid),
				db.set("userEmail", sEmail)
			])

			cookies.set("loggedIn", "true")

			if (typeof params.get("pro") == "string") {
				navigate("/#/account/plans")
			} else {
				navigate("/", { replace: true })
			}
		} catch (e: any) {
			if (e.toString().toLowerCase().indexOf("please enter your two factor") !== -1) {
				toast.show("error", e.toString(), "bottom", 5000)

				setShowTfa(true)
			} else if (e.toString().toLowerCase().indexOf("invalid two factor") !== -1) {
				toast.show("error", e.toString(), "bottom", 5000)

				setTfa("")
			} else {
				console.error(e)

				toast.show("error", e.toString(), "bottom", 5000)

				setShowTfa(false)
				setPassword("")
				setTfa("")
			}
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
				onChange={e => setEmail(e.target.value)}
				marginTop="30px"
				placeholder={i18n(lang, "email")}
				type="email"
				onKeyDown={e => {
					if (e.which == 13) {
						login()
					}
				}}
				color={getColor(darkMode, "textSecondary")}
				_placeholder={{
					color: getColor(darkMode, "textSecondary")
				}}
			/>
			<Input
				darkMode={darkMode}
				isMobile={isMobile}
				value={password}
				onChange={e => setPassword(e.target.value)}
				marginTop="10px"
				placeholder={i18n(lang, "password")}
				type="password"
				onKeyDown={e => {
					if (e.which == 13) {
						login()
					}
				}}
				color={getColor(darkMode, "textSecondary")}
				_placeholder={{
					color: getColor(darkMode, "textSecondary")
				}}
			/>
			{showTfa && (
				<Input
					darkMode={darkMode}
					isMobile={isMobile}
					value={tfa}
					onChange={e => setTfa(e.target.value)}
					marginTop="15px"
					placeholder={i18n(lang, "tfaCode")}
					type="text"
					autoFocus={true}
					maxLength={64}
					onKeyDown={e => {
						if (e.which == 13) {
							login()
						}
					}}
					color={getColor(darkMode, "textSecondary")}
					_placeholder={{
						color: getColor(darkMode, "textSecondary")
					}}
				/>
			)}
			<Button
				darkMode={darkMode}
				isMobile={isMobile}
				marginTop="20px"
				width="100%"
				colorMode="blue"
				height="35px"
				onClick={() => login()}
				disabled={loading}
				color="white"
			>
				{loading ? (
					<Spinner
						width="16px"
						height="16px"
						color="white"
					/>
				) : (
					i18n(lang, "login")
				)}
			</Button>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				marginTop="25px"
			>
				{i18n(lang, "dontHaveAnAccountYet")}
				<Link
					to="/register"
					style={{
						color: getColor(darkMode, "linkPrimary"),
						marginLeft: "5px"
					}}
					className="hover-underline"
				>
					{i18n(lang, "accountCreateOne")}
				</Link>
			</AppText>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				marginTop="10px"
			>
				<Link
					to="/forgot-password"
					style={{
						color: getColor(darkMode, "linkPrimary")
					}}
					className="hover-underline"
				>
					{i18n(lang, "forgotYourPassword")}
				</Link>
			</AppText>
		</Flex>
	)
})

const Login = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
	return (
		<AuthContainer
			windowWidth={windowWidth}
			windowHeight={windowHeight}
			darkMode={darkMode}
			isMobile={isMobile}
			lang={lang}
		>
			<LoginForm
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		</AuthContainer>
	)
})

export default Login
