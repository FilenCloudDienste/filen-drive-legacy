import { expose, transfer } from "comlink"
import axios from "axios"
import memoryCache from "../memoryCache"
import { arrayBufferToHex, base64ToArrayBuffer, arrayBufferToBase64, generateRandomString, convertTimestampToMs, readChunk, mergeUInt8Arrays, getAPIServer, convertWordArrayToArrayBuffer, convertArrayBufferToBinaryString } from "../helpers"
// @ts-ignore
import CryptoApi from "crypto-api-v1"
import CryptoJS from "crypto-js"
import type { ItemProps } from "../../types"
import { MAX_DOWNLOAD_RETRIES, DOWNLOAD_RETRY_TIMEOUT } from "../constants"
import axiosRetry from "axios-retry"
import heicConvert from "heic-convert"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

axiosRetry(axios, {
    retries: MAX_DOWNLOAD_RETRIES,
    retryDelay: (retryCount) => {
      	return retryCount * DOWNLOAD_RETRY_TIMEOUT
    },
    retryCondition: (error) => {
      	return error?.response?.status !== 200
    }
})

const apiRequest = async (method: string = "POST", endpoint: string, data: any): Promise<{ status: boolean, message: string, [key: string]: any }> => {
	const response = method.toUpperCase() == "POST" ? await axios.post(getAPIServer() + endpoint, data) : await axios.get(getAPIServer() + endpoint)

	if(response.status !== 200){
		throw new Error("Response status " + response.status)
	}

	return response.data
}

const generateKeypair = async (): Promise<{ publicKey: string, privateKey: string }> => {
	const keyPair = await globalThis.crypto.subtle.generateKey({
		name: "RSA-OAEP",
		modulusLength: 4096,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: "SHA-512"
	}, true, ["encrypt", "decrypt"])

	const pubKey = await globalThis.crypto.subtle.exportKey("spki", keyPair.publicKey)
	const b64PubKey = arrayBufferToBase64(pubKey)
	const privKey = await globalThis.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
	const b64PrivKey = arrayBufferToBase64(privKey)

	if(b64PubKey.length > 16 && b64PrivKey.length > 16){
		return { publicKey: b64PubKey, privateKey: b64PrivKey }
	}
	
	throw new Error("Key lengths invalid")
}

const deriveKeyFromPassword = async (password: string, salt: string, iterations: number, hash: string, bitLength: number, returnHex: boolean): Promise<string | ArrayBuffer> => {
	const cacheKey = "deriveKeyFromPassword:" + password + ":" + salt + ":" + iterations + ":" + hash + ":" + bitLength + ":" + returnHex.toString()

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	const bits = await globalThis.crypto.subtle.deriveBits({
		name: "PBKDF2",
		salt: textEncoder.encode(salt),
		iterations: iterations,
		hash: {
			name: hash
		}
	}, await globalThis.crypto.subtle.importKey("raw", textEncoder.encode(password), {
		name: "PBKDF2"
	}, false, ["deriveBits"]), bitLength)

	const key = returnHex ? arrayBufferToHex(bits) : bits

	memoryCache.set(cacheKey, key)

	return key
}

const hashPassword = async (password: string): Promise<string> => { //old and deprecated, no longer in use
    const hash = CryptoApi.hash("sha512", CryptoApi.hash("sha384", CryptoApi.hash("sha256", CryptoApi.hash("sha1", password)))) + CryptoApi.hash("sha512", CryptoApi.hash("md5", CryptoApi.hash("md4", CryptoApi.hash("md2", (password)))))

	return hash
}

const hashFn = async (str: string): Promise<string> => {
	const hash = CryptoApi.hash("sha1", CryptoApi.hash("sha512", str))

	return hash
}

const generatePasswordAndMasterKeysBasedOnAuthVersion = async (rawPassword: string, authVersion: number, salt: string): Promise<{ derivedMasterKeys: string, derivedPassword: string }> => {
	let derivedPassword: any = ""
	let derivedMasterKeys: any = undefined

	if(authVersion == 1){
		derivedPassword = await hashPassword(rawPassword)
		derivedMasterKeys = await hashFn(rawPassword)
	}
	else if(authVersion == 2){
		const derivedKey = await deriveKeyFromPassword(rawPassword, salt, 200000, "SHA-512", 512, true) as string

		derivedMasterKeys = derivedKey.substring(0, (derivedKey.length / 2))
		derivedPassword = derivedKey.substring((derivedKey.length / 2), derivedKey.length)
		derivedPassword = CryptoJS.SHA512(derivedPassword).toString()
	}
	else{
		throw new Error("Invalid auth version: " + authVersion)
	}

	return { derivedMasterKeys, derivedPassword }
}

