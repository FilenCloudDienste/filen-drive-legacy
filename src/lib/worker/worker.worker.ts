import { expose, transfer } from "comlink"
import axios from "axios"
import memoryCache from "../memoryCache"
import {
	arrayBufferToHex,
	base64ToArrayBuffer,
	arrayBufferToBase64,
	generateRandomString,
	convertTimestampToMs,
	mergeUInt8Arrays,
	getAPIV3Server,
	convertWordArrayToArrayBuffer,
	convertArrayBufferToBinaryString,
	parseURLParams
} from "../helpers"
// @ts-ignore
import CryptoApi from "crypto-api-v1"
import CryptoJS from "crypto-js"
import { ItemProps } from "../../types"
import {
	MAX_DOWNLOAD_RETRIES,
	DOWNLOAD_RETRY_TIMEOUT,
	MAX_API_RETRIES,
	MAX_UPLOAD_RETRIES,
	UPLOAD_RETRY_TIMEOUT,
	API_RETRY_TIMEOUT
} from "../constants"
import heicConvert from "heic-convert"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const apiRequest = (
	method: string = "POST",
	endpoint: string,
	data: any,
	apiKey: string | null
): Promise<{ status: boolean; message: string; code: string; data: any }> => {
	return new Promise((resolve, reject) => {
		let current = -1
		let lastErr: Error

		bufferToHash(textEncoder.encode(JSON.stringify(typeof data !== "undefined" ? data : {})), "SHA-512")
			.then(checksum => {
				const req = () => {
					current += 1

					if (current >= MAX_API_RETRIES) {
						return reject(lastErr)
					}

					const promise =
						method.toUpperCase() === "POST"
							? axios.post(getAPIV3Server() + endpoint, data, {
									headers: {
										Authorization: "Bearer " + apiKey,
										Checksum: checksum
									}
							  })
							: axios.get(getAPIV3Server() + endpoint, {
									headers: {
										Authorization: "Bearer " + apiKey
									}
							  })

					promise
						.then(response => {
							if (response.status !== 200) {
								lastErr = new Error("Response status " + response.status)

								setTimeout(req, API_RETRY_TIMEOUT)

								return
							}

							return resolve(response.data)
						})
						.catch(err => {
							lastErr = err

							setTimeout(req, API_RETRY_TIMEOUT)
						})
				}

				req()
			})
			.catch(reject)
	})
}

const generateKeypair = async (): Promise<{ publicKey: string; privateKey: string }> => {
	const keyPair = await globalThis.crypto.subtle.generateKey(
		{
			name: "RSA-OAEP",
			modulusLength: 4096,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: "SHA-512"
		},
		true,
		["encrypt", "decrypt"]
	)

	const pubKey = await globalThis.crypto.subtle.exportKey("spki", keyPair.publicKey)
	const b64PubKey = arrayBufferToBase64(pubKey)
	const privKey = await globalThis.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
	const b64PrivKey = arrayBufferToBase64(privKey)

	if (b64PubKey.length > 16 && b64PrivKey.length > 16) {
		return { publicKey: b64PubKey, privateKey: b64PrivKey }
	}

	throw new Error("Key lengths invalid")
}

const deriveKeyFromPassword = async (
	password: string,
	salt: string,
	iterations: number,
	hash: string,
	bitLength: number,
	returnHex: boolean
): Promise<string | ArrayBuffer> => {
	const cacheKey =
		"deriveKeyFromPassword:" + password + ":" + salt + ":" + iterations + ":" + hash + ":" + bitLength + ":" + returnHex.toString()

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	const bits = await globalThis.crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: textEncoder.encode(salt),
			iterations: iterations,
			hash: {
				name: hash
			}
		},
		await globalThis.crypto.subtle.importKey(
			"raw",
			textEncoder.encode(password),
			{
				name: "PBKDF2"
			},
			false,
			["deriveBits"]
		),
		bitLength
	)

	const key = returnHex ? arrayBufferToHex(bits) : bits

	memoryCache.set(cacheKey, key)

	return key
}

