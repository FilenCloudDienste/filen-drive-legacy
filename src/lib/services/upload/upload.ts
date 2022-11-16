import type { UploadQueueItem, ItemProps } from "../../../types"
import mimeTypes from "mime-types"
import { generateRandomString, Semaphore, getUploadServer } from "../../helpers"
import { encryptMetadata, hashFn, encryptAndUploadFileChunk } from "../../worker/worker.com"
import db from "../../db"
import eventListener from "../../eventListener"
import { MAX_CONCURRENT_UPLOADS, MAX_UPLOAD_THREADS, UPLOAD_VERSION } from "../../constants"
import { markUploadAsDone, checkIfItemParentIsShared } from "../../api"
import { addItemsToStore } from "../metadata"
import { fetchUserInfoCached } from "../user"

const uploadSemaphore = new Semaphore(MAX_CONCURRENT_UPLOADS)
const uploadThreadsSemaphore = new Semaphore(MAX_UPLOAD_THREADS)

export const queueFileUpload = (item: UploadQueueItem, parent: string): Promise<ItemProps> => {
    return new Promise(async (resolve, reject) => {
        eventListener.emit("upload", {
            type: "start",
            data: item
        })

        await uploadSemaphore.acquire()

        const userInfo = fetchUserInfoCached()

        if(typeof userInfo !== "undefined"){
            if((userInfo.storageUsed + (item.bytes + 1024)) >= userInfo.maxStorage){
                eventListener.emit("openMaxStorageModal")

                return reject(new Error("notEnoughRemoteStorage"))
            }
        }
        
        try{
            var [apiKey, masterKeys] = await Promise.all([
                db.get("apiKey"),
                db.get("masterKeys")
            ])

            if(!Array.isArray(masterKeys)){
                return reject("Master keys empty")
            }

            if(masterKeys.length == 0){
                return reject("Master keys empty")
            }
        }
        catch(e){
            return reject(e)
        }

        const name = item.file.name
        const size = item.file.size
        const mime = item.file.type || mimeTypes.lookup(name) || ""
        const chunkSizeToUse = ((1024 * 1024) * 1)
        let dummyOffset = 0
        let fileChunks = 0
        const expire = "never"
        const lastModified = item.file.lastModified || new Date().getTime()
        let paused = false
        let stopped = false
        let err = undefined
        let bucket = "filen-1"
        let region = "de-1"

        while(dummyOffset < size){
            fileChunks += 1
            dummyOffset += chunkSizeToUse
        }

        const key = generateRandomString(32)
        const uuid = item.uuid
        const rm = generateRandomString(32)
        const uploadKey = generateRandomString(32)
        
        try{
            var [nameEncrypted, mimeEncrypted, sizeEncrypted, metadata, nameHashed] = await Promise.all([
                encryptMetadata(name, key),
                encryptMetadata(mime, key),
                encryptMetadata(size.toString(), key),
                encryptMetadata(JSON.stringify({
                    name,
                    size,
                    mime,
                    key,
                    lastModified
                }), masterKeys[masterKeys.length - 1]),
                hashFn(name.toLowerCase())
            ])
        }
        catch(e){
            return reject(e)
        }

        const pauseListener = eventListener.on("pauseTransfer", (passedUUID: string) => {
            if(passedUUID == uuid){
                paused = true
            }
        })

        const resumeListener = eventListener.on("resumeTransfer", (passedUUID: string) => {
            if(passedUUID == uuid){
                paused = false
            }
        })

        const stopListener = eventListener.on("stopTransfer", (passedUUID: string) => {
            if(passedUUID == uuid){
                stopped = true
            }
        })

        const cleanup = (): void => {
            try{
                uploadSemaphore.release()
                pauseListener.remove()
                resumeListener.remove()
                stopListener.remove()
            }
            catch(e){
                console.error(e)
            }
        }

        eventListener.emit("upload", {
            type: "started",
            data: item
        })

        const upload = (index: number): Promise<any> => {
            return new Promise(async (resolve, reject) => {
                if(paused){
                    await new Promise((resolve) => {
                        const wait = setInterval(() => {
                            if(!paused || stopped){
                                clearInterval(wait)

                                return resolve(true)
                            }
                        }, 10)
                    })
                }

                if(stopped){
                    return reject("stopped")
                }

                const params = new URLSearchParams({
                    apiKey,
                    uuid,
                    name: nameEncrypted,
                    nameHashed: nameHashed,
                    size: sizeEncrypted,
                    chunks: fileChunks,
                    mime: mimeEncrypted,
                    index,
                    rm,
                    expire,
                    uploadKey,
                    metaData: metadata,
                    parent,
                    version: UPLOAD_VERSION
                } as any).toString()

                const url = getUploadServer() + "/v2/upload?" + params

                encryptAndUploadFileChunk(item.file, key, url, uuid, index, chunkSizeToUse).then(resolve).catch(reject)
            })
        }

        try{
            const res = await upload(0)

            bucket = res.data.bucket
            region = res.data.region
        }
        catch(e: any){
            eventListener.emit("upload", {
                type: "err",
                err: e.toString(),
                data: item
            })

            cleanup()

            return reject(e)
        }

        if(typeof err == "undefined"){
            try{
                await new Promise((resolve, reject) => {
                    let done = 1
        
                    for(let i = 1; i < (fileChunks + 1); i++){
                        uploadThreadsSemaphore.acquire().then(() => {
                            if(stopped){
                                uploadThreadsSemaphore.release()

                                return reject("stopped")
                            }

                            upload(i).then(() => {
                                if(stopped){
                                    uploadThreadsSemaphore.release()
                                    
                                    return reject("stopped")
                                }

                                done += 1
        
                                uploadThreadsSemaphore.release()
        
                                if(done >= (fileChunks + 1)){
                                    return resolve(true)
                                }
                            }).catch((err) => {
                                uploadThreadsSemaphore.release()
        
                                return reject(err)
                            })
                        })
                    }
                })
            }
            catch(e: any){
                if(e.toString().toLowerCase().indexOf("already exists") !== -1){
                    cleanup()

                    eventListener.emit("upload", {
                        type: "err",
                        err: e.toString(),
                        data: item
                    })

                    return
                }
                else if(e == "stopped"){
                    cleanup()

                    eventListener.emit("upload", {
                        type: "err",
                        err: e.toString(),
                        data: item
                    })

                    return
                }

                cleanup()
        
                err = e
            }
        }

        if(typeof err !== "undefined"){
            eventListener.emit("upload", {
                type: "err",
                err: err.toString(),
                data: item
            })

            cleanup()

            if(err == "stopped"){
                return reject("stopped")
            }
            else if(err.toString().toLowerCase().indexOf("blacklist") !== -1){
                //showToast({ message: i18n(storage.getString("lang"), "notEnoughRemoteStorage") })

                return reject("notEnoughRemoteStorage")
            }
            else{
                //showToast({ message: err.toString() })

                return reject(err)
            }
        }

        try{
            await markUploadAsDone({ uuid, uploadKey })
            await checkIfItemParentIsShared({
                type: "file",
                parent,
                metaData: {
                    uuid,
                    name,
                    size,
                    mime,
                    key,
                    lastModified
                }
            })
        }
        catch(e: any){
            eventListener.emit("upload", {
                type: "err",
                err: e.toString(),
                data: item
            })

            cleanup()

            return reject(e)
        }

        eventListener.emit("upload", {
            type: "done",
            data: item
        })

        cleanup()

        const newItem: ItemProps = {
            root: "",
            type: "file",
            uuid,
            name,
            size,
            mime,
            lastModified,
            lastModifiedSort: lastModified,
            timestamp: Math.floor(new Date().getTime() / 1000),
            selected: false,
            color: "default",
            parent,
            rm,
            version: UPLOAD_VERSION,
            sharerEmail: "",
            sharerId: 0,
            receiverEmail: "",
            receiverId: 0,
            writeAccess: false,
            chunks: fileChunks,
            favorited: 0,
            key,
            bucket,
            region,
        }

        eventListener.emit("fileUploaded", {
            item: newItem
        })

        addItemsToStore([newItem], newItem.parent).catch(console.error)

        return resolve(newItem)
    })
}