const decryptMetadata = async (data: string, key: string): Promise<any> => {
	const cacheKey: string = "decryptMetadata:" + data.toString() + ":" + key

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	const sliced: string = data.slice(0, 8)

	if(sliced == "U2FsdGVk"){ //old deprecated
		try{
			const decrypted = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8)

			memoryCache.set(cacheKey, decrypted)

			return decrypted
		}
		catch(e){
			return ""
		}
	}
	else{
		const version: string = data.slice(0, 3)

		if(version == "002"){
			try{
				key = await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false) as string //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

				const iv = textEncoder.encode(data.slice(3, 15))
				const encrypted = base64ToArrayBuffer(data.slice(15))

				const decrypted = await globalThis.crypto.subtle.decrypt({
					name: "AES-GCM",
					iv
				}, await globalThis.crypto.subtle.importKey("raw", key as any, "AES-GCM", false, ["decrypt"]), encrypted)

				const result = textDecoder.decode(new Uint8Array(decrypted))

				memoryCache.set(cacheKey, result)

				return result
			}
			catch(e){
				return ""
			}
		}
		else{
			return ""
		}
	}
}

const decryptFolderName = async (metadata: string, masterKeys: string[]): Promise<string> => {
	if(metadata.toLowerCase() == "default"){
		return "Default"
	}

	const cacheKey: string = "decryptFolderName:" + metadata.toString()

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	let folderName: string = ""

	for(let i = 0; i < masterKeys.length; i++){
		try{
			const obj = JSON.parse(await decryptMetadata(metadata, masterKeys[i]))

			if(obj && typeof obj == "object"){
				if(typeof obj.name == "string"){
					if(obj.name.length > 0){
						folderName = obj.name

						break
					}
				}
			}
		}
		catch(e){
			continue
		}
	}

	if(typeof folderName == "string"){
		if(folderName.length > 0){
			memoryCache.set(cacheKey, folderName)
		}
	}

	return folderName
}

const decryptFileMetadata = async (metadata: string, masterKeys: string[]): Promise<{ name: string, size: number, mime: string, key: string, lastModified: number }> => {
	const cacheKey: string = "decryptFileMetadata:" + metadata

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	let fileName: string = ""
	let fileSize: number = 0
	let fileMime: string = ""
	let fileKey: string = ""
	let fileLastModified: number = 0

	for(let i = 0; i < masterKeys.length; i++){
		try{
			const obj = JSON.parse(await decryptMetadata(metadata, masterKeys[i]))

			if(obj && typeof obj == "object"){
				if(typeof obj.name == "string"){
					if(obj.name.length > 0){
						fileName = obj.name
						fileSize = parseInt(obj.size)
						fileMime = obj.mime
						fileKey = obj.key
						fileLastModified = parseInt(obj.lastModified)

						break
					}
				}
			}
		}
		catch(e){
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

	if(typeof obj.name == "string"){
		if(obj.name.length > 0){
			memoryCache.set(cacheKey, obj)
		}
	}

	return obj
}

const encryptMetadata = async (data: string, key: any): Promise<string> => {
	key = await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false) as string //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

	const iv: string = generateRandomString(12)
	const string: Uint8Array = textEncoder.encode(data)

	const encrypted: ArrayBuffer = await globalThis.crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: textEncoder.encode(iv)
	}, await globalThis.crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]), string)

	return "002" + iv + arrayBufferToBase64(new Uint8Array(encrypted))
}

const encryptMetadataPublicKey = async (data: string, publicKey: string): Promise<string> => {
	const pubKey = await importPublicKey(publicKey, ["encrypt"])
	const encrypted = await globalThis.crypto.subtle.encrypt({
		name: "RSA-OAEP"
	}, pubKey, textEncoder.encode(data))

	return arrayBufferToBase64(encrypted)
}

const importPublicKey = async (publicKey: string, mode: KeyUsage[] = ["encrypt"]): Promise<CryptoKey> => {
	const cacheKey = "importPrivateKey:" + mode.join(":") + ":" + publicKey

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	const imported = await globalThis.crypto.subtle.importKey("spki", base64ToArrayBuffer(publicKey), {
		name: "RSA-OAEP",
		hash: "SHA-512"
	}, true, mode)

	memoryCache.set(cacheKey, imported)

	return imported
}