const hashPassword = async (password: string): Promise<string> => {
	//old and deprecated, no longer in use
	const hash =
		CryptoApi.hash("sha512", CryptoApi.hash("sha384", CryptoApi.hash("sha256", CryptoApi.hash("sha1", password)))) +
		CryptoApi.hash("sha512", CryptoApi.hash("md5", CryptoApi.hash("md4", CryptoApi.hash("md2", password))))

	return hash
}

const hashFn = async (str: string): Promise<string> => {
	const hash = CryptoApi.hash("sha1", CryptoApi.hash("sha512", str))

	return hash
}

const generatePasswordAndMasterKeysBasedOnAuthVersion = async (
	rawPassword: string,
	authVersion: number,
	salt: string
): Promise<{ derivedMasterKeys: string; derivedPassword: string }> => {
	let derivedPassword: any = ""
	let derivedMasterKeys: any = undefined

	if (authVersion == 1) {
		//old and deprecated, no longer in use
		derivedPassword = await hashPassword(rawPassword)
		derivedMasterKeys = await hashFn(rawPassword)
	} else if (authVersion == 2) {
		const derivedKey = (await deriveKeyFromPassword(rawPassword, salt, 200000, "SHA-512", 512, true)) as string

		derivedMasterKeys = derivedKey.substring(0, derivedKey.length / 2)
		derivedPassword = derivedKey.substring(derivedKey.length / 2, derivedKey.length)
		derivedPassword = CryptoJS.SHA512(derivedPassword).toString()
	} else {
		throw new Error("Invalid auth version: " + authVersion)
	}

	return { derivedMasterKeys, derivedPassword }
}

const decryptMetadata = async (data: string, key: string): Promise<any> => {
	const cacheKey: string = "decryptMetadata:" + data.toString() + ":" + key

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	const sliced: string = data.slice(0, 8)

	if (sliced == "U2FsdGVk") {
		//old and deprecated, no longer in use
		try {
			const decrypted = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8)

			memoryCache.set(cacheKey, decrypted)

			return decrypted
		} catch (e) {
			return ""
		}
	} else {
		const version: string = data.slice(0, 3)

		if (version == "002") {
			try {
				key = (await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false)) as string //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

				const iv = textEncoder.encode(data.slice(3, 15))
				const encrypted = base64ToArrayBuffer(data.slice(15))

				const decrypted = await globalThis.crypto.subtle.decrypt(
					{
						name: "AES-GCM",
						iv
					},
					await globalThis.crypto.subtle.importKey("raw", key as any, "AES-GCM", false, ["decrypt"]),
					encrypted
				)

				const result = textDecoder.decode(new Uint8Array(decrypted))

				memoryCache.set(cacheKey, result)

				return result
			} catch (e) {
				return ""
			}
		} else {
			return ""
		}
	}
}

const decryptFolderName = async (metadata: string, masterKeys: string[]): Promise<string> => {
	if (metadata.toLowerCase() == "default") {
		return "Default"
	}

	const cacheKey: string = "decryptFolderName:" + metadata.toString()

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	let folderName: string = ""

	for (let i = 0; i < masterKeys.length; i++) {
		try {
			const obj = JSON.parse(await decryptMetadata(metadata, masterKeys[i]))

			if (obj && typeof obj == "object") {
				if (typeof obj.name == "string") {
					if (obj.name.length > 0) {
						folderName = obj.name

						break
					}
				}
			}
		} catch (e) {
			continue
		}
	}

	if (typeof folderName == "string") {
		if (folderName.length > 0) {
			memoryCache.set(cacheKey, folderName)
		}
	}

	return folderName
}

