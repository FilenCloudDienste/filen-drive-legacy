import {
	apiRequest,
	encryptMetadataPublicKey,
	decryptFileMetadata,
	decryptFolderName,
	decryptFolderLinkKey,
	encryptMetadata,
	hashFn,
	deriveKeyFromPassword
} from "../worker/worker.com"
import db from "../db"
import striptags from "striptags"
import { Semaphore, generateRandomString, arrayBufferToBase64, SemaphoreProps } from "../helpers"
import {
	ItemProps,
	UserInfo,
	FolderColors,
	UserGetSettings,
	UserGetAccount,
	UserEvent,
	LinkGetInfo,
	LinkHasPassword,
	LinkDirInfo,
	LinkDirContent,
	PaymentMethods
} from "../../types"
import eventListener from "../eventListener"
import { getDirectoryTree } from "../services/items"
import { v4 as uuidv4 } from "uuid"
import { FileVersions, ICFG } from "../../types"
import axios from "axios"
import { bufferToHash } from "../worker/worker.com"

const createFolderSemaphore = new Semaphore(1)
const shareItemsSemaphore = new Semaphore(10)
const linkItemsSemaphore = new Semaphore(10)
const fetchFolderSizeSemaphores: Record<string, SemaphoreProps> = {}

export const getCfg = async (): Promise<ICFG> => {
	const response = await axios.get("https://cdn.filen.io/cfg.json?noCache=" + Date.now())

	if (response.status !== 200) {
		throw new Error("Could not load CFG from CDN")
	}

	return response.data
}

