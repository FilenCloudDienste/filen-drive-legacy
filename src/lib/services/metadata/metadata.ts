import db from "../../db"
import memoryCache from "../../memoryCache"
import { ItemProps } from "../../../types"
import { Semaphore } from "../../helpers"

const mutex = new Semaphore(1)

export const DEFAULT_PARENTS: string[] = ["shared-in", "shared-out", "favorites", "recent", "trash", "links"]

export const addItemsToStore = async (items: ItemProps[], parent: string): Promise<void> => {
	await mutex.acquire()

	try {
		const [presentList, presentSidebar, folderNames] = await Promise.all([
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			}),
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadSidebarItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			}),
			new Promise<{ [key: string]: string }>((resolve, reject) => {
				db.get("folderNames", "metadata")
					.then(data => {
						if (!data) {
							return resolve({})
						}

						return resolve(data)
					})
					.catch(reject)
			})
		])

		for (let i = 0; i < items.length; i++) {
			presentList.push(items[i])
		}

		for (let i = 0; i < items.length; i++) {
			if (items[i].type == "folder") {
				presentSidebar.push(items[i])
			}
		}

		for (const uuid in folderNames) {
			for (let i = 0; i < items.length; i++) {
				if (uuid == items[i].uuid) {
					folderNames[uuid] = items[i].name

					if (memoryCache.has("folderName:" + items[i].uuid)) {
						memoryCache.set("folderName:" + items[i].uuid, items[i].name)
					}
				}
			}
		}

		await Promise.all([
			db.set("loadItems:" + parent, presentList, "metadata"),
			db.set("loadSidebarItems:" + parent, presentSidebar, "metadata"),
			db.set("folderNames", folderNames, "metadata")
		])
	} catch (e) {
		mutex.release()

		throw e
	}

	mutex.release()
}

export const removeItemsFromStore = async (items: ItemProps[], parent: string): Promise<void> => {
	await mutex.acquire()

	try {
		const [presentList, presentSidebar] = await Promise.all([
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			}),
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadSidebarItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			})
		])

		if (presentList.length > 0) {
			for (let i = 0; i < presentList.length; i++) {
				for (let x = 0; x < items.length; x++) {
					if (presentList[i].uuid == items[x].uuid) {
						presentList.splice(i, 1)

						i--
					}
				}
			}
		}

		if (presentSidebar.length > 0) {
			for (let i = 0; i < presentSidebar.length; i++) {
				for (let x = 0; x < items.length; x++) {
					if (items[x].type == "folder" && presentSidebar[i].uuid == items[x].uuid) {
						presentSidebar.splice(i, 1)

						i--
					}
				}
			}
		}

		await Promise.all([
			db.set("loadItems:" + parent, presentList, "metadata"),
			db.set("loadSidebarItems:" + parent, presentSidebar, "metadata")
		])
	} catch (e) {
		mutex.release()

		throw e
	}

	mutex.release()
}

export const changeItemsInStore = async (items: ItemProps[], parent: string): Promise<void> => {
	await mutex.acquire()

	try {
		const [presentList, presentSidebar, folderNames] = await Promise.all([
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			}),
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadSidebarItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			}),
			new Promise<{ [key: string]: string }>((resolve, reject) => {
				db.get("folderNames", "metadata")
					.then(data => {
						if (!data) {
							return resolve({})
						}

						return resolve(data)
					})
					.catch(reject)
			})
		])

		if (presentList.length > 0) {
			for (let i = 0; i < presentList.length; i++) {
				for (let x = 0; x < items.length; x++) {
					if (presentList[i].uuid == items[x].uuid) {
						presentList[i] = items[x]
					}
				}
			}
		}

		if (presentSidebar.length > 0) {
			for (let i = 0; i < presentSidebar.length; i++) {
				for (let x = 0; x < items.length; x++) {
					if (items[x].type == "folder" && presentSidebar[i].uuid == items[x].uuid) {
						presentSidebar[i] = items[x]
					}
				}
			}
		}

		for (const uuid in folderNames) {
			for (let i = 0; i < items.length; i++) {
				if (uuid == items[i].uuid) {
					folderNames[uuid] = items[i].name

					if (memoryCache.has("folderName:" + items[i].uuid)) {
						memoryCache.set("folderName:" + items[i].uuid, items[i].name)
					}
				}
			}
		}

		await Promise.all([
			db.set("loadItems:" + parent, presentList, "metadata"),
			db.set("loadSidebarItems:" + parent, presentSidebar, "metadata"),
			db.set("folderNames", folderNames, "metadata")
		])
	} catch (e) {
		mutex.release()

		throw e
	}

	mutex.release()
}

export type ChangeItemInStorePropTypes = "name" | "color"

export const changeItemInStore = async (uuid: string, parent: string, prop: ChangeItemInStorePropTypes, value: any): Promise<void> => {
	await mutex.acquire()

	try {
		const [presentList, presentSidebar, folderNames] = await Promise.all([
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			}),
			new Promise<ItemProps[]>((resolve, reject) => {
				db.get("loadSidebarItems:" + parent, "metadata")
					.then(data => {
						if (!Array.isArray(data)) {
							return resolve([])
						}

						return resolve(data)
					})
					.catch(reject)
			}),
			new Promise<{ [key: string]: string }>((resolve, reject) => {
				db.get("folderNames", "metadata")
					.then(data => {
						if (!data) {
							return resolve({})
						}

						return resolve(data)
					})
					.catch(reject)
			})
		])

		if (presentList.length > 0) {
			for (let i = 0; i < presentList.length; i++) {
				if (presentList[i].type == "folder" && presentList[i].uuid == uuid) {
					presentList[i] = {
						...presentList[i],
						[prop]: value
					}
				}
			}
		}

		if (presentSidebar.length > 0) {
			for (let i = 0; i < presentSidebar.length; i++) {
				if (presentSidebar[i].type == "folder" && presentSidebar[i].uuid == uuid) {
					presentSidebar[i] = {
						...presentSidebar[i],
						[prop]: value
					}
				}
			}
		}

		if (prop == "name") {
			for (const prop in folderNames) {
				if (uuid == prop) {
					folderNames[prop] = value

					if (memoryCache.has("folderName:" + uuid)) {
						memoryCache.set("folderName:" + uuid, value)
					}
				}
			}
		}

		await Promise.all([
			db.set("loadItems:" + parent, presentList, "metadata"),
			db.set("loadSidebarItems:" + parent, presentSidebar, "metadata"),
			db.set("folderNames", folderNames, "metadata")
		])
	} catch (e) {
		mutex.release()

		throw e
	}

	mutex.release()
}

export const clearItemsInStore = async (parent: string): Promise<void> => {
	await mutex.acquire()

	try {
		await Promise.all([db.set("loadItems:" + parent, [], "metadata"), db.set("loadSidebarItems:" + parent, [], "metadata")])
	} catch (e) {
		mutex.release()

		throw e
	}

	mutex.release()
}