const decryptFileMetadata = async (
	metadata: string,
	masterKeys: string[]
): Promise<{ name: string; size: number; mime: string; key: string; lastModified: number }> => {
	const cacheKey: string = "decryptFileMetadata:" + metadata

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	let fileName: string = ""
	let fileSize: number = 0
	let fileMime: string = ""
	let fileKey: string = ""
	let fileLastModified: number = 0

	for (let i = 0; i < masterKeys.length; i++) {
		try {
			const obj = JSON.parse(await decryptMetadata(metadata, masterKeys[i]))

			if (obj && typeof obj == "object") {
				if (typeof obj.name == "string") {
					if (obj.name.length > 0) {
						fileName = obj.name
						fileSize = parseInt(obj.size)
						fileMime = obj.mime
						fileKey = obj.key
						fileLastModified = parseInt(obj.lastModified)

						break
					}
				}
			}
		} catch (e) {
			continue
		}
	}

	const obj = {
		name: fileName,
		size: fileSize,
		mime: fileMime,
		key: fileKey,
		lastModified: convertTimestampToMs(fileLastModified)
	}

	if (typeof obj.name == "string") {
		if (obj.name.length > 0) {
			memoryCache.set(cacheKey, obj)
		}
	}

	return obj
}

const encryptMetadata = async (data: string, key: any): Promise<string> => {
	key = (await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false)) as string //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

	const iv: string = generateRandomString(12)
	const string: Uint8Array = textEncoder.encode(data)

	const encrypted: ArrayBuffer = await globalThis.crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: textEncoder.encode(iv)
		},
		await globalThis.crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]),
		string
	)

	return "002" + iv + arrayBufferToBase64(new Uint8Array(encrypted))
}

const encryptMetadataPublicKey = async (data: string, publicKey: string): Promise<string> => {
	const pubKey = await importPublicKey(publicKey, ["encrypt"])
	const encrypted = await globalThis.crypto.subtle.encrypt(
		{
			name: "RSA-OAEP"
		},
		pubKey,
		textEncoder.encode(data)
	)

	return arrayBufferToBase64(encrypted)
}

const decryptMetadataPrivateKey = async (data: string, privateKey: string): Promise<string> => {
	try {
		const cacheKey: string = "decryptMetadataPrivateKey:" + data

		if (memoryCache.has(cacheKey)) {
			return memoryCache.get(cacheKey)
		}

		const importedKey = await importPrivateKey(privateKey, ["decrypt"])
		const decrypted = await globalThis.crypto.subtle.decrypt(
			{
				name: "RSA-OAEP"
			},
			importedKey,
			base64ToArrayBuffer(data)
		)
		const metadata = textDecoder.decode(decrypted)

		memoryCache.set(cacheKey, metadata)

		return metadata
	} catch (e) {
		return ""
	}
}

const importPublicKey = async (publicKey: string, mode: KeyUsage[] = ["encrypt"]): Promise<CryptoKey> => {
	const cacheKey = "importPrivateKey:" + mode.join(":") + ":" + publicKey

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	const imported = await globalThis.crypto.subtle.importKey(
		"spki",
		base64ToArrayBuffer(publicKey),
		{
			name: "RSA-OAEP",
			hash: "SHA-512"
		},
		true,
		mode
	)

	memoryCache.set(cacheKey, imported)

	return imported
}

const importPrivateKey = async (privateKey: string, mode: KeyUsage[] = ["decrypt"]): Promise<CryptoKey> => {
	const cacheKey = "importPrivateKey:" + mode.join(":") + ":" + privateKey

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	const imported = await globalThis.crypto.subtle.importKey(
		"pkcs8",
		base64ToArrayBuffer(privateKey),
		{
			name: "RSA-OAEP",
			hash: "SHA-512"
		},
		true,
		mode
	)

	memoryCache.set(cacheKey, imported)

	return imported
}

const decryptFolderNamePrivateKey = async (data: string, privateKey: string): Promise<string> => {
	try {
		const cacheKey: string = "decryptFolderNamePrivateKey:" + data

		if (memoryCache.has(cacheKey)) {
			return memoryCache.get(cacheKey)
		}

		const importedKey = await importPrivateKey(privateKey, ["decrypt"])
		const decrypted = await globalThis.crypto.subtle.decrypt(
			{
				name: "RSA-OAEP"
			},
			importedKey,
			base64ToArrayBuffer(data)
		)
		const metadata = JSON.parse(textDecoder.decode(decrypted))

		let folderName: string = ""

		if (typeof metadata.name == "string") {
			if (metadata.name.length > 0) {
				folderName = metadata.name
			}
		}

		if (folderName.length > 0) {
			memoryCache.set(cacheKey, folderName)
		}

		return folderName
	} catch (e) {
		return ""
	}
}

