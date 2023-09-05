import { ItemProps, Download } from "../../../types"
import { MAX_CONCURRENT_DOWNLOADS, MAX_DOWNLOAD_THREADS, MAX_DOWNLOAD_WRITERS } from "../../constants"
import eventListener from "../../eventListener"
import { Semaphore, getDownloadServer, mergeUInt8Arrays, sanitizeSVG } from "../../helpers"
import streamSaver from "../../streamSaver"
import { downloadAndDecryptChunk } from "../../worker/worker.com"
import { getDirectoryTree } from "../items"
import db from "../../db"
import { downloadZip } from "client-zip"
import { showSaveFilePicker, FileSystemWritableFileStream } from "native-file-system-adapter"

const downloadSemaphore = new Semaphore(MAX_CONCURRENT_DOWNLOADS)
const downloadThreadsSemaphore = new Semaphore(MAX_DOWNLOAD_THREADS)
const writersSemaphore = new Semaphore(MAX_DOWNLOAD_WRITERS)

export const downloadFile = (
	item: ItemProps,
	streamToDisk: boolean = true,
	maxChunks: number = Infinity
): Promise<ItemProps | Uint8Array> => {
	return new Promise(async (resolve, reject) => {
		let currentWriteIndex = 0
		let paused = false
		let stopped = false
		let chunksConcatted: Uint8Array = new Uint8Array()
		let writer: FileSystemWritableFileStream | WritableStreamDefaultWriter

		if (streamToDisk) {
			try {
				const stream = await showSaveFilePicker({
					suggestedName: item.name
				})

				writer = await stream.createWritable()
			} catch (e: any) {
				if (e.toString().toLowerCase().indexOf("aborted") !== -1) {
					reject(e)

					eventListener.emit("download", {
						type: "done",
						data: item
					})

					return
				}

				const stream = streamSaver.createWriteStream(item.name, {
					size: item.size
				})

				writer = stream.getWriter()
			}

			if (!writer) {
				reject(new Error("Could not get download stream writer"))

				return
			}
		}

		const pauseListener = eventListener.on("pauseTransfer", (uuid: string) => {
			if (uuid == item.uuid) {
				paused = true
			}
		})

		const resumeListener = eventListener.on("resumeTransfer", (uuid: string) => {
			if (uuid == item.uuid) {
				paused = false
			}
		})

		const stopListener = eventListener.on("stopTransfer", (uuid: string) => {
			if (uuid == item.uuid) {
				stopped = true
			}
		})

		const cleanup = (abort = false): void => {
			try {
				stopListener.remove()
				pauseListener.remove()
				resumeListener.remove()

				if (streamToDisk) {
					if (abort) {
						writer.abort().catch(console.error)
					} else {
						writer.close().catch(console.error)
					}
				}
			} catch (e) {
				console.error(e)
			}
		}

		const download = (index: number): Promise<{ index: number; chunk: Uint8Array }> => {
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

				const url = getDownloadServer() + "/" + item.region + "/" + item.bucket + "/" + item.uuid + "/" + index

				downloadAndDecryptChunk(item, url)
					.then(chunk => {
						return resolve({
							index,
							chunk
						})
					})
					.catch(reject)
			})
		}

		const write = (index: number, chunk: Uint8Array) => {
			if (index !== currentWriteIndex) {
				return setTimeout(() => {
					write(index, chunk)
				}, 10)
			}

			if (streamToDisk) {
				writer
					.write(chunk)
					.then(() => {
						currentWriteIndex += 1

						writersSemaphore.release()
					})
					.catch(() => {
						cleanup()

						eventListener.emit("download", {
							type: "err",
							err: "Stream error",
							data: item
						})

						return reject(new Error("Stream error"))
					})
			} else {
				chunksConcatted = mergeUInt8Arrays(chunksConcatted, chunk)

				currentWriteIndex += 1

				writersSemaphore.release()
			}
		}

		eventListener.emit("download", {
			type: "started",
			data: item
		})

		const chunksToDownload = maxChunks === Infinity ? item.chunks : maxChunks > item.chunks ? item.chunks : maxChunks

		try {
			await new Promise((resolve, reject) => {
				let done = 0

				for (let i = 0; i < chunksToDownload; i++) {
					Promise.all([downloadThreadsSemaphore.acquire(), writersSemaphore.acquire()]).then(() => {
						if (stopped) {
							downloadThreadsSemaphore.release()
							writersSemaphore.release()

							return reject("stopped")
						}

						download(i)
							.then(({ index, chunk }) => {
								if (stopped) {
									downloadThreadsSemaphore.release()
									writersSemaphore.release()

									return reject("stopped")
								}

								write(index, chunk)

								done += 1

								downloadThreadsSemaphore.release()

								if (done >= chunksToDownload) {
									return resolve(true)
								}
							})
							.catch(err => {
								downloadThreadsSemaphore.release()
								writersSemaphore.release()

								return reject(err)
							})
					})
				}
			})

			await new Promise(resolve => {
				if (currentWriteIndex >= chunksToDownload) {
					return resolve(true)
				}

				const wait = setInterval(() => {
					if (currentWriteIndex >= chunksToDownload) {
						clearInterval(wait)

						return resolve(true)
					}
				}, 10)
			})
		} catch (e: any) {
			cleanup(true)

			eventListener.emit("download", {
				type: "err",
				err: e.toString(),
				data: item
			})

			console.error(e)

			return reject(e)
		}

		eventListener.emit("download", {
			type: "done",
			data: item
		})

		cleanup()

		if (streamToDisk) {
			return resolve(item)
		}

		try {
			if (item.name.endsWith(".svg") || item.mime === "image/svg+xml") {
				const sanitizedSVG = await sanitizeSVG(
					new File([chunksConcatted], item.name, {
						type: item.mime,
						lastModified: item.lastModified
					})
				)

				const sanitizedArrayBuffer = await sanitizedSVG.arrayBuffer()

				return resolve(new Uint8Array(sanitizedArrayBuffer))
			}
		} catch (e: any) {
			console.error(e)

			return reject(e)
		}

		return resolve(chunksConcatted)
	})
}

