import { memo, useState, useEffect } from "react"
import { AppBaseProps } from "../../types"
import { Flex, Image, Spinner, Modal, ModalFooter, ModalBody, ModalContent, ModalOverlay } from "@chakra-ui/react"
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
import { deriveKeyFromPassword, apiRequest } from "../../lib/worker/worker.com"
import { generateRandomString } from "../../lib/helpers"
import { AUTH_VERSION } from "../../lib/constants"
import { MdOutlineMarkEmailRead } from "react-icons/md"

const CryptoJS = require("crypto-js")

export const RegisterDoneModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	const [open, setOpen] = useState<boolean>(false)

	useEffect(() => {
		const openRegisterDoneModalListener = eventListener.on("openRegisterDoneModal", () => {
			setOpen(true)
		})

		return () => {
			openRegisterDoneModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "md"}
			autoFocus={false}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalBody
					height="100%"
					width="100%"
					justifyContent="center"
					alignItems="center"
					paddingTop="25px"
					paddingBottom="25px"
				>
					<Flex
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
					>
						<MdOutlineMarkEmailRead
							color={getColor(darkMode, "textPrimary")}
							fontSize={100}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							marginTop="20px"
							textAlign="center"
							fontSize={14}
						>
							{i18n(lang, "registrationEmailInstructions")}
						</AppText>
					</Flex>
				</ModalBody>
				<ModalFooter>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						cursor="pointer"
						onClick={() => setOpen(false)}
						_hover={{
							color: getColor(darkMode, "textPrimary"),
							textDecoration: "underline"
						}}
					>
						{i18n(lang, "gotIt")}
					</AppText>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

const RegisterForm = memo(({ windowWidth, darkMode, isMobile, lang }: AppBaseProps) => {
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const [confirmPassword, setConfirmPassword] = useState<string>("")
	const [loading, setLoading] = useState<boolean>(false)

	const toggleColorMode = (): void => {
		Cookies.set("colorMode", darkMode ? "light" : "dark")

		eventListener.emit("colorModeChanged", !darkMode)
	}

	const register = async () => {
		setLoading(true)

		try {
			const userEmail: string = email.trim()
			let userPassword: string = password
			let userConfirmPassword: string = confirmPassword

			if (
				!userEmail ||
				!userPassword ||
				!userConfirmPassword ||
				userEmail.length == 0 ||
				userPassword.length == 0 ||
				userConfirmPassword.length == 0
			) {
				toast.show("error", i18n(lang, "invalidEmailAndPassword"), "bottom", 5000)

				setLoading(false)

				return
			}

			if (userPassword !== userConfirmPassword) {
				toast.show("error", i18n(lang, "passwordsDoNotMatch"), "bottom", 5000)

				setLoading(false)

				return
			}

			if (userPassword.length < 10) {
				toast.show("error", i18n(lang, "registerWeakPassword"), "bottom", 5000)

				setLoading(false)

				return
			}

			const salt = generateRandomString(256)
			const derivedKey = (await deriveKeyFromPassword(userPassword, salt, 200000, "SHA-512", 512, true)) as string

			userPassword = derivedKey.substring(derivedKey.length / 2, derivedKey.length)
			userPassword = CryptoJS.SHA512(userPassword).toString()
			userConfirmPassword = userPassword

			const res = await apiRequest({
				method: "POST",
				endpoint: "/v3/register",
				data: {
					email: userEmail,
					password: userPassword,
					salt,
					authVersion: AUTH_VERSION,
					refId: typeof Cookies.get("refId") == "string" ? Cookies.get("refId") : "none",
					affId: typeof Cookies.get("affId") == "string" ? Cookies.get("affId") : "none"
				}
			})

			if (!res.status) {
				if (res.code === "invalid_params") {
					setEmail("")
					setPassword("")
					setConfirmPassword("")

					setLoading(false)

					toast.show("error", i18n(lang, "invalidEmailOrPassword"), "bottom", 5000)

					return
				} else if (res.code === "internal_error") {
					setLoading(false)

					toast.show("error", i18n(lang, "unknownErrorSupp"), "bottom", 5000)

					return
				} else if (res.code === "email_address_already_registered") {
					setEmail("")
					setPassword("")
					setConfirmPassword("")

					setLoading(false)

					toast.show("error", i18n(lang, "registerEmailAlreadyRegistered"), "bottom", 5000)

					return
				}

				setLoading(false)

				toast.show("error", res.message, "bottom", 5000)

				return
			}

			eventListener.emit("openRegisterDoneModal")

			setEmail("")
			setPassword("")
			setConfirmPassword("")

			setLoading(false)
		} catch (e: any) {
			console.error(e)

			setEmail("")
			setPassword("")
			setConfirmPassword("")

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
				onChange={e => setEmail(e.target.value)}
				marginTop="30px"
				placeholder={i18n(lang, "email")}
				type="email"
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
				color={getColor(darkMode, "textSecondary")}
				_placeholder={{
					color: getColor(darkMode, "textSecondary")
				}}
			/>
			<Input
				darkMode={darkMode}
				isMobile={isMobile}
				value={confirmPassword}
				onChange={e => setConfirmPassword(e.target.value)}
				marginTop="10px"
				placeholder={i18n(lang, "confirmPassword")}
				type="password"
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
				onClick={() => register()}
				color="white"
			>
				{loading ? (
					<Spinner
						width="16px"
						height="16px"
						color="white"
					/>
				) : (
					i18n(lang, "createAccount")
				)}
			</Button>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				marginTop="15px"
				fontSize={11}
				color={getColor(darkMode, "textSecondary")}
				textAlign="center"
			>
				By creating an account you automatically agree with our{" "}
				<a
					href="https://filen.io/terms"
					rel="noreferrer"
					target="_blank"
					style={{ color: getColor(darkMode, "linkPrimary") }}
				>
					Terms of Service
				</a>{" "}
				and{" "}
				<a
					href="https://filen.io/privacy"
					rel="noreferrer"
					target="_blank"
					style={{ color: getColor(darkMode, "linkPrimary") }}
				>
					Privacy Policy
				</a>
				.
			</AppText>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				marginTop="25px"
			>
				{i18n(lang, "alreadyHaveAnAccount")}
				<Link
					to="/login"
					style={{
						color: getColor(darkMode, "linkPrimary"),
						marginLeft: "5px"
					}}
					className="hover-underline"
				>
					{i18n(lang, "loginEx")}
				</Link>
			</AppText>
			<AppText
				darkMode={darkMode}
				isMobile={isMobile}
				marginTop="10px"
			>
				<Link
					to="/resend-confirmation"
					style={{
						color: getColor(darkMode, "linkPrimary")
					}}
					className="hover-underline"
				>
					{i18n(lang, "resendConfirmationEmail")}
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

const Register = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
	return (
		<AuthContainer
			windowWidth={windowWidth}
			windowHeight={windowHeight}
			darkMode={darkMode}
			isMobile={isMobile}
			lang={lang}
		>
			<RegisterForm
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		</AuthContainer>
	)
})

export default Register
