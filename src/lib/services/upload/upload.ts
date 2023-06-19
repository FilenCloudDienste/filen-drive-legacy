import { UploadQueueItem, ItemProps } from "../../../types"
import mimeTypes from "mime-types"
import { generateRandomString, Semaphore, getUploadV3Server, canCompressThumbnail, getFileExt, readChunk } from "../../helpers"
import { encryptMetadata, hashFn, encryptAndUploadFileChunk, bufferToHash } from "../../worker/worker.com"
import db from "../../db"
import eventListener from "../../eventListener"
import { MAX_CONCURRENT_UPLOADS, MAX_UPLOAD_THREADS, UPLOAD_VERSION } from "../../constants"
import { markUploadAsDone, checkIfItemParentIsShared } from "../../api"
import { addItemsToStore } from "../metadata"
import { fetchUserInfoCached } from "../user"
import { generateThumbnailAfterUpload } from "../thumbnails"
import { show as showToast } from "../../../components/Toast/Toast"
import { i18n } from "../../../i18n"
import memoryCache from "../../memoryCache"

const uploadSemaphore = new Semaphore(MAX_CONCURRENT_UPLOADS)
const uploadThreadsSemaphore = new Semaphore(MAX_UPLOAD_THREADS)

export const queueFileUpload = (item: UploadQueueItem, parent: string): Promise<ItemProps> => {
	return new Promise(async (resolve, reject) => {
		eventListener.emit("upload", {
			type: "start",
			data: item
		})

		await uploadSemaphore.acquire()

		const userInfo = fetchUserInfoCached()

		if (typeof userInfo !== "undefined") {
			if (userInfo.storageUsed + (item.file.size + 1024) >= userInfo.maxStorage) {
				eventListener.emit("openMaxStorageModal")

				return reject(new Error("notEnoughRemoteStorage"))
			}
		}

		try {
			var [apiKey, masterKeys] = await Promise.all([db.get("apiKey"), db.get("masterKeys")])

			if (!Array.isArray(masterKeys)) {
				return reject("Master keys empty")
			}

			if (masterKeys.length == 0) {
				return reject("Master keys empty")
			}
		} catch (e) {
			return reject(e)
		}

		const name = item.file.name
		const size = item.file.size
		const mime = item.file.type || mimeTypes.lookup(name) || ""
		const chunkSizeToUse = 1024 * 1024 * 1
		let dummyOffset = 0
		let fileChunks = 0
		const lastModified = item.file.lastModified || Date.now()
		let paused = false
		let stopped = false
		let err = undefined
		let bucket = "filen-1"
		let region = "de-1"

		while (dummyOffset < size) {
			fileChunks += 1
			dummyOffset += chunkSizeToUse
		}

		const key = generateRandomString(32)
		const uuid = item.uuid
		const rm = generateRandomString(32)
		const uploadKey = generateRandomString(32)

		try {
			var [nameEncrypted, mimeEncrypted, sizeEncrypted, metadata, nameHashed] = await Promise.all([
				encryptMetadata(name, key),
				encryptMetadata(mime, key),
				encryptMetadata(size.toString(), key),
				encryptMetadata(
					JSON.stringify({
						name,
						size,
						mime,
						key,
						lastModified
					}),
					masterKeys[masterKeys.length - 1]
				),
				hashFn(name.toLowerCase())
			])
		} catch (e) {
			return reject(e)
		}

		const pauseListener = eventListener.on("pauseTransfer", (passedUUID: string) => {
			if (passedUUID == uuid) {
				paused = true
			}
		})

		const resumeListener = eventListener.on("resumeTransfer", (passedUUID: string) => {
			if (passedUUID == uuid) {
				paused = false
			}
		})

		const stopListener = eventListener.on("stopTransfer", (passedUUID: string) => {
			if (passedUUID == uuid) {
				stopped = true
			}
		})

		const cleanup = (): void => {
			try {
				uploadSemaphore.release()
				pauseListener.remove()
				resumeListener.remove()
				stopListener.remove()
			} catch (e) {
				console.error(e)
			}
		}

		eventListener.emit("upload", {
			type: "started",
			data: item
		})

		const upload = (index: number): Promise<any> => {
			return new Promise(async (resolve, reject) => {
				if (paused) {
					await new Promise(resolve => {
						const wait = setInterval(() => {
							if (!paused || stopped) {
								clearInterval(wait)

								return resolve(true)
							}
						}, 10)
					})
				}

				if (stopped) {
					return reject("stopped")
				}

				const params = new URLSearchParams({
					uuid,
					index,
					parent,
					uploadKey
				} as any).toString()

				const url = getUploadV3Server() + "/v3/upload?" + params

				readChunk(item.file, index, chunkSizeToUse)
					.then(chunk => {
						encryptAndUploadFileChunk(new Uint8Array(chunk), key, url, uuid, apiKey).then(resolve).catch(reject)
					})
					.catch(reject)
			})
		}

		try {
			await new Promise((resolve, reject) => {
				let done = 0

				for (let i = 0; i < fileChunks; i++) {
					uploadThreadsSemaphore.acquire().then(() => {
						if (stopped) {
							uploadThreadsSemaphore.release()

							return reject("stopped")
						}

						upload(i)
							.then(res => {
								bucket = res.data.bucket
								region = res.data.region

								if (stopped) {
									uploadThreadsSemaphore.release()

									return reject("stopped")
								}

								done += 1

								uploadThreadsSemaphore.release()

								if (done >= fileChunks) {
									return resolve(true)
								}
							})
							.catch(err => {
								uploadThreadsSemaphore.release()

								return reject(err)
							})
					})
				}
			})
		} catch (e: any) {
			if (e.toString().toLowerCase().indexOf("already exists") !== -1) {
				cleanup()

				eventListener.emit("upload", {
					type: "err",
					err: e.toString(),
					data: item
				})

				return
			} else if (e == "stopped") {
				cleanup()

				eventListener.emit("upload", {
					type: "err",
					err: e.toString(),
					data: item
				})

				return
			}

			cleanup()

			err = e
		}

		if (typeof err !== "undefined") {
			eventListener.emit("upload", {
				type: "err",
				err: err.toString(),
				data: item
			})

			cleanup()

			if (err == "stopped") {
				return reject("stopped")
			} else if (err.toString().toLowerCase().indexOf("blacklist") !== -1) {
				showToast("error", i18n("en", "notEnoughRemoteStorage"))

				return reject("notEnoughRemoteStorage")
			} else {
				showToast("error", err.toString())

				return reject(err)
			}
		}

		memoryCache.set("suppressFileNewSocketEvent:" + uuid, uuid)

		try {
			const done = await markUploadAsDone({
				uuid,
				name: nameEncrypted,
				nameHashed,
				size: sizeEncrypted,
				chunks: fileChunks,
				mime: mimeEncrypted,
				rm,
				metadata,
				version: UPLOAD_VERSION,
				uploadKey
			})

			fileChunks = done.chunks

			await checkIfItemParentIsShared({
				type: "file",
				parent,
				metaData: {
					uuid,
					name,
					size,
					mime,
					key,
					lastModified
				}
			})
		} catch (e: any) {
			eventListener.emit("upload", {
				type: "err",
				err: e.toString(),
				data: item
			})

			cleanup()

			return reject(e)
		}

		try {
			if (canCompressThumbnail(getFileExt(name))) {
				await generateThumbnailAfterUpload(item.file, uuid, name)
			}
		} catch (e) {
			console.error(e)
		}

		cleanup()

		const newItem: ItemProps = {
			root: "",
			type: "file",
			uuid,
			name,
			size,
			mime,
			lastModified,
			lastModifiedSort: lastModified,
			timestamp: Math.floor(Date.now() / 1000),
			selected: false,
			color: "default",
			parent,
			rm,
			version: UPLOAD_VERSION,
			sharerEmail: "",
			sharerId: 0,
			receiverEmail: "",
			receiverId: 0,
			writeAccess: false,
			chunks: fileChunks,
			favorited: 0,
			key,
			bucket,
			region
		}

		// For some reason we need to add a timeout here for the events to fire because sometimes the useTransfers() hook does not work (maybe due to a race condition?)
		setTimeout(() => {
			eventListener.emit("fileUploaded", {
				item: newItem
			})

			eventListener.emit("upload", {
				type: "done",
				data: item
			})

			addItemsToStore([newItem], newItem.parent).catch(console.error)
		}, 250)

		resolve(newItem)
	})
}