export const queueFileDownload = (item: ItemProps, streamToDisk: boolean = true): Promise<ItemProps | Uint8Array> => {
	return new Promise(async (resolve, reject) => {
		eventListener.emit("download", {
			type: "start",
			data: item
		})

		await downloadSemaphore.acquire()

		downloadFile(item, streamToDisk)
			.then(result => {
				downloadSemaphore.release()

				return resolve(streamToDisk ? (result as ItemProps) : (result as Uint8Array))
			})
			.catch(err => {
				downloadSemaphore.release()

				console.error(err)

				return reject(err)
			})
	})
}

export const downloadMultipleFilesAsZipStream = (items: ItemProps[], paths: { [key: string]: string }, name?: string): Promise<boolean> => {
	return new Promise(async (resolve, reject) => {
		const totalSize: number = items.reduce((prev, current) => prev + current.size, 0)
		let streamDestroyed: boolean = false
		let cleanedUp: boolean = false
		let writer: FileSystemWritableFileStream | WritableStreamDefaultWriter | WritableStream<any>

		if (totalSize <= 0 || items.length == 0) {
			return reject(new Error("downloadMultipleFilesAsZipStream: File list empty"))
		}

		try {
			const stream = await showSaveFilePicker({
				suggestedName: name ? name : "Download_" + Date.now() + ".zip"
			})

			writer = await stream.createWritable()
		} catch (e: any) {
			if (e.toString().toLowerCase().indexOf("aborted") !== -1) {
				reject(e)

				return
			}

			const stream = streamSaver.createWriteStream(name ? name : "Download_" + Date.now() + ".zip", {
				size: totalSize
			})

			writer = stream
		}

		if (!writer) {
			reject(new Error("Could not get download stream writer"))

			return
		}

		const cleanup = () => {
			if (cleanedUp) return

			cleanedUp = true

			for (let i = 0; i < items.length; i++) {
				downloadSemaphore.release()

				for (let x = 0; x < items[i].chunks + 1; x++) {
					writersSemaphore.release()
				}

				eventListener.emit("download", {
					type: "err",
					data: items[i],
					err: "Stream stopped"
				} as Download)
			}
		}

		downloadZip(
			items.map(item => {
				return {
					name: paths[item.uuid],
					lastModified: item.lastModified,
					input: new ReadableStream({
						async start(controller) {
							if (streamDestroyed) {
								cleanup()

								return controller.close()
							}

							eventListener.emit("download", {
								type: "start",
								data: item
							})

							await downloadSemaphore.acquire()

							let currentWriteIndex: number = 0

							const write = (index: number, chunk: Uint8Array) => {
								if (index !== currentWriteIndex) {
									return setTimeout(() => {
										write(index, chunk)
									}, 10)
								}

								controller.enqueue(chunk)

								currentWriteIndex += 1

								writersSemaphore.release()
							}

							const download = (index: number): Promise<{ index: number; chunk: Uint8Array }> => {
								return new Promise(async (resolve, reject) => {
									if (streamDestroyed) {
										cleanup()

										return reject("stopped")
									}

									const url = getDownloadServer() + "/" + item.region + "/" + item.bucket + "/" + item.uuid + "/" + index

									downloadAndDecryptChunk(item, url)
										.then(chunk => {
											return resolve({
												index,
												chunk
											})
										})
										.catch(reject)
								})
							}

							eventListener.emit("download", {
								type: "started",
								data: item
							})

							try {
								await new Promise(resolve => {
									let done: number = 0

									for (let i = 0; i < item.chunks; i++) {
										Promise.all([downloadThreadsSemaphore.acquire(), writersSemaphore.acquire()]).then(() => {
											download(i)
												.then(({ index, chunk }) => {
													if (streamDestroyed) {
														cleanup()

														downloadThreadsSemaphore.release()

														return reject("stopped")
													}

													write(index, chunk)

													done += 1

													downloadThreadsSemaphore.release()

													if (done >= item.chunks) {
														return resolve(true)
													}
												})
												.catch(err => {
													downloadThreadsSemaphore.release()
													writersSemaphore.release()

													return reject(err)
												})
										})
									}
								})

								await new Promise(resolve => {
									if (currentWriteIndex >= item.chunks) {
										return resolve(true)
									}

									const wait = setInterval(() => {
										if (currentWriteIndex >= item.chunks) {
											clearInterval(wait)

											return resolve(true)
										}
									}, 10)
								})
							} catch (e: any) {
								eventListener.emit("download", {
									type: "err",
									err: e.toString(),
									data: item
								})

								if (e == "stopped") {
									downloadSemaphore.release()

									return controller.close()
								}

								throw e
							}

							eventListener.emit("download", {
								type: "done",
								data: item
							})

							downloadSemaphore.release()

							return controller.close()
						}
					})
				}
			})
		)
			.body?.pipeTo(writer)
			.then(() => {
				return resolve(true)
			})
			.catch(err => {
				streamDestroyed = true

				cleanup()

				return reject(err)
			})
	})
}

