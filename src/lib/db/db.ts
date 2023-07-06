import { USE_MEMORY_CACHE } from "../constants"
import eventListener from "../eventListener"
import memoryCache from "../memoryCache"
import { normalStore, metadataStore, thumbnailStore, notesStore, chatsStore } from "../localForage/localForage"

export type StoreTypes = "normal" | "thumbnails" | "metadata" | "notes" | "chats"
export const DB_PREFIX = "db:"

const getStore = (type: StoreTypes): LocalForage => {
	if (type === "thumbnails") {
		return thumbnailStore
	} else if (type === "metadata") {
		return metadataStore
	} else if (type === "notes") {
		return notesStore
	} else if (type === "chats") {
		return chatsStore
	}

	return normalStore
}

export const get = async (key: string, storeType: StoreTypes = "normal"): Promise<any> => {
	if (USE_MEMORY_CACHE) {
		if (memoryCache.has(DB_PREFIX + storeType + ":" + key)) {
			return memoryCache.get(DB_PREFIX + storeType + ":" + key)
		}
	}

	let value: any = await getStore(storeType).getItem(key)

	if (!value) {
		value = null
	}

	if (value !== null && USE_MEMORY_CACHE && storeType !== "thumbnails") {
		memoryCache.set(DB_PREFIX + storeType + ":" + key, value)
	}

	return value
}

export const set = async (key: string, value: any, storeType: StoreTypes = "normal"): Promise<void> => {
	await getStore(storeType).setItem(key, value)

	if (USE_MEMORY_CACHE) {
		memoryCache.set(DB_PREFIX + storeType + ":" + key, value)
	}

	eventListener.emit("dbSet", {
		key,
		value
	})
}

export const remove = async (key: string, storeType: StoreTypes = "normal"): Promise<void> => {
	await getStore(storeType).removeItem(key)

	if (USE_MEMORY_CACHE) {
		memoryCache.remove(DB_PREFIX + storeType + ":" + key)
	}

	eventListener.emit("dbRemove", {
		key
	})
}

export const clear = async (storeType: StoreTypes = "normal"): Promise<void> => {
	await getStore(storeType).clear()

	if (USE_MEMORY_CACHE) {
		memoryCache.cache.forEach((_, key: string) => {
			if (key.indexOf(DB_PREFIX + storeType) !== -1) {
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
	keys
}