const decryptFileMetadataPrivateKey = async (
	data: string,
	privateKey: string
): Promise<{ name: string; size: number; mime: string; key: string; lastModified: number }> => {
	try {
		const cacheKey: string = "decryptFileMetadataPrivateKey:" + data

		if (memoryCache.has(cacheKey)) {
			return memoryCache.get(cacheKey)
		}

		const importedKey = await importPrivateKey(privateKey, ["decrypt"])
		const decrypted = await globalThis.crypto.subtle.decrypt(
			{
				name: "RSA-OAEP"
			},
			importedKey,
			base64ToArrayBuffer(data)
		)
		const metadata = JSON.parse(textDecoder.decode(decrypted))

		let fileName: string = ""
		let fileSize: number = 0
		let fileMime: string = ""
		let fileKey: string = ""
		let fileLastModified: number = 0

		if (typeof metadata.name == "string") {
			if (metadata.name.length > 0) {
				fileName = metadata.name
				fileSize = metadata.size
				fileMime = metadata.mime
				fileKey = metadata.key
				fileLastModified = metadata.lastModified
			}
		}

		const obj = {
			name: fileName,
			size: fileSize,
			mime: fileMime,
			key: fileKey,
			lastModified: convertTimestampToMs(fileLastModified)
		}

		if (typeof obj.name == "string") {
			if (obj.name.length > 0) {
				memoryCache.set(cacheKey, obj)
			}
		}

		return obj
	} catch (e) {
		return {
			name: "",
			size: 0,
			mime: "",
			key: "",
			lastModified: 0
		}
	}
}

const encryptData = async (data: ArrayBuffer, key: string): Promise<Uint8Array> => {
	if (typeof data === "undefined" || typeof data.byteLength === "undefined" || data.byteLength === 0) {
		throw new Error("encryptData: Invalid data")
	}

	const iv = generateRandomString(12)
	const encrypted = await globalThis.crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: textEncoder.encode(iv)
		},
		await globalThis.crypto.subtle.importKey("raw", textEncoder.encode(key), "AES-GCM", false, ["encrypt"]),
		data
	)
	const result = mergeUInt8Arrays(textEncoder.encode(iv), new Uint8Array(encrypted))

	return transfer(result, [result.buffer])
}

const bufferToHash = async (buffer: Uint8Array, algorithm: "SHA-1" | "SHA-256" | "SHA-512" | "SHA-384"): Promise<string> => {
	const digest = await globalThis.crypto.subtle.digest(algorithm, buffer)
	const hashArray = Array.from(new Uint8Array(digest))
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

	return hashHex
}

const encryptAndUploadFileChunk = (chunk: Uint8Array, key: string, url: string, uuid: string, apiKey: string): Promise<any> => {
	return new Promise((resolve, reject) => {
		encryptData(chunk, key)
			.then(encryptedChunk => {
				if (encryptedChunk.byteLength <= 0) {
					reject(new Error("Chunk byteLength <= 0"))

					return
				}

				bufferToHash(encryptedChunk, "SHA-512")
					.then(chunkHash => {
						let current = -1
						let lastBytes = 0
						let lastErr: Error

						url = url + "&hash=" + encodeURIComponent(chunkHash)

						const urlParams = parseURLParams(url)

						bufferToHash(textEncoder.encode(JSON.stringify(urlParams)), "SHA-512")
							.then(checksum => {
								const req = () => {
									current += 1

									if (current >= MAX_UPLOAD_RETRIES) {
										return reject(lastErr)
									}

									lastBytes = 0

									axios({
										method: "post",
										url,
										data: new Blob([encryptedChunk]),
										timeout: 3600000,
										headers: {
											Authorization: "Bearer " + apiKey,
											Checksum: checksum
										},
										onUploadProgress: event => {
											if (typeof event !== "object" || typeof event.loaded !== "number") {
												return
											}

											let bytes = event.loaded

											if (lastBytes == 0) {
												lastBytes = event.loaded
											} else {
												bytes = Math.floor(event.loaded - lastBytes)
												lastBytes = event.loaded
											}

											globalThis.postMessage({
												type: "uploadProgress",
												data: {
													uuid,
													bytes: bytes
												}
											})
										}
									})
										.then(response => {
											if (response.status !== 200) {
												lastErr = new Error("Request status: " + response.status)

												setTimeout(req, UPLOAD_RETRY_TIMEOUT)

												return
											}

											if (!response.data.status) {
												return reject(response.data.message)
											}

											return resolve(response.data)
										})
										.catch(err => {
											lastErr = err

											setTimeout(req, UPLOAD_RETRY_TIMEOUT)
										})
								}

								req()
							})
							.catch(reject)
					})
					.catch(reject)
			})
			.catch(reject)
	})
}

