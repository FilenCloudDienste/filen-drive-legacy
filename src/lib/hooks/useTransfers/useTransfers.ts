import { useState, useEffect } from "react"
import eventListener from "../../eventListener"
import type {
	CurrentDownload,
	ProgressData,
	CurrentUpload,
	Upload,
	Download,
	UseTransfersParams,
	UseTransfers
} from "../../../types"
import { calcSpeed, calcTimeLeft } from "../../helpers"
import memoryCache from "../../memoryCache"

const useTransfers = ({
	onUploadStart,
	onUploadStarted,
	onUploadDone,
	onUploadError,
	onDownloadStart,
	onDownloadStarted,
	onDownloadDone,
	onDownloadError,
	onUploadProgress,
	onDownloadProgress,
	onTransferStopped
}: UseTransfersParams): UseTransfers => {
	const [currentUploads, setCurrentUploads] = useState<Record<string, CurrentUpload>>({})
	const [currentDownloads, setCurrentDownloads] = useState<Record<string, CurrentDownload>>({})

	useEffect(() => {
		const uploadListener = eventListener.on("upload", (data: Upload) => {
			if (memoryCache.has("hideTransferProgress:" + data.data.uuid)) {
				return
			}

			const now: number = new Date().getTime()

			if (data.type === "start") {
				if (typeof onUploadStart == "function") {
					onUploadStart(data)
				}

				setCurrentUploads(prev => ({
					...prev,
					[data.data.uuid]: {
						...data.data,
						started: now,
						bytes: 0,
						percent: 0,
						lastTime: now,
						lastBps: 0,
						timeLeft: 0,
						timestamp: now
					}
				}))
			} else if (data.type === "started") {
				if (typeof onUploadStarted == "function") {
					onUploadStarted(data)
				}

				setCurrentUploads(prev => ({
					...prev,
					[data.data.uuid]: {
						...data.data,
						started: now,
						bytes: 0,
						percent: 0,
						lastTime: now,
						lastBps: 0,
						timeLeft: 0,
						timestamp: now
					}
				}))
			} else if (data.type === "done") {
				if (typeof onUploadDone == "function") {
					onUploadDone(data)
				}

				setCurrentUploads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)
			} else if (data.type === "err") {
				if (typeof onUploadError == "function") {
					onUploadError(data)
				}

				setCurrentUploads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)
			}
		})

		const downloadListener = eventListener.on("download", (data: Download) => {
			if (memoryCache.has("hideTransferProgress:" + data.data.uuid)) {
				return
			}

			const now: number = new Date().getTime()

			if (data.type === "start") {
				if (typeof onDownloadStart == "function") {
					onDownloadStart(data)
				}

				setCurrentDownloads(prev => ({
					...prev,
					[data.data.uuid]: {
						file: data.data,
						uuid: data.data.uuid,
						started: now,
						bytes: 0,
						percent: 0,
						lastTime: now,
						lastBps: 0,
						timeLeft: 0,
						timestamp: now
					}
				}))
			} else if (data.type === "started") {
				if (typeof onDownloadStarted == "function") {
					onDownloadStarted(data)
				}

				setCurrentDownloads(prev => ({
					...prev,
					[data.data.uuid]: {
						file: data.data,
						uuid: data.data.uuid,
						started: now,
						bytes: 0,
						percent: 0,
						lastTime: now,
						lastBps: 0,
						timeLeft: 0,
						timestamp: now
					}
				}))
			} else if (data.type === "done") {
				if (typeof onDownloadDone == "function") {
					onDownloadDone(data)
				}

				setCurrentDownloads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)
			} else if (data.type === "err") {
				if (typeof onDownloadError == "function") {
					onDownloadError(data)
				}

				setCurrentDownloads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)
			}
		})

		const uploadProgressListener = eventListener.on("uploadProgress", (data: ProgressData) => {
			if (memoryCache.has("hideTransferProgress:" + data.data.uuid)) {
				return
			}

			const now: number = new Date().getTime()

			if (typeof onUploadProgress == "function") {
				onUploadProgress(data)
			}

			setCurrentUploads(prev =>
				Object.keys(prev).filter(key => key === data.data.uuid).length > 0
					? {
							...prev,
							[data.data.uuid]: {
								...prev[data.data.uuid],
								percent:
									((prev[data.data.uuid].bytes + data.data.bytes) /
										Math.floor((prev[data.data.uuid].file.size || 0) * 1)) *
									100,
								lastBps: calcSpeed(
									now,
									prev[data.data.uuid].started,
									prev[data.data.uuid].bytes + data.data.bytes
								),
								lastTime: now,
								bytes: prev[data.data.uuid].bytes + data.data.bytes,
								timeLeft: calcTimeLeft(
									prev[data.data.uuid].bytes + data.data.bytes,
									Math.floor((prev[data.data.uuid].file.size || 0) * 1),
									prev[data.data.uuid].started
								)
							}
					  }
					: prev
			)
		})

		const downloadProgressListener = eventListener.on("downloadProgress", (data: ProgressData) => {
			if (memoryCache.has("hideTransferProgress:" + data.data.uuid)) {
				return
			}

			const now: number = new Date().getTime()

			if (typeof onDownloadProgress == "function") {
				onDownloadProgress(data)
			}

			setCurrentDownloads(prev =>
				Object.keys(prev).filter(key => key === data.data.uuid).length > 0
					? {
							...prev,
							[data.data.uuid]: {
								...prev[data.data.uuid],
								percent:
									((prev[data.data.uuid].bytes + data.data.bytes) /
										Math.floor((prev[data.data.uuid].file.size || 0) * 1)) *
									100,
								lastBps: calcSpeed(
									now,
									prev[data.data.uuid].started,
									prev[data.data.uuid].bytes + data.data.bytes
								),
								lastTime: now,
								bytes: prev[data.data.uuid].bytes + data.data.bytes,
								timeLeft: calcTimeLeft(
									prev[data.data.uuid].bytes + data.data.bytes,
									Math.floor((prev[data.data.uuid].file.size || 0) * 1),
									prev[data.data.uuid].started
								)
							}
					  }
					: prev
			)
		})

		const stopTransferListener = eventListener.on("stopTransfer", (uuid: string) => {
			if (memoryCache.has("hideTransferProgress:" + uuid)) {
				return
			}

			if (typeof onTransferStopped == "function") {
				onTransferStopped(uuid)
			}

			setCurrentUploads(prev =>
				Object.keys(prev)
					.filter(key => key !== uuid)
					.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
			)
			setCurrentDownloads(prev =>
				Object.keys(prev)
					.filter(key => key !== uuid)
					.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
			)
		})

		return () => {
			uploadListener.remove()
			uploadProgressListener.remove()
			downloadListener.remove()
			downloadProgressListener.remove()
			stopTransferListener.remove()
		}
	}, [
		onDownloadDone,
		onDownloadError,
		onDownloadStarted,
		onDownloadProgress,
		onDownloadStart,
		onTransferStopped,
		onUploadDone,
		onUploadError,
		onUploadProgress,
		onUploadStart,
		onUploadStarted
	])

	return {
		currentUploads,
		currentDownloads
	}
}

export default useTransfers