export const authInfo = async (email: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/auth/info",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const login = async ({
	email,
	password,
	twoFactorCode,
	authVersion
}: {
	email: string
	password: string
	twoFactorCode: string | number
	authVersion: number
}): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/login",
		data: {
			email,
			password,
			twoFactorCode,
			authVersion
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const userInfo = async (apiKey: string | undefined = undefined): Promise<UserInfo> => {
	if (typeof apiKey == "undefined") {
		apiKey = await db.get("apiKey")
	}

	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/info",
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const baseFolder = async (apiKey: string | undefined = undefined): Promise<string> => {
	if (typeof apiKey == "undefined") {
		apiKey = await db.get("apiKey")
	}

	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/baseFolder",
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.uuid
}

export const folderContent = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/content",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const folderContentFoldersOnly = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/content",
		data: {
			uuid,
			foldersOnly: true
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const sharedInContent = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/shared/in",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const sharedOutContent = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/shared/out",
		data: {
			uuid,
			receiverId: window.currentReceiverId
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const recentContent = async (): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/content",
		data: {
			uuid: "recents"
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.uploads
}

export const markUploadAsDone = (data: {
	uuid: string
	name: string
	nameHashed: string
	size: string
	chunks: number
	mime: string
	rm: string
	metadata: string
	version: number
	uploadKey: string
}): Promise<{ chunks: number; size: number }> => {
	return new Promise<{ chunks: number; size: number }>((resolve, reject) => {
		let tries = 0
		let lastErr: Error

		const req = async () => {
			if (tries >= 10) {
				reject(lastErr)

				return
			}

			tries += 1

			try {
				const response = await apiRequest({
					method: "POST",
					endpoint: "/v3/upload/done",
					data
				})

				if (!response.status) {
					lastErr = new Error(response.message)

					setTimeout(req, 3000)

					return
				}

				resolve(response.data)
			} catch (e: any) {
				lastErr = e

				setTimeout(req, 3000)
			}
		}

		req()
	})
}

export const getFolderContents = async ({
	uuid,
	type = "normal",
	linkUUID = undefined,
	linkHasPassword = undefined,
	linkPassword = undefined,
	linkSalt = undefined
}: {
	uuid: string
	type?: "normal" | "shared" | "linked"
	linkUUID?: string | undefined
	linkHasPassword?: boolean | undefined
	linkPassword?: string | undefined
	linkSalt?: string | undefined
}): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: type == "shared" ? "/v3/dir/download/shared" : type == "linked" ? "/v3/dir/download/link" : "/v3/dir/download",
		data:
			type == "shared"
				? {
						uuid
				  }
				: type == "linked"
				? {
						uuid: linkUUID,
						parent: uuid,
						password:
							linkHasPassword && linkSalt && linkPassword
								? linkSalt.length == 32
									? ((await deriveKeyFromPassword(linkPassword, linkSalt, 200000, "SHA-512", 512, true)) as string)
									: await hashFn(linkPassword.length == 0 ? "empty" : linkPassword)
								: await hashFn("empty")
				  }
				: {
						uuid
				  }
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const isSharingFolder = async (uuid: string): Promise<{ sharing: boolean; users: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/shared",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		sharing: response.data.sharing,
		users: response.data.users
	}
}

export const isPublicLinkingFolder = async (uuid: string): Promise<{ linking: boolean; links: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/linked",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		linking: response.data.link,
		links: response.data.links
	}
}

export const addItemToPublicLink = async (data: {
	uuid: string
	parent: string
	linkUUID: string
	type: string
	metadata: string
	key: string
	expiration: string
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/link/add",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const shareItem = async (data: { uuid: string; parent: string; email: string; type: string; metadata: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/share",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const isSharingItem = async (uuid: string): Promise<{ sharing: boolean; users: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		sharing: response.data.sharing,
		users: response.data.users
	}
}

export const isItemInPublicLink = async (uuid: string): Promise<{ linking: boolean; links: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/linked",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		linking: response.data.link,
		links: response.data.links
	}
}

export const renameItemInPublicLink = async (data: { uuid: string; linkUUID: string; metadata: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/linked/rename",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const renameSharedItem = async (data: { uuid: string; receiverId: number; metadata: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared/rename",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const checkIfItemParentIsShared = ({ type, parent, metaData }: { type: string; parent: string; metaData: any }): Promise<any> => {
	return new Promise((resolve, reject) => {
		db.get("apiKey")
			.then(apiKey => {
				db.get("masterKeys")
					.then(masterKeys => {
						let shareCheckDone = false
						let linkCheckDone = false
						let resolved = false
						let doneInterval: any = undefined

						const done = () => {
							if (shareCheckDone && linkCheckDone) {
								clearInterval(doneInterval)

								if (!resolved) {
									resolved = true

									resolve(true)
								}

								return true
							}

							return false
						}

						doneInterval = setInterval(done, 100)

						isSharingFolder(parent)
							.then((data: any) => {
								if (!data.sharing) {
									shareCheckDone = true

									return done()
								}

								const totalUsers = data.users.length

								if (type == "file") {
									let doneUsers = 0

									const doneSharing = () => {
										doneUsers += 1

										if (doneUsers >= totalUsers) {
											shareCheckDone = true

											done()
										}

										return true
									}

									for (let i = 0; i < totalUsers; i++) {
										const user = data.users[i]
										const itemMetadata = JSON.stringify({
											name: metaData.name,
											size: metaData.size,
											mime: metaData.mime,
											key: metaData.key,
											lastModified: metaData.lastModified
										})

										encryptMetadataPublicKey(itemMetadata, user.publicKey)
											.then(encrypted => {
												shareItem({
													uuid: metaData.uuid,
													parent,
													email: user.email,
													type,
													metadata: encrypted
												})
													.then(() => {
														return doneSharing()
													})
													.catch(err => {
														console.log(err)

														return doneSharing()
													})
											})
											.catch(err => {
												console.log(err)

												return doneSharing()
											})
									}
								} else {
									getFolderContents({ uuid: metaData.uuid })
										.then(async (contents: any) => {
											const itemsToShare = []

											itemsToShare.push({
												uuid: metaData.uuid,
												parent,
												metadata: metaData.name,
												type: "folder"
											})

											const files = contents.files
											const folders = contents.folders

											for (let i = 0; i < files.length; i++) {
												const decrypted = await decryptFileMetadata(files[i].metadata, masterKeys)

												if (typeof decrypted == "object") {
													if (typeof decrypted.name == "string") {
														decrypted.name = striptags(decrypted.name)

														if (decrypted.name.length > 0) {
															itemsToShare.push({
																uuid: files[i].uuid,
																parent: files[i].parent,
																metadata: {
																	name: decrypted.name,
																	size: decrypted.size,
																	mime: striptags(decrypted.mime),
																	key: decrypted.key,
																	lastModified: decrypted.lastModified
																},
																type: "file"
															})
														}
													}
												}
											}

											for (let i = 0; i < folders.length; i++) {
												const decrypted = striptags(await decryptFolderName(folders[i].name, masterKeys))

												if (typeof decrypted == "string") {
													if (decrypted.length > 0) {
														if (folders[i].uuid !== metaData.uuid && folders[i].parent !== "base") {
															itemsToShare.push({
																uuid: folders[i].uuid,
																parent: i == 0 ? "none" : folders[i].parent,
																metadata: decrypted,
																type: "folder"
															})
														}
													}
												}
											}

											let itemsShared = 0

											const doneSharingItem = () => {
												itemsShared += 1

												if (itemsShared >= itemsToShare.length * totalUsers) {
													shareCheckDone = true

													done()
												}

												return true
											}

											for (let i = 0; i < itemsToShare.length; i++) {
												const itemToShare = itemsToShare[i]

												for (let x = 0; x < totalUsers; x++) {
													const user = data.users[x]
													let itemMetadata = ""

													if (itemToShare.type == "file") {
														itemMetadata = JSON.stringify({
															name: itemToShare.metadata.name,
															size: itemToShare.metadata.size,
															mime: itemToShare.metadata.mime,
															key: itemToShare.metadata.key,
															lastModified: itemToShare.metadata.lastModified
														})
													} else {
														itemMetadata = JSON.stringify({
															name: itemToShare.metadata
														})
													}

													encryptMetadataPublicKey(itemMetadata, user.publicKey)
														.then(encrypted => {
															shareItem({
																uuid: itemToShare.uuid,
																parent: itemToShare.parent,
																email: user.email,
																type: itemToShare.type,
																metadata: encrypted
															})
																.then(() => {
																	return doneSharingItem()
																})
																.catch(err => {
																	console.log(err)

																	return doneSharingItem()
																})
														})
														.catch(err => {
															console.log(err)

															return doneSharingItem()
														})
												}
											}
										})
										.catch(err => {
											console.log(err)

											shareCheckDone = true

											return done()
										})
								}
							})
							.catch(err => {
								console.log(err)

								shareCheckDone = true

								return done()
							})

						isPublicLinkingFolder(parent)
							.then(async (data: any) => {
								if (!data.linking) {
									linkCheckDone = true

									return done()
								}

								const totalLinks = data.links.length

								if (type == "file") {
									let linksDone = 0

									const doneLinking = () => {
										linksDone += 1

										if (linksDone >= totalLinks) {
											linkCheckDone = true

											done()
										}

										return true
									}

									for (let i = 0; i < totalLinks; i++) {
										const link = data.links[i]

										try {
											var key: any = await decryptFolderLinkKey(link.linkKey, masterKeys)
										} catch (e) {
											//console.log(e)
										}

										if (typeof key == "string") {
											if (key.length > 0) {
												try {
													var encrypted: any = await encryptMetadata(
														JSON.stringify({
															name: metaData.name,
															size: metaData.size,
															mime: metaData.mime,
															key: metaData.key,
															lastModified: metaData.lastModified
														}),
														key
													)
												} catch (e) {
													//console.log(e)
												}

												if (typeof encrypted == "string") {
													if (encrypted.length > 0) {
														addItemToPublicLink({
															uuid: metaData.uuid,
															parent,
															linkUUID: link.linkUUID,
															type,
															metadata: encrypted,
															key: link.linkKey,
															expiration: "never"
														})
															.then(() => {
																return doneLinking()
															})
															.catch(err => {
																console.log(err)

																return doneLinking()
															})
													} else {
														doneLinking()
													}
												} else {
													doneLinking()
												}
											} else {
												doneLinking()
											}
										} else {
											doneLinking()
										}
									}
								} else {
									getFolderContents({ uuid: metaData.uuid })
										.then(async (contents: any) => {
											const itemsToLink = []

											itemsToLink.push({
												uuid: metaData.uuid,
												parent,
												metadata: metaData.name,
												type: "folder"
											})

											const files = contents.files
											const folders = contents.folders

											for (let i = 0; i < files.length; i++) {
												const decrypted = await decryptFileMetadata(files[i].metadata, masterKeys)

												if (typeof decrypted == "object") {
													if (typeof decrypted.name == "string") {
														decrypted.name = striptags(decrypted.name)

														if (decrypted.name.length > 0) {
															itemsToLink.push({
																uuid: files[i].uuid,
																parent: files[i].parent,
																metadata: {
																	name: decrypted.name,
																	size: decrypted.size,
																	mime: striptags(decrypted.mime),
																	key: decrypted.key,
																	lastModified: decrypted.lastModified
																},
																type: "file"
															})
														}
													}
												}
											}

											for (let i = 0; i < folders.length; i++) {
												try {
													var decrypted: any = striptags(await decryptFolderName(folders[i].name, masterKeys))
												} catch (e) {
													//console.log(e)
												}

												if (typeof decrypted == "string") {
													if (decrypted.length > 0) {
														if (folders[i].uuid !== metaData.uuid && folders[i].parent !== "base") {
															itemsToLink.push({
																uuid: folders[i].uuid,
																parent: i == 0 ? "none" : folders[i].parent,
																metadata: decrypted,
																type: "folder"
															})
														}
													}
												}
											}

											let itemsLinked = 0

											const itemLinked = () => {
												itemsLinked += 1

												if (itemsLinked >= itemsToLink.length * totalLinks) {
													linkCheckDone = true

													done()
												}

												return true
											}

											for (let i = 0; i < itemsToLink.length; i++) {
												const itemToLink = itemsToLink[i]

												for (let x = 0; x < totalLinks; x++) {
													const link = data.links[x]

													try {
														var key: any = await decryptFolderLinkKey(link.linkKey, masterKeys)
													} catch (e) {
														//console.log(e)
													}

													if (typeof key == "string") {
														if (key.length > 0) {
															let itemMetadata = ""

															if (itemToLink.type == "file") {
																itemMetadata = JSON.stringify({
																	name: itemToLink.metadata.name,
																	size: itemToLink.metadata.size,
																	mime: itemToLink.metadata.mime,
																	key: itemToLink.metadata.key,
																	lastModified: itemToLink.metadata.lastModified
																})
															} else {
																itemMetadata = JSON.stringify({
																	name: itemToLink.metadata
																})
															}

															try {
																var encrypted: any = await encryptMetadata(itemMetadata, key)
															} catch (e) {
																//console.log(e)
															}

															if (typeof encrypted == "string") {
																if (encrypted.length > 0) {
																	addItemToPublicLink({
																		uuid: itemToLink.uuid,
																		parent: itemToLink.parent,
																		linkUUID: link.linkUUID,
																		type: itemToLink.type,
																		metadata: encrypted,
																		key: link.linkKey,
																		expiration: "never"
																	})
																		.then(() => {
																			return itemLinked()
																		})
																		.catch(err => {
																			console.log(err)

																			return itemLinked()
																		})
																} else {
																	itemLinked()
																}
															} else {
																itemLinked()
															}
														} else {
															itemLinked()
														}
													} else {
														itemLinked()
													}
												}
											}
										})
										.catch(err => {
											console.log(err)

											linkCheckDone = true

											return done()
										})
								}
							})
							.catch(err => {
								console.log(err)

								linkCheckDone = true

								return done()
							})
					})
					.catch(reject)
			})
			.catch(reject)
	})
}

export const checkIfItemIsSharedForRename = ({ type, uuid, metaData }: { type: string; uuid: string; metaData: any }): Promise<any> => {
	return new Promise((resolve, reject) => {
		db.get("apiKey")
			.then(apiKey => {
				db.get("masterKeys")
					.then(masterKeys => {
						let shareCheckDone = false
						let linkCheckDone = false
						let resolved = false
						let doneInterval: any = undefined

						const done = () => {
							if (shareCheckDone && linkCheckDone) {
								clearInterval(doneInterval)

								if (!resolved) {
									resolved = true

									resolve(true)
								}

								return true
							}

							return false
						}

						doneInterval = setInterval(done, 100)

						isSharingItem(uuid)
							.then((data: any) => {
								if (!data.sharing) {
									shareCheckDone = true

									return done()
								}

								const totalUsers = data.users.length
								let doneUsers = 0

								const doneSharing = () => {
									doneUsers += 1

									if (doneUsers >= totalUsers) {
										shareCheckDone = true

										done()
									}

									return true
								}

								for (let i = 0; i < totalUsers; i++) {
									const user = data.users[i]
									let itemMetadata = ""

									if (type == "file") {
										itemMetadata = JSON.stringify({
											name: metaData.name,
											size: metaData.size,
											mime: metaData.mime,
											key: metaData.key,
											lastModified: metaData.lastModified
										})
									} else {
										itemMetadata = JSON.stringify({
											name: metaData.name
										})
									}

									encryptMetadataPublicKey(itemMetadata, user.publicKey)
										.then(encrypted => {
											renameSharedItem({
												uuid,
												receiverId: user.id,
												metadata: encrypted
											})
												.then(() => {
													return doneSharing()
												})
												.catch(err => {
													console.log(err)

													return doneSharing()
												})
										})
										.catch(err => {
											console.log(err)

											return doneSharing()
										})
								}
							})
							.catch(err => {
								console.log(err)

								shareCheckDone = true

								return done()
							})

						isItemInPublicLink(uuid)
							.then((data: any) => {
								if (!data.linking) {
									linkCheckDone = true

									return done()
								}

								const totalLinks = data.links.length
								let linksDone = 0

								const doneLinking = () => {
									linksDone += 1

									if (linksDone >= totalLinks) {
										linkCheckDone = true

										done()
									}

									return true
								}

								for (let i = 0; i < totalLinks; i++) {
									const link = data.links[i]

									decryptFolderLinkKey(link.linkKey, masterKeys)
										.then(key => {
											let itemMetadata = ""

											if (type == "file") {
												itemMetadata = JSON.stringify({
													name: metaData.name,
													size: metaData.size,
													mime: metaData.mime,
													key: metaData.key,
													lastModified: metaData.lastModified
												})
											} else {
												itemMetadata = JSON.stringify({
													name: metaData.name
												})
											}

											encryptMetadata(itemMetadata, key)
												.then(encrypted => {
													renameItemInPublicLink({
														uuid,
														linkUUID: link.linkUUID,
														metadata: encrypted
													})
														.then(() => {
															return doneLinking()
														})
														.catch(err => {
															console.log(err)

															return doneLinking()
														})
												})
												.catch(err => {
													console.log(err)

													return doneLinking()
												})
										})
										.catch(err => {
											console.log(err)

											return doneLinking()
										})
								}
							})
							.catch(err => {
								console.log(err)

								linkCheckDone = true

								return done()
							})
					})
					.catch(reject)
			})
			.catch(reject)
	})
}

export const folderExists = async ({
	name,
	parent
}: {
	name: string
	parent: string
}): Promise<{ exists: boolean; existsUUID?: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/exists",
		data: {
			parent,
			nameHashed: await hashFn(name.toLowerCase())
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		exists: response.data.exists,
		existsUUID: response.data.uuid
	}
}

export const fileExists = async ({ name, parent }: { name: string; parent: string }): Promise<{ exists: boolean; existsUUID?: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/exists",
		data: {
			parent,
			nameHashed: await hashFn(name.toLowerCase())
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		exists: response.data.exists,
		existsUUID: response.data.uuid
	}
}

export const createFolder = async ({
	uuid,
	name,
	parent,
	emitEvents = true
}: {
	uuid: string
	name: string
	parent: string
	emitEvents?: boolean
}): Promise<string> => {
	if (emitEvents) {
		eventListener.emit("createFolder", {
			type: "start",
			data: {
				uuid,
				name,
				parent
			}
		})
	}

	await createFolderSemaphore.acquire()

	try {
		const [masterKeys, nameHashed] = await Promise.all([db.get("masterKeys"), hashFn(name.toLowerCase())])
		const encrypted = await encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1])

		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/dir/create",
			data: {
				uuid,
				name: encrypted,
				nameHashed,
				parent
			}
		})

		if (!response.status) {
			throw new Error(response.message)
		}

		await checkIfItemParentIsShared({
			type: "folder",
			parent,
			metaData: {
				uuid,
				name
			}
		})

		createFolderSemaphore.release()

		if (emitEvents) {
			eventListener.emit("createFolder", {
				type: "done",
				data: {
					uuid,
					name,
					parent
				}
			})
		}

		eventListener.emit("folderCreated", {
			uuid,
			name,
			parent
		})

		return response.data.uuid
	} catch (e: any) {
		createFolderSemaphore.release()

		if (emitEvents) {
			eventListener.emit("createFolder", {
				type: "err",
				data: {
					uuid,
					name,
					parent
				},
				err: e.toString()
			})
		}

		throw e
	}
}

