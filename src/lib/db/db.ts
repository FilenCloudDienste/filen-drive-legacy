import { USE_MEMORY_CACHE } from "../constants"
import eventListener from "../eventListener"
import memoryCache from "../memoryCache"
import { normalStore, metadataStore, thumbnailStore } from "../localForage/localForage"

const indexKey = "@internal:index"
const USE_INTERNAL_INDEX = false

export type StoreTypes = "normal" | "thumbnails" | "metadata"

const getStore = (type: StoreTypes): LocalForage => {
	if (type == "thumbnails") {
		return thumbnailStore
	} else if (type == "metadata") {
		return metadataStore
	}

	return normalStore
}

const updateIndex = async (key: string, type: "add" | "remove", storeType: StoreTypes = "normal"): Promise<void> => {
	if (!USE_INTERNAL_INDEX) {
		return
	}

	let value = await get(indexKey, storeType, false)

	if (typeof value === "undefined") {
		value = {}
	}

	if (value === null) {
		value = {}
	}

	if (type === "add") {
		value[key] = key
	} else {
		delete value[key]
	}

	await set(indexKey, value, storeType, false)
}

export const warmUpDb = async (): Promise<void> => {
	const normalKeys = await keys("normal")
	const metadataKeys = await keys("metadata")

	for (let i = 0; i < normalKeys.length; i++) {
		await get(normalKeys[i].toString(), "normal")
	}

	for (let i = 0; i < metadataKeys.length; i++) {
		await get(metadataKeys[i].toString(), "normal")
	}
}

export const get = async (key: string, storeType: StoreTypes = "normal", index: boolean = false): Promise<any> => {
	if (USE_MEMORY_CACHE) {
		if (memoryCache.has("db:" + storeType + ":" + key)) {
			return memoryCache.get("db:" + storeType + ":" + key)
		}
	}

	let value: any = await getStore(storeType).getItem(key)

	if (typeof value === "undefined") {
		value = null
	}

	if (value !== null && USE_MEMORY_CACHE && storeType !== "thumbnails") {
		memoryCache.set("db:" + storeType + ":" + key, value)
	}

	if (value !== null && index) {
		await updateIndex(key, "add", storeType)
	}

	return value
}

export const set = async (
	key: string,
	value: any,
	storeType: StoreTypes = "normal",
	index: boolean = true
): Promise<void> => {
	await getStore(storeType).setItem(key, value)

	if (USE_MEMORY_CACHE) {
		memoryCache.set("db:" + storeType + ":" + key, value)
	}

	if (!index) {
		eventListener.emit("dbSet", {
			key,
			value
		})

		return
	}

	await updateIndex(key, "add", storeType)

	eventListener.emit("dbSet", {
		key,
		value
	})
}

export const remove = async (key: string, storeType: StoreTypes = "normal"): Promise<void> => {
	await getStore(storeType).removeItem(key)

	if (USE_MEMORY_CACHE) {
		memoryCache.remove("db:" + storeType + ":" + key)
		memoryCache.remove("db:" + storeType + ":keys:allKeys")
	}

	await updateIndex(key, "remove", storeType)

	eventListener.emit("dbRemove", {
		key
	})
}

export const clear = async (storeType: StoreTypes = "normal"): Promise<void> => {
	await getStore(storeType).clear()

	if (USE_MEMORY_CACHE) {
		memoryCache.remove("db:" + storeType + ":keys:allKeys")

		memoryCache.cache.forEach((_, key: string) => {
			if (key.indexOf("db:" + storeType) !== -1) {
				memoryCache.remove(key)
			}
		})
	}

	eventListener.emit("dbClear")
}

export const keys = async (storeType: StoreTypes = "normal"): Promise<string[]> => {
	return await getStore(storeType).keys()
}

export default {
	get,
	set,
	remove,
	clear,
	keys,
	warmUpDb
}
