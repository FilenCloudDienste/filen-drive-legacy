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

export const notesStore = localForage.createInstance({
	name: "Filen_Notes",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION,
	size: 1024 * 1024 * 128
})

notesStore.defineDriver(memoryStorageDriver).catch(console.error)
notesStore.setDriver([notesStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

export const chatsStore = localForage.createInstance({
	name: "Filen_Chats",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION,
	size: 1024 * 1024 * 128
})

chatsStore.defineDriver(memoryStorageDriver).catch(console.error)
chatsStore.setDriver([chatsStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

export const contactsStore = localForage.createInstance({
	name: "Filen_Contacts",
	version: 1.0,
	storeName: "filen_v" + DB_VERSION,
	size: 1024 * 1024 * 128
})

contactsStore.defineDriver(memoryStorageDriver).catch(console.error)
contactsStore.setDriver([contactsStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)