const decryptFolderLinkKey = async (metadata: string, masterKeys: string[]): Promise<string> => {
	const cacheKey = "decryptFolderLinkKey:" + metadata

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	let link = ""

	for (let i = 0; i < masterKeys.length; i++) {
		try {
			const obj = await decryptMetadata(metadata, masterKeys[i])

			if (obj && typeof obj == "string") {
				if (obj.length >= 16) {
					link = obj

					break
				}
			}
		} catch (e) {
			continue
		}
	}

	if (typeof link == "string") {
		if (link.length > 0) {
			memoryCache.set(cacheKey, link)
		}
	}

	return link
}

export const decryptData = async (data: ArrayBuffer, key: string, version: number): Promise<Uint8Array> => {
	if (data.byteLength <= 0) {
		const result = new Uint8Array([])

		return transfer(result, [result.buffer])
	}

	if (version == 1) {
		//old and deprecated, no longer in use
		const sliced = convertArrayBufferToBinaryString(new Uint8Array(data.slice(0, 16)))

		if (sliced.indexOf("Salted") !== -1) {
			const result = convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(arrayBufferToBase64(data), key))

			return transfer(result, [result.buffer])
		} else if (sliced.indexOf("U2FsdGVk") !== -1) {
			const result = convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(convertArrayBufferToBinaryString(new Uint8Array(data)), key))

			return transfer(result, [result.buffer])
		} else {
			const iv = textEncoder.encode(key).slice(0, 16)
			const decrypted = await globalThis.crypto.subtle.decrypt(
				{
					name: "AES-CBC",
					iv
				},
				await globalThis.crypto.subtle.importKey("raw", textEncoder.encode(key), "AES-CBC", false, ["decrypt"]),
				data
			)
			const result = new Uint8Array(decrypted)

			return transfer(result, [result.buffer])
		}
	} else if (version == 2) {
		const iv = data.slice(0, 12)
		const encData = data.slice(12)
		const decrypted = await globalThis.crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv
			},
			await globalThis.crypto.subtle.importKey("raw", textEncoder.encode(key), "AES-GCM", false, ["decrypt"]),
			encData
		)
		const result = new Uint8Array(decrypted)

		return transfer(result, [result.buffer])
	} else {
		throw new Error("Invalid decrypt version: " + version)
	}
}

export const downloadAndDecryptChunk = (item: ItemProps, url: string): Promise<Uint8Array> => {
	return new Promise((resolve, reject) => {
		let lastBytes: number = 0
		const uuid: string = item.uuid
		let lastErr: Error
		let current = -1

		const req = () => {
			current += 1

			if (current >= MAX_DOWNLOAD_RETRIES) {
				return reject(lastErr)
			}

			lastBytes = 0

			const promise = axios({
				method: "GET",
				url,
				timeout: 3600000,
				responseType: "arraybuffer",
				onDownloadProgress: event => {
					if (typeof event !== "object" || typeof event.loaded !== "number") {
						return
					}

					let bytes = event.loaded

					if (lastBytes == 0) {
						lastBytes = event.loaded
					} else {
						bytes = Math.floor(event.loaded - lastBytes)
						lastBytes = event.loaded
					}

					globalThis.postMessage({
						type: "downloadProgress",
						data: {
							uuid,
							bytes: bytes
						}
					})
				}
			})

			promise
				.then(response => {
					if (response.status !== 200) {
						lastErr = new Error("Request status: " + response.status)

						setTimeout(req, DOWNLOAD_RETRY_TIMEOUT)

						return
					}

					if (
						typeof response == "undefined" ||
						typeof response.data == "undefined" ||
						typeof response.data !== "object" ||
						!(response.data instanceof ArrayBuffer)
					) {
						lastErr = new Error("Invalid download data received for UUID: " + uuid + ", URL: " + url)

						console.error(lastErr)

						setTimeout(req, DOWNLOAD_RETRY_TIMEOUT)

						return
					}

					decryptData(response.data, item.key, item.version)
						.then(result => resolve(transfer(result, [result.buffer])))
						.catch(reject)
				})
				.catch(err => {
					lastErr = err

					console.error(lastErr)
					console.error("Axios error")

					setTimeout(req, DOWNLOAD_RETRY_TIMEOUT)
				})
		}

		req()
	})
}

