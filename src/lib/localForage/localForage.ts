import localForage from "localforage"
import { DB_VERSION } from "../constants"
// @ts-ignore
import memoryStorageDriver from "localforage-memoryStorageDriver"

export const normalStore = localForage.createInstance({
	name: "Filen",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION,
	size: 1024 * 1024 * 128
})

normalStore.defineDriver(memoryStorageDriver).catch(console.error)
normalStore.setDriver([normalStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

export const thumbnailStore = localForage.createInstance({
	name: "Filen_Thumbnails",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION,
	size: 1024 * 1024 * 128
})

thumbnailStore.defineDriver(memoryStorageDriver).catch(console.error)
thumbnailStore.setDriver([thumbnailStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

export const metadataStore = localForage.createInstance({
	name: "Filen_Metadata",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION,
	size: 1024 * 1024 * 128
})

metadataStore.defineDriver(memoryStorageDriver).catch(console.error)
metadataStore.setDriver([metadataStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)