export const folderPresent = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/present",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const trashItem = async (item: ItemProps): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: item.type == "folder" ? "/v3/dir/trash" : "/v3/file/trash",
		data: {
			uuid: item.uuid
		}
	})

	if (!response.status) {
		if (["folder_not_found", "file_not_found"].includes(response.code)) {
			eventListener.emit("itemTrashed", {
				item
			})

			return
		}

		throw new Error(response.message)
	}

	eventListener.emit("itemTrashed", {
		item
	})
}

export const moveFile = async ({
	file,
	parent,
	emitEvents = true
}: {
	file: ItemProps
	parent: string
	emitEvents?: boolean
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/move",
		data: {
			uuid: file.uuid,
			to: parent
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemParentIsShared({
		type: "file",
		parent,
		metaData: {
			uuid: file.uuid,
			name: file.name,
			size: file.size,
			mime: file.mime,
			key: file.key,
			lastModified: file.lastModified
		}
	})

	if (emitEvents) {
		eventListener.emit("itemMoved", {
			item: file,
			from: file.parent,
			to: parent
		})
	}
}

export const moveFolder = async ({
	folder,
	parent,
	emitEvents = true
}: {
	folder: ItemProps
	parent: string
	emitEvents?: boolean
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/move",
		data: {
			uuid: folder.uuid,
			to: parent
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemParentIsShared({
		type: "folder",
		parent,
		metaData: {
			name: folder.name,
			uuid: folder.uuid
		}
	})

	if (emitEvents) {
		eventListener.emit("itemMoved", {
			item: folder,
			from: folder.parent,
			to: parent
		})
	}
}

export const renameFile = async ({ file, name }: { file: ItemProps; name: string }): Promise<void> => {
	const [masterKeys, nameHashed] = await Promise.all([db.get("masterKeys"), hashFn(name.toLowerCase())])
	const [encrypted, encryptedName] = await Promise.all([
		encryptMetadata(
			JSON.stringify({
				name,
				size: file.size,
				mime: file.mime,
				key: file.key,
				lastModified: file.lastModified
			}),
			masterKeys[masterKeys.length - 1]
		),
		encryptMetadata(name, file.key)
	])

	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/rename",
		data: {
			uuid: file.uuid,
			name: encryptedName,
			nameHashed,
			metadata: encrypted
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemIsSharedForRename({
		type: "file",
		uuid: file.uuid,
		metaData: {
			name,
			size: file.size,
			mime: file.mime,
			key: file.key,
			lastModified: file.lastModified
		}
	})

	eventListener.emit("fileRenamed", {
		item: file,
		to: name
	})
}

export const renameFolder = async ({ folder, name }: { folder: ItemProps; name: string }): Promise<void> => {
	const [masterKeys, nameHashed] = await Promise.all([db.get("masterKeys"), hashFn(name.toLowerCase())])
	const encrypted = await encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1])

	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/rename",
		data: {
			uuid: folder.uuid,
			name: encrypted,
			nameHashed
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemIsSharedForRename({
		type: "folder",
		uuid: folder.uuid,
		metaData: {
			name
		}
	})

	eventListener.emit("folderRenamed", {
		item: folder,
		to: name
	})
}

export const fetchFolderSize = async (item: ItemProps, href: string): Promise<number> => {
	if (!fetchFolderSizeSemaphores[item.uuid]) {
		fetchFolderSizeSemaphores[item.uuid] = new Semaphore(1)
	}

	await fetchFolderSizeSemaphores[item.uuid].acquire()

	try {
		let payload: {
			apiKey?: string
			uuid?: string
			sharerId?: number
			receiverId?: number
			trash?: number
			linkUUID?: string
		} = {}

		if (href.indexOf("shared-out") !== -1) {
			payload = {
				uuid: item.uuid,
				sharerId: item.sharerId || 0,
				receiverId: item.receiverId || 0,
				trash: 0
			}
		} else if (href.indexOf("shared-in") !== -1) {
			payload = {
				uuid: item.uuid,
				sharerId: item.sharerId || 0,
				receiverId: item.receiverId || 0,
				trash: 0
			}
		} else if (href.indexOf("trash") !== -1) {
			payload = {
				uuid: item.uuid,
				sharerId: 0,
				receiverId: 0,
				trash: 1
			}
		} else if (href.indexOf("/f/") !== -1) {
			payload = {
				linkUUID: href.split("/f/")[1].split("#")[0],
				uuid: item.uuid
			}
		} else {
			payload = {
				uuid: item.uuid,
				sharerId: 0,
				receiverId: 0,
				trash: 0
			}
		}

		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/dir/size" + (href.indexOf("/f/") !== -1 ? "/link" : ""),
			data: payload
		})

		fetchFolderSizeSemaphores[item.uuid].release()

		if (!response.status) {
			throw new Error(response.message)
		}

		return response.data.size
	} catch (e) {
		fetchFolderSizeSemaphores[item.uuid].release()

		throw e
	}
}

export const favoriteItem = async ({
	item,
	favorite,
	emitEvents = true
}: {
	item: ItemProps
	favorite: number
	emitEvents?: boolean
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/favorite",
		data: {
			uuid: item.uuid,
			type: item.type,
			value: favorite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	if (emitEvents) {
		eventListener.emit("itemFavorited", {
			item,
			favorited: favorite
		})
	}
}

export const emptyTrash = async (): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/trash/empty",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	eventListener.emit("trashEmptied")
}

export const deleteItemPermanently = async (item: ItemProps): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: item.type == "folder" ? "/v3/dir/delete/permanent" : "/v3/file/delete/permanent",
		data: {
			uuid: item.uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	eventListener.emit("itemDeletedPermanently", {
		item
	})
}

export const restoreItem = async (item: ItemProps): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: item.type == "folder" ? "/v3/dir/restore" : "/v3/file/restore",
		data: {
			uuid: item.uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	eventListener.emit("itemRestored", {
		item
	})
}

export const restoreArchivedFile = async ({ uuid, currentUUID }: { uuid: string; currentUUID: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/version/restore",
		data: {
			uuid,
			current: currentUUID
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const shareItemsToUser = async ({
	items,
	email,
	publicKey,
	progressCallback
}: {
	items: ItemProps[]
	email: string
	publicKey: string
	progressCallback?: (current: number, total: number) => any
}): Promise<void> => {
	const encryptPromises = []
	const itemsToShare: { item: ItemProps; encrypted: string }[] = []

	for (let i = 0; i < items.length; i++) {
		const item = items[i]

		encryptPromises.push(
			new Promise(async (resolve, reject) => {
				await shareItemsSemaphore.acquire()

				if (item.type == "file") {
					encryptMetadataPublicKey(
						JSON.stringify({
							name: item.name,
							size: item.size,
							mime: item.mime,
							key: item.key,
							lastModified: item.lastModified
						}),
						publicKey
					)
						.then(encrypted => {
							itemsToShare.push({
								item: {
									...item,
									parent: "none"
								},
								encrypted
							})

							return resolve(true)
						})
						.catch(err => {
							shareItemsSemaphore.release()

							return reject(err)
						})
				} else {
					getDirectoryTree(item.uuid, "normal")
						.then(async content => {
							const folderItemsEncryptedPromises: Promise<{ item: ItemProps; encrypted: string }>[] = []

							for (let x = 0; x < content.length; x++) {
								const folderItem = content[x].item
								const index = x

								if (folderItem.type == "file") {
									folderItemsEncryptedPromises.push(
										new Promise((resolve, reject) => {
											encryptMetadataPublicKey(
												JSON.stringify({
													name: folderItem.name,
													size: folderItem.size,
													mime: folderItem.mime,
													key: folderItem.key,
													lastModified: folderItem.lastModified
												}),
												publicKey
											)
												.then(encrypted => {
													return resolve({
														item: folderItem,
														encrypted
													})
												})
												.catch(reject)
										})
									)
								} else {
									folderItemsEncryptedPromises.push(
										new Promise((resolve, reject) => {
											encryptMetadataPublicKey(
												JSON.stringify({
													name: folderItem.name
												}),
												publicKey
											)
												.then(encrypted => {
													return resolve({
														item: {
															...folderItem,
															parent: index == 0 ? "none" : folderItem.parent
														},
														encrypted
													})
												})
												.catch(reject)
										})
									)
								}
							}

							Promise.all(folderItemsEncryptedPromises)
								.then(results => {
									for (let i = 0; i < results.length; i++) {
										itemsToShare.push({
											item: results[i].item,
											encrypted: results[i].encrypted
										})
									}

									return resolve(true)
								})
								.catch(err => {
									shareItemsSemaphore.release()

									return reject(err)
								})
						})
						.catch(err => {
							shareItemsSemaphore.release()

							return reject(err)
						})
				}
			})
		)
	}

	await Promise.all(encryptPromises)

	if (itemsToShare.length == 0) {
		return
	}

	const sorted = itemsToShare.sort((a, b) => a.item.parent.length - b.item.parent.length)
	let done: number = 0
	const sharePromises = []

	for (let i = 0; i < sorted.length; i++) {
		const itemToShare = sorted[i].item
		const encrypted = sorted[i].encrypted

		sharePromises.push(
			new Promise(async (resolve, reject) => {
				await shareItemsSemaphore.acquire()

				shareItem({
					uuid: itemToShare.uuid,
					parent: itemToShare.parent,
					email: email,
					type: itemToShare.type,
					metadata: encrypted
				})
					.then(() => {
						done += 1

						if (typeof progressCallback == "function") {
							progressCallback(done, sorted.length)
						}

						shareItemsSemaphore.release()

						return resolve(true)
					})
					.catch(err => {
						shareItemsSemaphore.release()

						return reject(err)
					})
			})
		)
	}

	try {
		await Promise.all(sharePromises)
	} catch (e: any) {
		if (e.toString().toLowerCase().indexOf("already sharing") == -1) {
			throw e
		}
	}
}

export const getPublicKeyFromEmail = async (email: string): Promise<string> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/publicKey",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.publicKey
}

export const stopSharingItem = async (item: ItemProps): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared/out/remove",
		data: {
			uuid: item.uuid,
			receiverId: item.receiverId
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const removeSharedInItem = async (item: ItemProps): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared/in/remove",
		data: {
			uuid: item.uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const itemPublicLinkInfo = async (item: ItemProps): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: item.type == "file" ? "/v3/file/link/status" : "/v3/dir/link/status",
		data:
			item.type == "file"
				? {
						uuid: item.uuid
				  }
				: {
						uuid: item.uuid
				  }
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const addItemToFolderPublicLink = async (data: {
	uuid: string
	parent: string
	linkUUID: string
	type: string
	metadata: string
	key: string
	expiration: string
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/link/add",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const createFolderPublicLink = async (item: ItemProps, progressCallback?: (current: number, total: number) => any): Promise<any> => {
	const [masterKeys, content] = await Promise.all([db.get("masterKeys"), getDirectoryTree(item.uuid, "normal")])

	if (content.length == 0) {
		return
	}

	const key = generateRandomString(32)
	const encryptedKey = await encryptMetadata(key, masterKeys[masterKeys.length - 1])
	const linkUUID = uuidv4()
	const promises = []
	const sorted = content.sort((a, b) => b.item.parent.length - a.item.parent.length)
	let done = 0

	for (let i = 0; i < sorted.length; i++) {
		promises.push(
			new Promise<void>((resolve, reject) => {
				linkItemsSemaphore.acquire().then(() => {
					const metadata = JSON.stringify(
						sorted[i].item.type == "file"
							? {
									name: sorted[i].item.name,
									mime: sorted[i].item.mime,
									key: sorted[i].item.key,
									size: sorted[i].item.size,
									lastModified: sorted[i].item.lastModified
							  }
							: {
									name: sorted[i].item.name
							  }
					)

					encryptMetadata(metadata, key)
						.then(encrypted => {
							addItemToFolderPublicLink({
								uuid: sorted[i].item.uuid,
								parent: sorted[i].item.parent,
								linkUUID,
								type: sorted[i].item.type,
								metadata: encrypted,
								key: encryptedKey,
								expiration: "never"
							})
								.then(() => {
									done += 1

									if (typeof progressCallback == "function") {
										progressCallback(done, sorted.length)
									}

									linkItemsSemaphore.release()

									resolve()
								})
								.catch(err => {
									linkItemsSemaphore.release()

									reject(err)
								})
						})
						.catch(err => {
							linkItemsSemaphore.release()

							reject(err)
						})
				})
			})
		)
	}

	await Promise.all(promises)
}

export const enableItemPublicLink = async (item: ItemProps, progressCallback?: (current: number, total: number) => any): Promise<void> => {
	if (item.type == "file") {
		const linkUUID = uuidv4()

		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/file/link/edit",
			data: {
				uuid: linkUUID,
				fileUUID: item.uuid,
				expiration: "never",
				password: "empty",
				passwordHashed: await hashFn("empty"),
				salt: generateRandomString(32),
				downloadBtn: true,
				type: "enable"
			}
		})

		if (typeof progressCallback == "function") {
			progressCallback(1, 1)
		}

		if (!response.status) {
			throw new Error(response.message)
		}
	} else {
		await createFolderPublicLink(item, progressCallback)
	}
}

export const disableItemPublicLink = async (item: ItemProps, linkUUID: string): Promise<void> => {
	if (item.type == "file") {
		if (typeof linkUUID !== "string" || linkUUID.length < 32) {
			throw new Error("Invalid linkUUID")
		}

		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/file/link/edit",
			data: {
				uuid: linkUUID,
				fileUUID: item.uuid,
				expiration: "never",
				password: "empty",
				passwordHashed: await hashFn("empty"),
				salt: generateRandomString(32),
				downloadBtn: true,
				type: "disable"
			}
		})

		if (!response.status) {
			throw new Error(response.message)
		}
	} else {
		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/dir/link/remove",
			data: {
				uuid: item.uuid
			}
		})

		if (!response.status) {
			throw new Error(response.message)
		}
	}
}

export const editItemPublicLink = async (
	item: ItemProps,
	linkUUID: string,
	expiration: string = "30d",
	password: string = "",
	downloadBtn: "enable" | "disable" = "enable"
): Promise<void> => {
	if (password == null) {
		password = ""
	}

	if (typeof downloadBtn !== "string") {
		downloadBtn = "enable"
	}

	const pass: string = password.length > 0 ? "notempty" : "empty"
	const passH: string = password.length > 0 ? password : "empty"
	const salt: string = generateRandomString(32)

	if (item.type == "file") {
		if (typeof linkUUID !== "string" || linkUUID.length < 32) {
			throw new Error("Invalid linkUUID")
		}

		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/file/link/edit",
			data: {
				uuid: linkUUID,
				fileUUID: item.uuid,
				expiration,
				password: pass,
				passwordHashed: await deriveKeyFromPassword(passH, salt, 200000, "SHA-512", 512, true),
				salt,
				downloadBtn: downloadBtn == "enable" ? true : false,
				type: "enable"
			}
		})

		if (!response.status) {
			throw new Error(response.message)
		}
	} else {
		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/dir/link/edit",
			data: {
				uuid: item.uuid,
				expiration,
				password: pass,
				passwordHashed: await deriveKeyFromPassword(passH, salt, 200000, "SHA-512", 512, true),
				salt,
				downloadBtn: downloadBtn == "enable" ? true : false
			}
		})

		if (!response.status) {
			throw new Error(response.message)
		}
	}
}