const importPrivateKey = async (privateKey: string, mode: KeyUsage[] = ["decrypt"]): Promise<CryptoKey> => {
	const cacheKey = "importPrivateKey:" + mode.join(":") + ":" + privateKey

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	const imported = await globalThis.crypto.subtle.importKey("pkcs8", base64ToArrayBuffer(privateKey), {
		name: "RSA-OAEP",
		hash: "SHA-512"
	}, true, mode)

	memoryCache.set(cacheKey, imported)

	return imported
}

const decryptFolderNamePrivateKey = async (data: string, privateKey: string): Promise<string> => {
	try{
		const cacheKey: string = "decryptFolderNamePrivateKey:" + data

		if(memoryCache.has(cacheKey)){
			return memoryCache.get(cacheKey)
		}

		const importedKey = await importPrivateKey(privateKey, ["decrypt"])
		const decrypted = await globalThis.crypto.subtle.decrypt({
			name: "RSA-OAEP"
	  	}, importedKey, base64ToArrayBuffer(data))
		const metadata = JSON.parse(textDecoder.decode(decrypted))

		let folderName: string = ""

		if(typeof metadata.name == "string"){
			if(metadata.name.length > 0){
				folderName = metadata.name
			}
		}

		if(folderName.length > 0){
			memoryCache.set(cacheKey, folderName)
		}
		
		return folderName
	}
	catch(e){
		return ""
	}
}

const decryptFileMetadataPrivateKey = async (data: string, privateKey: string): Promise<{ name: string, size: number, mime: string, key: string, lastModified: number }> => {
	try{
		const cacheKey: string = "decryptFileMetadataPrivateKey:" + data

		if(memoryCache.has(cacheKey)){
			return memoryCache.get(cacheKey)
		}

		const importedKey = await importPrivateKey(privateKey, ["decrypt"])
		const decrypted = await globalThis.crypto.subtle.decrypt({
			name: "RSA-OAEP"
	  	}, importedKey, base64ToArrayBuffer(data))
		const metadata = JSON.parse(textDecoder.decode(decrypted))

		let fileName: string = ""
		let fileSize: number = 0
		let fileMime: string = ""
		let fileKey: string = ""
		let fileLastModified: number = 0

		if(typeof metadata.name == "string"){
			if(metadata.name.length > 0){
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

		if(typeof obj.name == "string"){
			if(obj.name.length > 0){
				memoryCache.set(cacheKey, obj)
			}
		}

		return obj
	}
	catch(e){
		return {
			name: "",
			size: 0,
			mime: "",
			key: "",
			lastModified: 0
		}
	}
}

const encryptData = async (data: ArrayBuffer, key: string): Promise<Uint8Array | string> => {
	if(typeof data == "undefined"){
		return ""
	}

	if(typeof data.byteLength == "undefined"){
		return ""
	}

	if(data.byteLength == 0){
		return ""
	}

	const iv = generateRandomString(12)
	const encrypted = await globalThis.crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: textEncoder.encode(iv)
	}, await globalThis.crypto.subtle.importKey("raw", textEncoder.encode(key), "AES-GCM", false, ["encrypt"]), data)
	const result = mergeUInt8Arrays(textEncoder.encode(iv), new Uint8Array(encrypted))

	return transfer(result, [result.buffer])
}

