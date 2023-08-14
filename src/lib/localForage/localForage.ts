import localForage from "localforage"
import { DB_VERSION } from "../constants"
// @ts-ignore
import memoryStorageDriver from "localforage-memoryStorageDriver"

const initStores = () => {
	if (window.location.href.indexOf("?embed") !== -1) {
		const embedStore = localForage.createInstance({
			name: "Filen_Embed",
			version: 1.0,
			storeName: "filen_v" + DB_VERSION,
			size: 1024 * 1024 * 1024
		})

		embedStore.defineDriver(memoryStorageDriver).catch(console.error)
		embedStore.setDriver([memoryStorageDriver._driver]).catch(console.error)

		return {
			normalStore: embedStore,
			thumbnailStore: embedStore,
			metadataStore: embedStore,
			notesStore: embedStore,
			chatsStore: embedStore,
			contactsStore: embedStore
		}
	}

	const normalStore = localForage.createInstance({
		name: "Filen",
		version: 1.0,
		storeName: "filen_v" + DB_VERSION,
		size: 1024 * 1024 * 1024
	})

	normalStore.defineDriver(memoryStorageDriver).catch(console.error)
	normalStore.setDriver([normalStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

	const thumbnailStore = localForage.createInstance({
		name: "Filen_Thumbnails",
		version: 1.0,
		storeName: "filen_v" + DB_VERSION,
		size: 1024 * 1024 * 1024
	})

	thumbnailStore.defineDriver(memoryStorageDriver).catch(console.error)
	thumbnailStore.setDriver([thumbnailStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

	const metadataStore = localForage.createInstance({
		name: "Filen_Metadata",
		version: 1.0,
		storeName: "filen_v" + DB_VERSION,
		size: 1024 * 1024 * 1024
	})

	metadataStore.defineDriver(memoryStorageDriver).catch(console.error)
	metadataStore.setDriver([metadataStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

	const notesStore = localForage.createInstance({
		name: "Filen_Notes",
		version: 1.0,
		storeName: "filen_v" + DB_VERSION,
		size: 1024 * 1024 * 1024
	})

	notesStore.defineDriver(memoryStorageDriver).catch(console.error)
	notesStore.setDriver([notesStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

	const chatsStore = localForage.createInstance({
		name: "Filen_Chats",
		version: 1.0,
		storeName: "filen_v" + DB_VERSION,
		size: 1024 * 1024 * 1024
	})

	chatsStore.defineDriver(memoryStorageDriver).catch(console.error)
	chatsStore.setDriver([chatsStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

	const contactsStore = localForage.createInstance({
		name: "Filen_Contacts",
		version: 1.0,
		storeName: "filen_v" + DB_VERSION,
		size: 1024 * 1024 * 1024
	})

	contactsStore.defineDriver(memoryStorageDriver).catch(console.error)
	contactsStore.setDriver([contactsStore.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

	return {
		normalStore,
		thumbnailStore,
		metadataStore,
		notesStore,
		chatsStore,
		contactsStore
	}
}

const stores = initStores()

export const normalStore = stores.normalStore
export const thumbnailStore = stores.thumbnailStore
export const metadataStore = stores.metadataStore
export const notesStore = stores.notesStore
export const chatsStore = stores.chatsStore
export const contactsStore = stores.contactsStore