export const decryptFolderNameLink = async (metadata: string, linkKey: string): Promise<string> => {
	if (metadata.toLowerCase() == "default") {
		return "Default"
	}

	const cacheKey = "decryptFolderNameLink:" + metadata

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	let folderName = ""

	try {
		const obj = JSON.parse(await decryptMetadata(metadata, linkKey))

		if (obj && typeof obj == "object") {
			if (typeof obj.name == "string") {
				if (obj.name.length > 0) {
					folderName = obj.name
				}
			}
		}
	} catch (e) {
		console.error(e)
	}

	if (typeof folderName == "string") {
		if (folderName.length > 0) {
			memoryCache.set(cacheKey, folderName)
		}
	}

	return folderName
}

export const decryptFileMetadataLink = async (metadata: string, linkKey: string): Promise<any> => {
	const cacheKey = "decryptFileMetadataLink:" + metadata

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	let fileName = ""
	let fileSize = 0
	let fileMime = ""
	let fileKey = ""
	let fileLastModified = 0

	try {
		const obj = JSON.parse(await decryptMetadata(metadata, linkKey))

		if (obj && typeof obj == "object") {
			if (typeof obj.name == "string") {
				if (obj.name.length > 0) {
					fileName = obj.name
					fileSize = parseInt(obj.size)
					fileMime = obj.mime
					fileKey = obj.key
					fileLastModified = parseInt(obj.lastModified)
				}
			}
		}
	} catch (e) {
		console.error(e)
	}

	const obj = {
		name: fileName,
		size: fileSize,
		mime: fileMime,
		key: fileKey,
		lastModified: convertTimestampToMs(fileLastModified)
	}

	if (typeof obj.name == "string") {
		if (obj.name.length >= 1) {
			memoryCache.set(cacheKey, obj)
		}
	}

	return obj
}

export const convertHeic = async (buffer: Uint8Array, format: "JPEG" | "PNG"): Promise<Uint8Array> => {
	const arrayBuffer = await heicConvert({
		buffer,
		format
	})

	const result = new Uint8Array(arrayBuffer)

	return transfer(result, [result.buffer])
}

export const decryptChatMessageKey = async (metadata: string, privateKey: string): Promise<string> => {
	const cacheKey = "decryptChatMessageKey:" + metadata

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	try {
		const key = await decryptMetadataPrivateKey(metadata, privateKey)

		if (!key) {
			return ""
		}

		const parsed = JSON.parse(key)

		if (typeof parsed.key !== "string") {
			return ""
		}

		memoryCache.set(cacheKey, parsed.key)

		return parsed.key
	} catch (e) {
		console.error(e)

		return ""
	}
}

export const decryptChatMessage = async (message: string, metadata: string, privateKey: string): Promise<string> => {
	try {
		const keyDecrypted = await decryptChatMessageKey(metadata, privateKey)

		if (keyDecrypted.length === 0) {
			return ""
		}

		const messageDecrypted = await decryptMetadata(message, keyDecrypted)

		if (!messageDecrypted) {
			return ""
		}

		const parsedMessage = JSON.parse(messageDecrypted)

		if (typeof parsedMessage.message !== "string") {
			return ""
		}

		return parsedMessage.message
	} catch (e) {
		console.error(e)

		return ""
	}
}

export const encryptChatMessage = async (message: string, key: string): Promise<string> => {
	return await encryptMetadata(JSON.stringify({ message }), key)
}