export const normalDownload = async (selected: ItemProps[], loadCallback?: Function) => {
	const paths: Record<string, string> = {}
	const pathExists: Record<string, boolean> = {}
	const folders = selected.filter(item => item.type === "folder")
	const folderCount = folders.length
	const zipItems: ItemProps[] = []
	const userId = await db.get("userId")

	if (folderCount > 0) {
		for (let i = 0; i < selected.length; i++) {
			if (selected[i].type === "file") {
				if (!pathExists[selected[i].name]) {
					pathExists[selected[i].name] = true
					paths[selected[i].uuid] = selected[i].name

					zipItems.push(selected[i])
				}
			} else {
				const folderItems =
					typeof selected[i].linkUUID === "string"
						? await getDirectoryTree(
								selected[i].uuid,
								"linked",
								selected[i].linkUUID,
								selected[i].linkHasPassword,
								selected[i].linkPassword,
								selected[i].linkSalt,
								selected[i].linkKey
						  )
						: await getDirectoryTree(selected[i].uuid, selected[i].receiverId === userId ? "shared" : "normal")

				for (let x = 0; x < folderItems.length; x++) {
					if (folderItems[x].item.type === "file" && !pathExists[folderItems[x].path]) {
						pathExists[folderItems[x].path] = true
						paths[folderItems[x].item.uuid] = folderItems[x].path

						zipItems.push(folderItems[x].item)
					}
				}
			}
		}

		if (typeof loadCallback === "function") {
			loadCallback(true)
		}

		if (zipItems.length <= 0) {
			return
		}

		downloadMultipleFilesAsZipStream(
			zipItems,
			paths,
			folderCount === 1 ? (folders[0].name || "Download_" + Date.now()) + ".zip" : undefined
		).catch(console.error)
	} else {
		if (selected.length <= 1) {
			queueFileDownload(selected[0]).catch(console.error)

			if (typeof loadCallback === "function") {
				loadCallback(true)
			}

			return
		}

		for (let i = 0; i < selected.length; i++) {
			if (selected[i].type === "file") {
				if (!pathExists[selected[i].name]) {
					pathExists[selected[i].name] = true
					paths[selected[i].uuid] = selected[i].name

					zipItems.push(selected[i])
				}
			}
		}

		if (typeof loadCallback === "function") {
			loadCallback(true)
		}

		if (zipItems.length <= 0) {
			return
		}

		downloadMultipleFilesAsZipStream(zipItems, paths).catch(console.error)
	}
}