const encryptAndUploadFileChunk = async (file: File, key: string, url: string, uuid: string, chunkIndex: number, chunkSize: number): Promise<any> => {
	let lastBytes = 0

	try{
		const chunk = await readChunk(file, chunkIndex, chunkSize)
		const encryptedChunk = await encryptData(chunk, key)

		const result = await axios({
			method: "post",
			url,
			data: new Blob([encryptedChunk]),
			timeout: 3600000,
			onUploadProgress: (event) => {
				if(typeof event.loaded !== "number"){
					return
				}

				let bytes = event.loaded

                if(lastBytes == 0){
                    lastBytes = event.loaded
                }
                else{
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

		if(result.status !== 200){
			throw new Error("Request status: " + result.status)
		}

		if(!result.data.status){
			throw new Error(result.data.message)
		}

		return result.data
	}
	catch(e: any){
		throw e
	}
}

const decryptFolderLinkKey = async (metadata: string, masterKeys: string[]): Promise<string> => {
    const cacheKey = "decryptFolderLinkKey:" + metadata

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	let link = ""

	for(let i = 0; i < masterKeys.length; i++){
		try{
			const obj = await decryptMetadata(metadata, masterKeys[i])

			if(obj && typeof obj == "string"){
				if(obj.length >= 16){
					link = obj

					break
				}
			}
		}
		catch(e){
			continue
		}
	}

	if(typeof link == "string"){
		if(link.length > 0){
			memoryCache.set(cacheKey, link)
		}
	}

	return link
}

export const decryptData = async (data: ArrayBuffer, key: string, version: number): Promise<Uint8Array> => {
	if(version == 1){
		const sliced = convertArrayBufferToBinaryString(new Uint8Array(data.slice(0, 16)))

		if(sliced.indexOf("Salted") !== -1){
			const result = convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(arrayBufferToBase64(data), key))

			return transfer(result, [result.buffer])
		}
		else if(sliced.indexOf("U2FsdGVk") !== -1){
			const result = convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(convertArrayBufferToBinaryString(new Uint8Array(data)), key))

			return transfer(result, [result.buffer])
		}
		else{
			const iv = textEncoder.encode(key).slice(0, 16)
			const decrypted = await globalThis.crypto.subtle.decrypt({
				name: "AES-CBC",
				iv
			}, await globalThis.crypto.subtle.importKey("raw", textEncoder.encode(key), "AES-CBC", false, ["decrypt"]), data)
			const result = new Uint8Array(decrypted)

			return transfer(result, [result.buffer])
		}
	}
	else if(version == 2){
		const iv = data.slice(0, 12)
		const encData = data.slice(12)
		const decrypted = await globalThis.crypto.subtle.decrypt({
			name: "AES-GCM",
			iv,
		}, await globalThis.crypto.subtle.importKey("raw", textEncoder.encode(key), "AES-GCM", false, ["decrypt"]), encData)
		const result = new Uint8Array(decrypted)

		return transfer(result, [result.buffer])
	}
	else{
		throw new Error("Invalid decrypt version: " + version)
	}
}

export const downloadAndDecryptChunk = async (item: ItemProps, url: string): Promise<Uint8Array> => {
	let lastBytes: number = 0
	const uuid: string = item.uuid

	try{
		const response = await axios.get(url, {
			responseType: "arraybuffer",
			timeout: 3600000,
			onDownloadProgress: (event) => {
				if(typeof event.loaded !== "number"){
					return
				}

				let bytes = event.loaded

                if(lastBytes == 0){
                    lastBytes = event.loaded
                }
                else{
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

		if(response.status !== 200){
			throw new Error("Response status: " + response.status + ", URL: " + url)
		}

		if(typeof response.data !== "object"){
			throw new Error("Invalid download data received for UUID: " + uuid + ", URL: " + url)
		}

		const result = await decryptData(response.data, item.key, item.version)

		return transfer(result, [result.buffer])
	}
	catch(e: any){
		throw e
	}
}

export const decryptFolderNameLink = async (metadata: string, linkKey: string): Promise<string> => {
	if(metadata.toLowerCase() == "default"){
		return "Default"
	}

	const cacheKey = "decryptFolderNameLink:" + metadata

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	let folderName = ""

	try{
		const obj = JSON.parse(await decryptMetadata(metadata, linkKey))

		if(obj && typeof obj == "object"){
			if(typeof obj.name == "string"){
				if(obj.name.length > 0){
					folderName = obj.name
				}
			}
		}
	}
	catch(e){
		console.error(e)
	}

	if(typeof folderName == "string"){
		if(folderName.length > 0){
			memoryCache.set(cacheKey, folderName)
		}
	}

	return folderName
}

export const decryptFileMetadataLink = async (metadata: string, linkKey: string): Promise<any> => {
	const cacheKey = "decryptFileMetadataLink:" + metadata

	if(memoryCache.has(cacheKey)){
		return memoryCache.get(cacheKey)
	}

	let fileName = ""
	let fileSize = 0
	let fileMime = ""
	let fileKey = ""
	let fileLastModified = 0

	try{
		const obj = JSON.parse(await decryptMetadata(metadata, linkKey))

		if(obj && typeof obj == "object"){
			if(typeof obj.name == "string"){
				if(obj.name.length > 0){
					fileName = obj.name
					fileSize = parseInt(obj.size)
					fileMime = obj.mime
					fileKey = obj.key
					fileLastModified = parseInt(obj.lastModified)
				}
			}
		}
	}
	catch(e){
		console.error(e)
	}

	const obj = {
		name: fileName,
		size: fileSize,
		mime: fileMime,
		key: fileKey,
		lastModified: convertTimestampToMs(fileLastModified)
	}

	if(typeof obj.name == "string"){
		if(obj.name.length >= 1){
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
	convertHeic
}

expose(api)

export default { } as typeof Worker & { new (): Worker }