export const decryptNoteKeyOwner = async (metadata: string, masterKeys: string[]): Promise<string> => {
	const cacheKey = "decryptNoteKeyOwner:" + metadata

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	let key = ""

	for (let i = 0; i < masterKeys.length; i++) {
		try {
			const obj = await decryptMetadata(metadata, masterKeys[i])

			if (obj && typeof obj.key === "string") {
				if (obj.key.length >= 16) {
					key = obj.key

					break
				}
			}
		} catch (e) {
			continue
		}
	}

	if (typeof key == "string") {
		if (key.length > 0) {
			memoryCache.set(cacheKey, key)
		}
	}

	return key
}

export const decryptNoteKeyParticipant = async (metadata: string, privateKey: string): Promise<string> => {
	const cacheKey = "decryptNoteKeyParticipant:" + metadata

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey)
	}

	try {
		const key = await decryptMetadataPrivateKey(metadata, privateKey)

		if (typeof key !== "string") {
			return ""
		}

		const parsed = JSON.parse(key)

		if (typeof parsed.key !== "string") {
			return ""
		}

		memoryCache.set(cacheKey, parsed.key)

		return parsed.key
	} catch (e) {
		console.error(e)

		return ""
	}
}

export const decryptNoteContent = async (content: string, key: string): Promise<string> => {
	try {
		const decrypted = await decryptMetadata(content, key)

		if (typeof decrypted !== "string") {
			return ""
		}

		const parsed = JSON.parse(decrypted)

		if (typeof parsed.content !== "string") {
			return ""
		}

		return parsed.content
	} catch (e) {
		console.error(e)

		return ""
	}
}

export const decryptNoteTitle = async (title: string, key: string): Promise<string> => {
	try {
		const decrypted = await decryptMetadata(title, key)

		if (typeof decrypted !== "string") {
			return ""
		}

		const parsed = JSON.parse(decrypted)

		if (typeof parsed.title !== "string") {
			return ""
		}

		return parsed.title
	} catch (e) {
		console.error(e)

		return ""
	}
}

export const decryptNotePreview = async (preview: string, key: string): Promise<string> => {
	try {
		const decrypted = await decryptMetadata(preview, key)

		if (typeof decrypted !== "string") {
			return ""
		}

		const parsed = JSON.parse(decrypted)

		if (typeof parsed.preview !== "string") {
			return ""
		}

		return parsed.preview
	} catch (e) {
		console.error(e)

		return ""
	}
}

export const encryptNoteContent = async (content: string, key: string): Promise<string> => {
	return await encryptMetadata(JSON.stringify({ content }), key)
}

export const encryptNoteTitle = async (title: string, key: string): Promise<string> => {
	return await encryptMetadata(JSON.stringify({ title }), key)
}

export const encryptNotePreview = async (preview: string, key: string): Promise<string> => {
	return await encryptMetadata(JSON.stringify({ preview }), key)
}

export const api = {
	apiRequest,
	deriveKeyFromPassword,
	generatePasswordAndMasterKeysBasedOnAuthVersion,
	hashPassword,
	hashFn,
	decryptMetadata,
	decryptFolderName,
	decryptFileMetadata,
	generateKeypair,
	encryptMetadata,
	importPrivateKey,
	decryptFolderNamePrivateKey,
	decryptFileMetadataPrivateKey,
	encryptData,
	encryptAndUploadFileChunk,
	encryptMetadataPublicKey,
	importPublicKey,
	decryptFolderLinkKey,
	decryptData,
	downloadAndDecryptChunk,
	decryptFolderNameLink,
	decryptFileMetadataLink,
	convertHeic,
	bufferToHash,
	decryptMetadataPrivateKey,
	decryptChatMessageKey,
	decryptChatMessage,
	encryptChatMessage,
	decryptNoteKeyOwner,
	decryptNoteKeyParticipant,
	encryptNoteContent,
	decryptNoteContent,
	decryptNotePreview,
	decryptNoteTitle,
	encryptNoteTitle,
	encryptNotePreview
}

expose(api)

export default {} as typeof Worker & { new (): Worker }