export const zipDownload = async (selected: ItemProps[], loadCallback?: Function) => {
	const paths: Record<string, string> = {}
	const pathExists: Record<string, boolean> = {}
	const folders = selected.filter(item => item.type === "folder")
	const folderCount = folders.length
	const userId = await db.get("userId")
	const zipItems: ItemProps[] = []

	if (folderCount > 0) {
		for (let i = 0; i < selected.length; i++) {
			if (selected[i].type === "file") {
				if (!pathExists[selected[i].name]) {
					pathExists[selected[i].name] = true
					paths[selected[i].uuid] = selected[i].name

					zipItems.push(selected[i])
				}
			} else {
				const folderItems =
					typeof selected[i].linkUUID === "string"
						? await getDirectoryTree(
								selected[i].uuid,
								"linked",
								selected[i].linkUUID,
								selected[i].linkHasPassword,
								selected[i].linkPassword,
								selected[i].linkSalt,
								selected[i].linkKey
						  )
						: await getDirectoryTree(selected[i].uuid, selected[i].receiverId === userId ? "shared" : "normal")

				for (let x = 0; x < folderItems.length; x++) {
					if (folderItems[x].item.type === "file" && !pathExists[folderItems[x].path]) {
						pathExists[folderItems[x].path] = true
						paths[folderItems[x].item.uuid] = folderItems[x].path

						zipItems.push(folderItems[x].item)
					}
				}
			}
		}

		if (typeof loadCallback === "function") {
			loadCallback(true)
		}

		if (zipItems.length <= 0) {
			return
		}

		downloadMultipleFilesAsZipStream(
			zipItems,
			paths,
			folderCount === 1 ? (folders[0].name || "Download_" + Date.now()) + ".zip" : undefined
		).catch(console.error)
	} else {
		for (let i = 0; i < selected.length; i++) {
			if (!pathExists[selected[i].name]) {
				pathExists[selected[i].name] = true
				paths[selected[i].uuid] = selected[i].name
			}
		}

		if (selected.length > 0) {
			downloadMultipleFilesAsZipStream(selected, paths).catch(console.error)
		}

		if (typeof loadCallback === "function") {
			loadCallback(true)
		}
	}
}
