import localForage from "localforage"
import { DB_VERSION } from "../constants"
// @ts-ignore
import memoryStorageDriver from "localforage-memoryStorageDriver"

export const normalStore = localForage.createInstance({
    name: "Filen",
    version: 1.0,
    storeName: "filen_v" + DB_VERSION
})

normalStore.defineDriver(memoryStorageDriver)
normalStore.setDriver([normalStore.INDEXEDDB, normalStore.LOCALSTORAGE, memoryStorageDriver._driver])

export const thumbnailStore = localForage.createInstance({
    name: "Filen_Thumbnails",
    version: 1.0,
    storeName: "filen_v" + DB_VERSION
})

thumbnailStore.defineDriver(memoryStorageDriver)
thumbnailStore.setDriver([thumbnailStore.INDEXEDDB, thumbnailStore.LOCALSTORAGE, memoryStorageDriver._driver])

export const metadataStore = localForage.createInstance({
    name: "Filen_Metadata",
    version: 1.0,
    storeName: "filen_v" + DB_VERSION
})

metadataStore.defineDriver(memoryStorageDriver)
metadataStore.setDriver([metadataStore.INDEXEDDB, metadataStore.LOCALSTORAGE, memoryStorageDriver._driver])