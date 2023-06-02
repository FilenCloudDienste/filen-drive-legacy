import { memo, useState, useEffect, useRef, useCallback } from "react"
import { Flex, Progress, Spinner } from "@chakra-ui/react"
import AppText from "../AppText"
import { getColor } from "../../styles/colors"
import useTransfers from "../../lib/hooks/useTransfers"
import { i18n } from "../../i18n"
import eventListener from "../../lib/eventListener"
import { calcTimeLeft, calcSpeed, getTimeRemaining, bpsToReadable } from "../../lib/helpers"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { CustomToastTypes } from "../../types"
import { CHAKRA_COLOR_SCHEME } from "../../lib/constants"
import { throttle } from "lodash"
import { createStandaloneToast, ToastPosition, ToastId } from "@chakra-ui/react"

const { toast } = createStandaloneToast()
let activeToasts: number = 0

const SuccessToast = memo(({ message }: { message: string }) => {
	const darkMode = useDarkMode()

	return (
		<Flex
			backgroundColor={getColor(darkMode, "green")}
			width="auto"
			paddingTop="6px"
			paddingLeft="10px"
			paddingRight="10px"
			paddingBottom="6px"
			borderRadius="5px"
			zIndex={1000001}
		>
			<AppText
				darkMode={false}
				isMobile={false}
				color="white"
			>
				{message}
			</AppText>
		</Flex>
	)
})

const ErrorToast = memo(({ message }: { message: string }) => {
	const darkMode = useDarkMode()

	return (
		<Flex
			backgroundColor={getColor(darkMode, "red")}
			width="auto"
			paddingTop="6px"
			paddingLeft="10px"
			paddingRight="10px"
			paddingBottom="6px"
			borderRadius="5px"
			zIndex={1000001}
		>
			<AppText
				darkMode={false}
				isMobile={false}
				color="white"
			>
				{message}
			</AppText>
		</Flex>
	)
})

const TransfersToast = memo(({}) => {
	const darkMode: boolean = useDarkMode()
	const isMobile: boolean = useIsMobile()
	const lang: string = useLang()
	const [remaining, setRemaining] = useState<number>(0)
	const [speed, setSpeed] = useState<number>(0)
	const [percent, setPercent] = useState<number>(0)
	const bytesSent = useRef<number>(0)
	const allBytes = useRef<number>(0)
	const progressStarted = useRef<number>(-1)

	const { currentUploads, currentDownloads } = useTransfers({
		onUploadStart: upload => {
			const now: number = Date.now()

			if (progressStarted.current == -1) {
				progressStarted.current = now
			} else {
				if (now < progressStarted.current) {
					progressStarted.current = now
				}
			}

			allBytes.current += upload.data.file.size
		},
		onDownloadStart: download => {
			const now: number = Date.now()

			if (progressStarted.current == -1) {
				progressStarted.current = now
			} else {
				if (now < progressStarted.current) {
					progressStarted.current = now
				}
			}

			allBytes.current += download.data.size
		},
		onUploadError: upload => {
			if (allBytes.current >= upload.data.file.size) {
				allBytes.current -= upload.data.file.size
			}
		},
		onDownloadError: upload => {
			if (allBytes.current >= upload.data.size) {
				allBytes.current -= upload.data.size
			}
		},
		onUploadProgress: progress => {
			bytesSent.current += progress.data.bytes
		},
		onDownloadProgress: progress => {
			bytesSent.current += progress.data.bytes
		},
		onTransferStopped: uuid => {
			let size: number = 0

			for (const prop in currentUploads) {
				if (currentUploads[prop].uuid == uuid) {
					size += currentUploads[prop].file.size
				}
			}

			for (const prop in currentDownloads) {
				if (currentDownloads[prop].uuid == uuid) {
					size += currentDownloads[prop].file.size
				}
			}

			if (allBytes.current >= size) {
				allBytes.current -= size
			}
		}
	})

	const updateStats = useCallback(
		throttle(() => {
			const now: number = Date.now()

			if (progressStarted.current > 0 && allBytes.current > 0 && bytesSent.current > 0) {
				const transferRemaining: number = calcTimeLeft(bytesSent.current, allBytes.current, progressStarted.current)
				const transferPercent: number = (bytesSent.current / allBytes.current) * 100
				const transferSpeed: number = calcSpeed(now, progressStarted.current, bytesSent.current)

				setRemaining(transferRemaining)
				setSpeed(transferSpeed)
				setPercent(isNaN(transferPercent) ? 0 : transferPercent >= 100 ? 100 : transferPercent)

				eventListener.emit("transferRemaining", transferRemaining)
				eventListener.emit("transferPercent", transferPercent)
				eventListener.emit("transferSpeed", transferSpeed)
			}
		}, 100),
		[]
	)

	useEffect(() => {
		if (Object.keys(currentUploads).length + Object.keys(currentDownloads).length <= 0) {
			bytesSent.current = 0
			progressStarted.current = -1
			allBytes.current = 0

			setRemaining(0)
			setSpeed(0)
			setPercent(0)

			eventListener.emit("transferRemaining", 0)
			eventListener.emit("transferPercent", 0)
			eventListener.emit("transferSpeed", 0)
		}
	}, [Object.keys(currentUploads).length, Object.keys(currentDownloads).length])

	useEffect(() => {
		updateStats()

		eventListener.emit("currentUploads", currentUploads)
		eventListener.emit("currentDownloads", currentDownloads)
	}, [JSON.stringify(currentUploads), JSON.stringify(currentDownloads)])

	if (Object.keys(currentUploads).length + Object.keys(currentDownloads).length <= 0) {
		return null
	}

	return (
		<Flex
			width="500px"
			height="auto"
			backgroundColor={getColor(darkMode, "backgroundPrimary")}
			borderRadius="5px"
			border={"1px solid " + getColor(darkMode, "borderPrimary")}
			flexDirection="column"
			alignItems="flex-start"
			zIndex={1000001}
			cursor={Object.keys(currentUploads).length > 0 ? "pointer" : undefined}
			onClick={() => {
				if (Object.keys(currentUploads).length > 0) {
					eventListener.emit("openUploadModal", {
						files: undefined,
						openModal: true
					})
				}
			}}
		>
			<Flex
				paddingTop="6px"
				paddingLeft="10px"
				paddingRight="10px"
				paddingBottom={percent > 0 ? "8px" : "6px"}
				alignItems="center"
				justifyContent="space-between"
				width="100%"
			>
				<Flex>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
					>
						{Object.keys(currentUploads).length > 0 && Object.keys(currentDownloads).length > 0 ? (
							<>
								{i18n(
									lang,
									"transferringItems",
									true,
									["__COUNT__"],
									[(Object.keys(currentUploads).length + Object.keys(currentDownloads).length).toString()]
								)}
							</>
						) : Object.keys(currentUploads).length > 0 ? (
							<>
								{i18n(
									lang,
									"uploadingItems",
									true,
									["__COUNT__"],
									[(Object.keys(currentUploads).length + Object.keys(currentDownloads).length).toString()]
								)}
							</>
						) : (
							<>
								{i18n(
									lang,
									"downloadingItems",
									true,
									["__COUNT__"],
									[(Object.keys(currentUploads).length + Object.keys(currentDownloads).length).toString()]
								)}
							</>
						)}
					</AppText>
				</Flex>
				<Flex>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
					>
						{Object.keys(currentUploads).length + Object.keys(currentDownloads).length > 0 &&
							(() => {
								const remainingReadable = getTimeRemaining(Date.now() + remaining * 1000)

								if (remainingReadable.total <= 1 || remainingReadable.seconds <= 1) {
									remainingReadable.total = 1
									remainingReadable.days = 0
									remainingReadable.hours = 0
									remainingReadable.minutes = 0
									remainingReadable.seconds = 1
								}

								return (
									i18n(
										lang,
										"aboutRemaining",
										false,
										["__TIME__"],
										[
											(remainingReadable.days > 0 ? remainingReadable.days + "d " : "") +
												(remainingReadable.hours > 0 ? remainingReadable.hours + "h " : "") +
												(remainingReadable.minutes > 0 ? remainingReadable.minutes + "m " : "") +
												(remainingReadable.seconds > 0 ? remainingReadable.seconds + "s " : "")
										]
									) +
									", " +
									bpsToReadable(speed)
								)
							})()}
					</AppText>
				</Flex>
			</Flex>
			{percent > 0 && (
				<Progress
					value={percent}
					colorScheme={CHAKRA_COLOR_SCHEME}
					height="3px"
					borderRadius="5px"
					width="500px"
					backgroundColor={getColor(darkMode, "backgroundPrimary")}
				/>
			)}
		</Flex>
	)
})

