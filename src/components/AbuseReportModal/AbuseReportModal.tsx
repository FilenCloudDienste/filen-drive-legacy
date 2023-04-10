import { memo, useState, useEffect, useMemo, useCallback } from "react"
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalBody,
	ModalCloseButton,
	ModalFooter,
	ModalHeader,
	Select,
	Textarea,
	Spinner,
	Flex
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { i18n } from "../../i18n"
import axios from "axios"
import toast from "../Toast"
import { simpleDate } from "../../lib/helpers"
import { REPORT_API_URL } from "../../lib/constants"

const AbuseReportModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean; isMobile: boolean; lang: string }) => {
	const [open, setOpen] = useState<boolean>(false)
	const [reason, setReason] = useState<string>("")
	const [email, setEmail] = useState<string>("")
	const [comment, setComment] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const [loading, setLoading] = useState<boolean>(false)

	const REASONS: { [key: string]: string } = useMemo(() => {
		return {
			spam: i18n(lang, "reportAbuseModal_spam"),
			dmca: i18n(lang, "reportAbuseModal_dmca"),
			cp: i18n(lang, "reportAbuseModal_cp"),
			stolen: i18n(lang, "reportAbuseModal_stolen"),
			malware: i18n(lang, "reportAbuseModal_malware"),
			other: i18n(lang, "reportAbuseModal_other")
		}
	}, [lang])

	const submit = useCallback(async () => {
		if (loading) {
			return
		}

		setLoading(true)

		const sEmail = email.trim()
		const sComment = comment.trim()
		const sPassword = password.trim()
		const sReason = reason.trim()

		if (!sEmail) {
			toast.show("error", i18n(lang, "invalidEmail"), "bottom", 5000)

			setLoading(false)

			return
		}

		if (sEmail.length == 0) {
			toast.show("error", i18n(lang, "invalidEmail"), "bottom", 5000)

			setLoading(false)

			return
		}

		if (typeof REASONS[sReason] == "undefined") {
			toast.show("error", i18n(lang, "invalidAbuseReason"), "bottom", 5000)

			setLoading(false)

			return
		}

		const text =
			"Abuse report\n\nDate: " +
			simpleDate(Date.now()) +
			"\nLink: " +
			window.location.href +
			"\nPassword: " +
			(sPassword.length > 0 ? sPassword : "N/A") +
			"\nReason: " +
			sReason +
			"" +
			(sComment.length > 0 ? "\n\nComment:\n\n" + sComment : "")

		try {
			const res = await axios.post(REPORT_API_URL, {
				email: sEmail,
				confirmEmail: sEmail,
				subject: "Abuse report",
				text
			})

			if (!res.data.status) {
				setLoading(false)

				toast.show("error", res.data.message, "bottom", 5000)

				return
			}

			setLoading(false)
			setOpen(false)

			toast.show("success", i18n(lang, "abuseReportSubmitted"), "bottom", 5000)
		} catch (e: any) {
			console.error(e)

			setLoading(false)

			toast.show("error", e.toString(), "bottom", 5000)

			return
		}

		setLoading(false)
	}, [loading, email, comment, reason, password])

	useEffect(() => {
		const openAbuseReportModalListener = eventListener.on("openAbuseReportModal", ({ password }: { password: string }) => {
			setReason("")
			setEmail("")
			setComment("")
			setPassword(password)
			setOpen(true)
		})

		return () => {
			openAbuseReportModalListener.remove()
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
				borderRadius={isMobile ? "0px" : "5px"}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "abuseReport")}</ModalHeader>
				<ModalCloseButton
					color={getColor(darkMode, "textSecondary")}
					backgroundColor={getColor(darkMode, "backgroundTertiary")}
					_hover={{
						color: getColor(darkMode, "textPrimary"),
						backgroundColor: getColor(darkMode, "backgroundPrimary")
					}}
					autoFocus={false}
					tabIndex={-1}
					borderRadius="full"
				/>
				<ModalBody
					height="100%"
					width="100%"
				>
					{loading ? (
						<Flex
							justifyContent="center"
							alignItems="center"
							height="100%"
							width="100%"
						>
							<Spinner
								width="40px"
								height="40px"
								color={getColor(darkMode, "textPrimary")}
							/>
						</Flex>
					) : (
						<>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								color={getColor(darkMode, "textSecondary")}
							>
								{i18n(lang, "abuseReportModalInfo")}
							</AppText>
							<Select
								marginTop="30px"
								value={reason}
								placeholder={i18n(lang, "abuseReportModalReason")}
								onChange={e => setReason(e.target.value)}
								borderColor={getColor(darkMode, "borderPrimary")}
								outline="none"
								shadow="none"
								_hover={{
									outline: "none",
									shadow: "none",
									borderColor: getColor(darkMode, "borderActive")
								}}
								_focus={{
									outline: "none",
									shadow: "none",
									borderColor: getColor(darkMode, "borderActive")
								}}
								_active={{
									outline: "none",
									shadow: "none",
									borderColor: getColor(darkMode, "borderActive")
								}}
							>
								{Object.keys(REASONS).map(r => {
									return (
										<option
											key={r}
											value={r}
											style={{
												backgroundColor: getColor(darkMode, "backgroundSecondary"),
												borderColor: getColor(darkMode, "borderPrimary")
											}}
										>
											{REASONS[r]}
										</option>
									)
								})}
							</Select>
							<Input
								darkMode={darkMode}
								isMobile={isMobile}
								value={email}
								onChange={e => setEmail(e.target.value)}
								placeholder={i18n(lang, "yourEmailAddress")}
								type="email"
								maxLength={255}
								marginTop="15px"
								color={getColor(darkMode, "textSecondary")}
								_placeholder={{
									color: getColor(darkMode, "textSecondary")
								}}
							/>
							<Textarea
								value={comment}
								onChange={e => setComment(e.target.value)}
								placeholder={i18n(lang, "abuseReportModalInfoPlaceholder")}
								marginTop="15px"
								color={getColor(darkMode, "textSecondary")}
								borderColor={getColor(darkMode, "borderPrimary")}
								minHeight="300px"
								outline="none"
								shadow="none"
								resize="none"
								_placeholder={{
									color: getColor(darkMode, "textSecondary")
								}}
								_hover={{
									outline: "none",
									shadow: "none",
									borderColor: getColor(darkMode, "borderActive"),
									color: getColor(darkMode, "textSecondary")
								}}
								_focus={{
									outline: "none",
									shadow: "none",
									borderColor: getColor(darkMode, "borderActive"),
									color: getColor(darkMode, "textSecondary")
								}}
								_active={{
									outline: "none",
									shadow: "none",
									borderColor: getColor(darkMode, "borderActive"),
									color: getColor(darkMode, "textSecondary")
								}}
							/>
						</>
					)}
				</ModalBody>
				<ModalFooter>
					{!loading && (
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							cursor="pointer"
							_hover={{
								color: getColor(darkMode, "linkPrimary")
							}}
							onClick={() => submit()}
						>
							{i18n(lang, "send")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default AbuseReportModal
