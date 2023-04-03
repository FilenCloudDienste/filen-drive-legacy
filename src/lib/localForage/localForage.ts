import localForage from "localforage"
import { DB_VERSION } from "../constants"
// @ts-ignore
import memoryStorageDriver from "localforage-memoryStorageDriver"

export const normalStore = localForage.createInstance({
	name: "Filen",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION
})

normalStore.defineDriver(memoryStorageDriver).catch(console.error)
normalStore
	.setDriver([normalStore.INDEXEDDB, normalStore.LOCALSTORAGE, memoryStorageDriver._driver])
	.catch(console.error)

export const thumbnailStore = localForage.createInstance({
	name: "Filen_Thumbnails",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION
})

thumbnailStore.defineDriver(memoryStorageDriver).catch(console.error)
thumbnailStore
	.setDriver([thumbnailStore.INDEXEDDB, thumbnailStore.LOCALSTORAGE, memoryStorageDriver._driver])
	.catch(console.error)

export const metadataStore = localForage.createInstance({
	name: "Filen_Metadata",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION
})

metadataStore.defineDriver(memoryStorageDriver).catch(console.error)
metadataStore
	.setDriver([metadataStore.INDEXEDDB, metadataStore.LOCALSTORAGE, memoryStorageDriver._driver])
	.catch(console.error)