const LoadingToast = memo(({ message }: { message: string }) => {
	const darkMode: boolean = useDarkMode()

	return (
		<Flex
			backgroundColor={getColor(darkMode, "backgroundPrimary")}
			border={"1px solid " + getColor(darkMode, "borderPrimary")}
			width="auto"
			paddingTop="6px"
			paddingLeft="10px"
			paddingRight="10px"
			paddingBottom="6px"
			borderRadius="5px"
			zIndex={1000001}
			alignItems="center"
		>
			<Spinner
				width="16px"
				height="16px"
				color={getColor(darkMode, "textPrimary")}
			/>
			<AppText
				darkMode={false}
				isMobile={false}
				color={getColor(darkMode, "textSecondary")}
				marginLeft="15px"
			>
				{message}
			</AppText>
		</Flex>
	)
})

const getToastElement = (type: CustomToastTypes, message: string, id: ToastId, onClose: Function) => {
	switch (type) {
		case "success":
			return <SuccessToast message={message} />
		case "error":
			return <ErrorToast message={message} />
		case "transfers":
			return <TransfersToast />
		case "loading":
			return <LoadingToast message={message} />
		default:
			return <>{message}</>
	}
}

export const show = (
	type: CustomToastTypes,
	message: string = "",
	position: ToastPosition = "bottom",
	duration: number = 5000
): ToastId => {
	if (typeof window.transfersToastId !== "undefined" && type == "transfers") {
		//return window.transfersToastId
	}

	activeToasts += 1

	const id = toast({
		render: ({ id, onClose }) => getToastElement(type, message, id as ToastId, onClose),
		duration: type == "transfers" ? 86400 * 365 * 1000 : duration,
		position,
		onCloseComplete: () => {
			activeToasts -= 1
		}
	})

	if (type == "transfers") {
		window.transfersToastId = id
	}

	return id
}

export const update = (id: ToastId, type: CustomToastTypes, message: string, duration: number = 5000): void => {
	toast.update(id, {
		render: ({ id, onClose }) => getToastElement(type, message, id as ToastId, onClose),
		duration
	})
}

export const dismiss = (id: ToastId): void => {
	toast.close(id)
}

export const dismissAll = (): void => {
	toast.closeAll()
}

export const remove = (id: string): void => {
	toast.close(id)
}

export const removeAll = (): void => {
	toast.closeAll()
}

export const toastActiveCount = (): number => activeToasts

const Toast = {
	show,
	update,
	dismiss,
	dismissAll,
	remove,
	removeAll,
	toastActiveCount
}

export default Toast
