import { apiRequest } from "../worker/worker.com"
import { decryptMetadata, generateKeypair, encryptMetadata } from "../worker/worker.com"
import db from "../db"

export const updateKeypair = async ({ publicKey, privateKey }: { publicKey: string; privateKey: string }): Promise<void> => {
	const [apiKey, masterKeys] = await Promise.all([db.get("apiKey"), db.get("masterKeys")])

	if (!Array.isArray(masterKeys)) {
		throw new Error("No master keys array found")
	}

	if (masterKeys.length === 0) {
		throw new Error("No master keys found")
	}

	const encryptedPrivateKey = await encryptMetadata(privateKey, masterKeys[masterKeys.length - 1])
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/keyPair/update",
		data: {
			publicKey,
			privateKey: encryptedPrivateKey
		},
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const setKeypair = async ({ publicKey, privateKey }: { publicKey: string; privateKey: string }): Promise<void> => {
	const [apiKey, masterKeys] = await Promise.all([db.get("apiKey"), db.get("masterKeys")])

	if (!Array.isArray(masterKeys)) {
		throw new Error("No master keys array found")
	}

	if (masterKeys.length === 0) {
		throw new Error("No master keys found")
	}

	const encryptedPrivateKey = await encryptMetadata(privateKey, masterKeys[masterKeys.length - 1])
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/keyPair/set",
		data: {
			publicKey,
			privateKey: encryptedPrivateKey
		},
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const updatePublicAndPrivateKey = async (): Promise<void> => {
	const [apiKey, masterKeys] = await Promise.all([db.get("apiKey"), db.get("masterKeys")])

	if (!Array.isArray(masterKeys)) {
		throw new Error("No master keys array found")
	}

	if (masterKeys.length === 0) {
		throw new Error("No master keys found")
	}

	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/keyPair/info",
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	if (response.data.publicKey.length > 16 && response.data.privateKey.length > 16) {
		let privateKey = ""

		for (let i = 0; i < masterKeys.length; i++) {
			try {
				let decrypted = await decryptMetadata(response.data.privateKey, masterKeys[i])

				if (typeof decrypted == "string") {
					if (decrypted.length > 16) {
						privateKey = decrypted
					}
				}
			} catch (e) {
				continue
			}
		}

		if (privateKey.length <= 16) {
			return
		}

		await db.set("publicKey", response.data.publicKey)
		await db.set("privateKey", privateKey)
		await updateKeypair({ publicKey: response.data.publicKey, privateKey })

		console.log("Keypair updated")
	} else {
		const generatedKeypair = await generateKeypair()
		const b64PubKey = generatedKeypair.publicKey
		const b64PrivKey = generatedKeypair.privateKey

		if (b64PubKey.length <= 16 || b64PrivKey.length <= 16) {
			throw new Error("Key lengths invalid")
		}

		await setKeypair({ publicKey: b64PubKey, privateKey: b64PrivKey })
		await db.set("publicKey", b64PubKey)
		await db.set("privateKey", b64PrivKey)

		console.log("Keypair updated")
	}
}

export const updateKeys = async (): Promise<void> => {
	const [apiKey, masterKeys] = await Promise.all([db.get("apiKey"), db.get("masterKeys")])

	if (!Array.isArray(masterKeys)) {
		throw new Error("No master keys array found")
	}

	if (masterKeys.length === 0) {
		throw new Error("No master keys found")
	}

	const encryptedMasterKeys = await encryptMetadata(masterKeys.join("|"), masterKeys[masterKeys.length - 1])
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/masterKeys",
		data: {
			masterKeys: encryptedMasterKeys
		},
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	let newMasterKeys: any = ""

	for (let i = 0; i < masterKeys.length; i++) {
		try {
			let decrypted = await decryptMetadata(response.data.keys, masterKeys[i])

			if (typeof decrypted == "string") {
				if (decrypted.length > 16) {
					newMasterKeys = decrypted
				}
			}
		} catch (e) {
			continue
		}
	}

	if (newMasterKeys.length > 16) {
		newMasterKeys = newMasterKeys.split("|")

		await db.set("masterKeys", newMasterKeys)

		console.log("Master keys updated")
	}

	await updatePublicAndPrivateKey()
}