export const fetchFileVersions = async (item: ItemProps): Promise<FileVersions[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/versions",
		data: {
			uuid: item.uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.versions
}

export const changeFolderColor = async (folder: ItemProps, color: FolderColors): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/color",
		data: {
			uuid: folder.uuid,
			color
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	eventListener.emit("folderColorChanged", {
		uuid: folder.uuid,
		color
	})
}

export const userSettings = async (): Promise<UserGetSettings> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/settings"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const userAccount = async (): Promise<UserGetAccount> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/account"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const userGDPR = async (): Promise<any> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/gdpr"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const uploadAvatar = async (buffer: Uint8Array): Promise<void> => {
	const base64 = arrayBufferToBase64(buffer)
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/avatar",
		data: {
			avatar: base64,
			hash: await bufferToHash(new TextEncoder().encode(base64), "SHA-512")
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const changeEmail = async (email: string, password: string, authVersion: number): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/settings/email/change",
		data: {
			email,
			password,
			authVersion
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const updatePersonal = async ({
	city = "__NONE__",
	companyName = "__NONE__",
	country = "__NONE__",
	firstName = "__NONE__",
	lastName = "__NONE__",
	postalCode = "__NONE__",
	street = "__NONE__",
	streetNumber = "__NONE__",
	vatId = "__NONE__"
}: {
	city?: string
	companyName?: string
	country?: string
	firstName?: string
	lastName?: string
	postalCode?: string
	street?: string
	streetNumber?: string
	vatId?: string
}): Promise<void> => {
	if (city.length <= 0) {
		city = "__NONE__"
	}

	if (companyName.length <= 0) {
		companyName = "__NONE__"
	}

	if (country.length <= 0) {
		country = "__NONE__"
	}

	if (firstName.length <= 0) {
		firstName = "__NONE__"
	}

	if (lastName.length <= 0) {
		lastName = "__NONE__"
	}

	if (postalCode.length <= 0) {
		postalCode = "__NONE__"
	}

	if (street.length <= 0) {
		street = "__NONE__"
	}

	if (streetNumber.length <= 0) {
		streetNumber = "__NONE__"
	}

	if (vatId.length <= 0) {
		vatId = "__NONE__"
	}

	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/personal/update",
		data: {
			city,
			companyName,
			country,
			firstName,
			lastName,
			postalCode,
			street,
			streetNumber,
			vatId
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteAccount = async (twoFactorKey: string = "XXXXXX"): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/delete",
		data: {
			twoFactorKey
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteVersioned = async (): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/delete/versions",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteAll = async (): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/delete/all",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const changePassword = async ({
	password,
	currentPassword,
	authVersion,
	salt,
	masterKeys
}: {
	password: string
	currentPassword: string
	authVersion: number
	salt: string
	masterKeys: string
}): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/settings/password/change",
		data: {
			password,
			currentPassword,
			authVersion,
			salt,
			masterKeys
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const enable2FA = async (code: string): Promise<string> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/2fa/enable",
		data: {
			code
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.recoveryKeys
}

export const disable2FA = async (code: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/2fa/disable",
		data: {
			code
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const fetchEvents = async (
	lastTimestamp: number = Math.floor(Date.now() / 1000) + 60,
	filter: string = "all"
): Promise<UserEvent[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/events",
		data: {
			filter,
			timestamp: lastTimestamp
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.events
}

export const fetchEventInfo = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/event",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const publicLinkInfo = async (uuid: string, password: string): Promise<LinkGetInfo> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/link/info",
		data: {
			uuid,
			password
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const publicLinkHasPassword = async (uuid: string): Promise<LinkHasPassword> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/link/password",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		hasPassword: response.data.hasPassword,
		salt: response.data.salt
	}
}

export const folderLinkInfo = async (uuid: string): Promise<LinkDirInfo> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/link/info",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const folderLinkContents = async (uuid: string, parent: string, password: string): Promise<LinkDirContent> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/link/content",
		data: {
			uuid,
			password,
			parent
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const cancelSub = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/sub/cancel",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const generateInvoice = async (uuid: string): Promise<string> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/invoice",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const buySub = async (planId: number, method: PaymentMethods): Promise<string> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/sub/create",
		data: {
			planId,
			method: method
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.url
}

export const requestAffiliatePayout = async (method: string, address: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/affiliate/payout",
		data: {
			method,
			address
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const versioning = async (enable: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/versioning",
		data: {
			enabled: enable ? 1 : 0
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const loginAlerts = async (enable: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/loginAlerts",
		data: {
			enabled: enable ? 1 : 0
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface ChatConversationParticipant {
	userId: number
	email: string
	avatar: string | null
	nickName: string
	metadata: string
	permissionsAdd: boolean
	addedTimestamp: number
}

export interface ChatConversation {
	uuid: string
	lastMessageSender: number
	lastMessage: string | null
	lastMessageTimestamp: number
	ownerId: number
	participants: ChatConversationParticipant[]
}

export const chatConversations = async (timestamp: number): Promise<ChatConversation[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/chat/conversations",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface ChatMessage {
	uuid: string
	senderId: number
	senderEmail: string
	senderAvatar: string | null
	senderNickName: string
	message: string
	sentTimestamp: number
}

export const chatMessages = async (conversation: string, timestamp: number): Promise<ChatMessage[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/messages",
		data: {
			conversation,
			timestamp
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const sendChatMessage = async (conversation: string, uuid: string, message: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/send",
		data: {
			conversation,
			uuid,
			message
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsCreate = async (uuid: string, metadata: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/create",
		data: {
			uuid,
			metadata
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsParticipantsAdd = async (uuid: string, email: string, metadata: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/participants/add",
		data: {
			uuid,
			email,
			metadata
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export type TypingType = "up" | "down"

export const chatSendTyping = async (conversation: string, type: TypingType): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/typing",
		data: {
			conversation,
			type
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsRead = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/read",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsUnread = async (uuid: string): Promise<number> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/unread",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.unread
}

export const chatUnread = async (): Promise<number> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/chat/unread",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.unread
}

export interface ChatConversationsOnline {
	userId: number
	lastActive: number
	appearOffline: boolean
}

export const chatConversationsOnline = async (conversation: string): Promise<ChatConversationsOnline[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/online",
		data: {
			conversation
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const chatDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export type NoteType = "text" | "md" | "code" | "rich" | "checklist"

export interface NoteParticipant {
	userId: number
	isOwner: boolean
	email: string
	avatar: string | null
	nickName: string
	metadata: string
	permissionsWrite: boolean
	addedTimestamp: number
}

export interface Note {
	uuid: string
	ownerId: number
	isOwner: boolean
	favorite: boolean
	pinned: boolean
	type: NoteType
	metadata: string
	title: string
	preview: string
	trash: boolean
	archive: boolean
	createdTimestamp: number
	editedTimestamp: number
	participants: NoteParticipant[]
}

export const notes = async (): Promise<Note[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/notes",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface NoteContent {
	preview: string
	content: string
	editedTimestamp: number
	editorId: number
	type: NoteType
}

export const noteContent = async (uuid: string): Promise<NoteContent> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/content",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface CreateNote {
	uuid: string
	title: string
	metadata: string
}

export const createNote = async ({ uuid, title, metadata }: CreateNote): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/create",
		data: {
			uuid,
			title,
			metadata
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const editNoteContent = async ({
	uuid,
	preview,
	content,
	type
}: {
	uuid: string
	preview: string
	content: string
	type: NoteType
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/content/edit",
		data: {
			uuid,
			preview,
			content,
			type
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const editNoteTitle = async (uuid: string, title: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/title/edit",
		data: {
			uuid,
			title
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const trashNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/trash",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const archiveNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/archive",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const restoreNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/restore",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteChangeType = async ({
	uuid,
	type,
	preview,
	content
}: {
	uuid: string
	type: NoteType
	preview: string
	content: string
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/type/change",
		data: {
			uuid,
			type,
			preview,
			content
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const notePinned = async (uuid: string, pinned: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/pinned",
		data: {
			uuid,
			pinned
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteFavorite = async (uuid: string, favorite: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/favorite",
		data: {
			uuid,
			favorite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface NoteHistory {
	id: number
	preview: string
	content: string
	editedTimestamp: number
	editorId: number
	type: NoteType
}

export const noteHistory = async (uuid: string): Promise<NoteHistory[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/history",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const noteHistoryRestore = async (uuid: string, id: number): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/history/restore",
		data: {
			uuid,
			id
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteParticipantsAdd = async ({
	uuid,
	contactUUID,
	metadata,
	permissionsWrite
}: {
	uuid: string
	contactUUID: string
	metadata: string
	permissionsWrite: boolean
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/participants/add",
		data: {
			uuid,
			contactUUID,
			metadata,
			permissionsWrite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteParticipantsRemove = async ({ uuid, userId }: { uuid: string; userId: number }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/participants/remove",
		data: {
			uuid,
			userId
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteParticipantsPermissions = async ({
	uuid,
	userId,
	permissionsWrite
}: {
	uuid: string
	userId: number
	permissionsWrite: boolean
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/participants/permissions",
		data: {
			uuid,
			userId,
			permissionsWrite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface Contact {
	uuid: string
	userId: number
	email: string
	avatar: string | null
	nickName: string
	lastActive: number
	timestamp: number
}

export const contacts = async (): Promise<Contact[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface ContactRequest {
	uuid: string
	userId: number
	email: string
	avatar: string | null
	nickName: string
	timestamp: number
}

export const contactsRequestsIn = async (): Promise<ContactRequest[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts/requests/in",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsOut = async (): Promise<ContactRequest[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts/requests/out",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsOutDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/out/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const contactsRequestsSend = async (email: string): Promise<{ uuid: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/send",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsAccept = async (uuid: string): Promise<{ uuid: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/accept",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsDeny = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/deny",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const contactsDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const userNickname = async (nickname: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/nickname",
		data: {
			nickname
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface BlockedContact {
	uuid: string
	userId: number
	email: string
	avatar: string | null
	nickName: string
	timestamp: number
}

export const contactsBlocked = async (): Promise<BlockedContact[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts/blocked",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsBlockedAdd = async (email: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/blocked/add",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const contactsBlockedDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/blocked/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}
