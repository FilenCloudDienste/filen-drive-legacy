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
import AuthContainer from "../../components/AuthContainer"
import { i18n } from "../../i18n"
import toast from "../../components/Toast"
import { apiRequest, encryptMetadata, generatePasswordAndMasterKeysBasedOnAuthVersion } from "../../lib/worker/worker.com"
import { useParams, useNavigate } from "react-router-dom"
import { generateRandomString, toggleColorMode } from "../../lib/helpers"
import { AUTH_VERSION } from "../../lib/constants"

const ResetPasswordForm = memo(({ windowWidth, darkMode, isMobile, lang }: AppBaseProps) => {
	const [newPassword, setNewPassword] = useState<string>("")
	const [confirmNewPassword, setConfirmNewPassword] = useState<string>("")
	const [loading, setLoading] = useState<boolean>(false)
	const params = useParams()
	const navigate = useNavigate()
	const checkboxRef = useRef(null)
	const [checkboxRequired, setCheckboxRequired] = useState<boolean>(false)
	const [masterKeys, setMasterKeys] = useState<string>("")
	const importInputRef = useRef(null)

	const reset = async () => {
		const sNewPassword: string = newPassword.trim()
		const sConfirmNewPassword: string = confirmNewPassword.trim()
		const sMasterKeys: string = masterKeys.trim()

		setLoading(true)

		if (!checkboxRef.current) {
			setLoading(false)

			return
		}

		const checkbox = checkboxRef.current as HTMLInputElement

		if (!checkbox.checked) {
			setCheckboxRequired(true)
			setLoading(false)

			return
		}

		if (!sNewPassword || !sConfirmNewPassword) {
			toast.show("error", i18n(lang, "invalidPassword"), "bottom", 5000)

			setLoading(false)
			setNewPassword("")
			setConfirmNewPassword("")

			return
		}

		if (sNewPassword !== sConfirmNewPassword) {
			toast.show("error", i18n(lang, "passwordsDoNotMatch"), "bottom", 5000)

			setLoading(false)
			setNewPassword("")
			setConfirmNewPassword("")

			return
		}

		if (sNewPassword.length < 10) {
			toast.show("error", i18n(lang, "registerWeakPassword"), "bottom", 5000)

			setLoading(false)
			setNewPassword("")
			setConfirmNewPassword("")

			return
		}

		const newMasterKeys: string[] = []

		if (sMasterKeys.length > 0) {
			try {
				const decodedRecoveryKeys = window.atob(sMasterKeys).split("|")

				for (let i = 0; i < decodedRecoveryKeys.length; i++) {
					let key = decodedRecoveryKeys[i]

					if (key.split("_VALID_FILEN_MASTERKEY_").length == 3) {
						key = key.split("_VALID_FILEN_MASTERKEY_").join("")

						if (key.length > 16 && key.length < 128) {
							newMasterKeys.push(key)
						}
					} else {
						toast.show("error", i18n(lang, "invalidMasterKeys"), "bottom", 5000)

						setLoading(false)
						setMasterKeys("")

						return
					}
				}
			} catch (e) {
				toast.show("error", i18n(lang, "invalidMasterKeys"), "bottom", 5000)

				setLoading(false)
				setMasterKeys("")

				return
			}
		}

		try {
			if (AUTH_VERSION == 2) {
				var salt = generateRandomString(256)
				const { derivedMasterKeys, derivedPassword } = await generatePasswordAndMasterKeysBasedOnAuthVersion(
					sNewPassword,
					AUTH_VERSION,
					salt
				)
				var password = derivedPassword
				var passwordRepeat = derivedPassword

				newMasterKeys.push(derivedMasterKeys)
			} else {
				toast.show("error", i18n(lang, "invalidAuthVersion"), "bottom", 5000)

				setLoading(false)

				return
			}

			const res = await apiRequest({
				method: "POST",
				endpoint: "/v3/user/password/forgot/reset",
				data: {
					token: params.token,
					password,
					salt,
					authVersion: AUTH_VERSION,
					newMasterKeys: await encryptMetadata(newMasterKeys.join("|"), newMasterKeys[newMasterKeys.length - 1]),
					hasRecoveryKeys: newMasterKeys.length >= 2 ? true : false
				}
			})

			if (!res.status) {
				setLoading(false)

				toast.show("error", res.message, "bottom", 5000)

				return
			}

			setLoading(false)
			setNewPassword("")
			setCheckboxRequired(false)
			setConfirmNewPassword("")
			setMasterKeys("")

			toast.show("success", i18n(lang, "passwordResetSuccess"), "bottom", 5000)

			setTimeout(() => {
				navigate("/login")
			}, 3000)
		} catch (e: any) {
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
			width="400px"
		>
			<Flex
				alignItems="center"
				flexDirection="column"
			>
				<Image
					src={darkMode ? LightLogo : DarkLogo}
					width="64px"
					height="64px"
					onClick={() => toggleColorMode(darkMode)}
					cursor="pointer"
				/>
				<Input
					darkMode={darkMode}
					isMobile={isMobile}
					value={newPassword}
					onChange={e => setNewPassword(e.target.value)}
					marginTop="30px"
					placeholder={i18n(lang, "newPassword") + " *"}
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
					onChange={e => setConfirmNewPassword(e.target.value)}
					marginTop="10px"
					placeholder={i18n(lang, "confirmNewPassword") + " *"}
					type="password"
					color={getColor(darkMode, "textSecondary")}
					_placeholder={{
						color: getColor(darkMode, "textSecondary")
					}}
				/>
				<Flex
					alignItems="center"
					marginTop="10px"
					width="100%"
				>
					<Input
						darkMode={darkMode}
						isMobile={isMobile}
						value={masterKeys}
						onChange={e => setMasterKeys(e.target.value)}
						placeholder={i18n(lang, "recoveryMasterKeysInput")}
						type="text"
						color={getColor(darkMode, "textSecondary")}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
					/>
					<input
						type="file"
						accept="text/plain, .txt"
						multiple={false}
						hidden={true}
						ref={importInputRef}
						onChange={async e => {
							if (!e.target.files) {
								e.target.value = ""

								return
							}

							const file = e.target.files[0]

							if (!file) {
								e.target.value = ""

								return
							}

							try {
								const buffer = await file.arrayBuffer()
								const text = new TextDecoder().decode(buffer)

								if (text.length > 16) {
									window.atob(text)

									setMasterKeys(text)
								}
							} catch (e) {
								console.error(e)
							}

							e.target.value = ""
						}}
					/>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						marginLeft="15px"
						fontSize={13}
						color={getColor(darkMode, "linkPrimary")}
						cursor="pointer"
						_hover={{
							textDecoration: "underline"
						}}
						onClick={() => ((importInputRef as any).current as HTMLInputElement).click()}
					>
						{i18n(lang, "import")}
					</AppText>
				</Flex>
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
					fontSize={13}
					color={getColor(darkMode, "textSecondary")}
				>
					{i18n(lang, "resetPasswordCheckbox")}
				</AppText>
			</Flex>
			<Flex
				alignItems="center"
				flexDirection="column"
			>
				<Button
					darkMode={darkMode}
					isMobile={isMobile}
					marginTop="30px"
					width="100%"
					colorMode="blue"
					height="35px"
					color="white"
					onClick={() => reset()}
				>
					{loading ? (
						<Spinner
							width="16px"
							height="16px"
							color="white"
						/>
					) : (
						i18n(lang, "resetPasswordBtn")
					)}
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

	const forgot = async () => {
		const userEmail: string = email.trim()

		setLoading(true)

		if (!userEmail) {
			toast.show("error", i18n(lang, "invalidEmail"), "bottom", 5000)

			setLoading(false)
			setEmail("")

			return
		}

		if (userEmail.length == 0) {
			toast.show("error", i18n(lang, "invalidEmailAndPassword"), "bottom", 5000)

			setLoading(false)
			setEmail("")

			return
		}

		try {
			const res = await apiRequest({
				method: "POST",
				endpoint: "/v3/user/password/forgot",
				data: {
					email: userEmail
				}
			})

			if (!res.status) {
				setEmail("")

				setLoading(false)

				toast.show("error", res.message, "bottom", 5000)

				return
			}

			setEmail("")
			setLoading(false)

			toast.show("success", i18n(lang, "forgotPasswordEmailSent"), "bottom", 5000)
		} catch (e: any) {
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
				onClick={() => toggleColorMode(darkMode)}
				cursor="pointer"
			/>
			<Input
				darkMode={darkMode}
				isMobile={isMobile}
				value={email}
				onChange={e => setEmail(e.target.value)}
				marginTop="30px"
				placeholder={i18n(lang, "email") + " *"}
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
				{loading ? (
					<Spinner
						width="16px"
						height="16px"
						color="white"
					/>
				) : (
					i18n(lang, "forgotPasswordSendInstructions")
				)}
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
			{typeof params.token == "string" && params.token.length >= 1 && params.token.length <= 256 ? (
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
			)}
		</AuthContainer>
	)
})

export default ForgotPassword
