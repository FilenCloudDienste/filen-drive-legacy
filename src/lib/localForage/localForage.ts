import localForage from "localforage"
import { DB_VERSION } from "../constants"

export const normalStore = localForage.createInstance({
    name: "Filen",
    version: 1.0,
    storeName: "filen_v" + DB_VERSION
})

export const thumbnailStore = localForage.createInstance({
    name: "Filen_Thumbnails",
    version: 1.0,
    storeName: "filen_v" + DB_VERSION
})

export const metadataStore = localForage.createInstance({
    name: "Filen_Metadata",
    version: 1.0,
    storeName: "filen_v" + DB_VERSION
})