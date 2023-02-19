import { ItemProps } from "../../../types"
import imageCompression from "browser-image-compression"
import { downloadFile } from "../download"
import db from "../../db"
import memoryCache from "../../memoryCache"
import { MAX_THUMBNAIL_TRIES, MAX_CONCURRENT_THUMBNAIL_GENERATIONS, THUMBNAIL_DIMENSIONS, THUMBNAIL_VERSION } from "../../constants"
import { Semaphore, getFileExt, getFilePreviewType } from "../../helpers"
import { convertHeic } from "../../worker/worker.com"
import eventListener from "../../eventListener"

const thumbnailSemaphore = new Semaphore(MAX_CONCURRENT_THUMBNAIL_GENERATIONS)
const isGeneratingThumbnailForUUID: Record<string, boolean> = {}

const increaseErrorCount = (key: string, by: number = 1): void => {
    if(memoryCache.has(key)){
        memoryCache.set(key, (memoryCache.get(key) + by))
    }
    else{
        memoryCache.set(key, 1)
    }
}

export const generateVideoThumbnail = (file: Blob, seekTo: number = 0.0): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
        const videoPlayer = document.createElement("video")

        const blobURL = window.URL.createObjectURL(file)

        videoPlayer.setAttribute("src", blobURL)
        videoPlayer.load()

        videoPlayer.addEventListener("error", (err) => {
            window.URL.revokeObjectURL(blobURL)

            return reject(err)
        })

        videoPlayer.addEventListener("loadedmetadata", () => {
            if(videoPlayer.duration < seekTo){
                window.URL.revokeObjectURL(blobURL)

                return reject(new Error("Video is too short to generate thumbnail"))
            }
            
            setTimeout(() => {
                videoPlayer.currentTime = seekTo;
            }, 200)
            
            videoPlayer.addEventListener("seeked", () => {
                const canvas = document.createElement("canvas")

                canvas.width = videoPlayer.videoWidth
                canvas.height = videoPlayer.videoHeight

                const ctx = canvas.getContext("2d")

                if(!ctx){
                    window.URL.revokeObjectURL(blobURL)
                    canvas.remove()

                    return reject(new Error("CTX invalid"))
                }

                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height)
                ctx.canvas.toBlob(resolve, "image/jpeg", 0.7)
                window.URL.revokeObjectURL(blobURL)
                canvas.remove()
            })
        })
    })
}

export const isItemVisible = (item: ItemProps): boolean => {
    return window.visibleItems.filter(filterItem => filterItem.uuid == item.uuid).length > 0
}

export const generateThumbnailAfterUpload = async (file: File, uuid: string, name: string) => {
    isGeneratingThumbnailForUUID[uuid] = true

    try{
        const type = getFilePreviewType(getFileExt(name))

        if(!["video", "image"].includes(type)){
            throw new Error("Could not generate thumbnail for " + name + ": Invalid type " + type)
        }

        const cacheKey = "generateThumbnail:" + uuid
        const dbKey = uuid + ":" + THUMBNAIL_DIMENSIONS.width + "x" + THUMBNAIL_DIMENSIONS.height + "@" + THUMBNAIL_DIMENSIONS.quality + ":" + THUMBNAIL_VERSION

        if(type == "video"){
            const cover = await generateVideoThumbnail(file)

            if(!cover){
                throw new Error("Could not generate video cover for " + name)
            }

            file = new File([cover], name, {
                type: "image/jpeg"
            })
        }
        
        const compressed = await imageCompression(file, {
            maxWidthOrHeight: THUMBNAIL_DIMENSIONS.width,
            maxSizeMB: 0.1,
            useWebWorker: true,
            fileType: "image/jpeg"
        })

        await db.set(dbKey, compressed, "thumbnails")

        const url = window.URL.createObjectURL(compressed)
                
        memoryCache.set(cacheKey, url)

        thumbnailSemaphore.release()

        eventListener.emit("thumbnailGenerated", {
            uuid: uuid,
            url
        })
    }
    catch(e){
        console.error(e)
    }

    isGeneratingThumbnailForUUID[uuid] = false
}

export const generateThumbnail = (item: ItemProps, skipVisibleCheck: boolean = false): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if(isGeneratingThumbnailForUUID[item.uuid]){
            return resolve("")
        }

        isGeneratingThumbnailForUUID[item.uuid] = true

        if(!skipVisibleCheck){
            if(!isItemVisible(item)){
                await new Promise(resolve => setTimeout(resolve, 1000))

                if(!isItemVisible(item)){
                    isGeneratingThumbnailForUUID[item.uuid] = false

                    return reject("notVisible")
                }
            }
        }

        const cacheKey = "generateThumbnail:" + item.uuid
        const maxTriesKey = "generateThumbnail:" + item.uuid + ":tries"
        const dbKey = item.uuid + ":" + THUMBNAIL_DIMENSIONS.width + "x" + THUMBNAIL_DIMENSIONS.height + "@" + THUMBNAIL_DIMENSIONS.quality + ":" + THUMBNAIL_VERSION

        if(memoryCache.has(maxTriesKey)){
            if(memoryCache.get(maxTriesKey) > MAX_THUMBNAIL_TRIES){
                isGeneratingThumbnailForUUID[item.uuid] = false

                return resolve("")
            }
        }

        if(memoryCache.has(cacheKey)){
            isGeneratingThumbnailForUUID[item.uuid] = false

            eventListener.emit("thumbnailGenerated", {
                uuid: item.uuid,
                url: memoryCache.get(cacheKey)
            })

            return resolve(memoryCache.get(cacheKey))
        }

        thumbnailSemaphore.acquire().then(() => {
            if(!skipVisibleCheck){
                if(!isItemVisible(item)){
                    thumbnailSemaphore.release()

                    isGeneratingThumbnailForUUID[item.uuid] = false

                    return reject("notVisible")
                }
            }

            db.get(dbKey, "thumbnails").then((dbBlob) => {
                if(!skipVisibleCheck){
                    if(!isItemVisible(item)){
                        thumbnailSemaphore.release()

                        isGeneratingThumbnailForUUID[item.uuid] = false
    
                        return reject("notVisible")
                    }
                }

                if(dbBlob instanceof Blob){
                    try{
                        const url = window.URL.createObjectURL(dbBlob)
            
                        memoryCache.set(cacheKey, url)

                        thumbnailSemaphore.release()

                        isGeneratingThumbnailForUUID[item.uuid] = false

                        eventListener.emit("thumbnailGenerated", {
                            uuid: item.uuid,
                            url
                        })
            
                        return resolve(url)
                    }
                    catch(e){
                        thumbnailSemaphore.release()

                        isGeneratingThumbnailForUUID[item.uuid] = false

                        return reject(e)
                    }
                }
                else{
                    const compress = (blob: Blob) => {
                        imageCompression(blob as File, {
                            maxWidthOrHeight: THUMBNAIL_DIMENSIONS.width,
                            maxSizeMB: 0.1,
                            useWebWorker: true,
                            fileType: "image/jpeg"
                        }).then((output: Blob) => {
                            memoryCache.remove("hideTransferProgress:" + item.uuid)
        
                            db.set(dbKey, output, "thumbnails").then(() => {
                                try{
                                    const url = window.URL.createObjectURL(output)
                        
                                    memoryCache.set(cacheKey, url)
        
                                    thumbnailSemaphore.release()

                                    isGeneratingThumbnailForUUID[item.uuid] = false

                                    eventListener.emit("thumbnailGenerated", {
                                        uuid: item.uuid,
                                        url
                                    })
                        
                                    return resolve(url)
                                }
                                catch(e){
                                    thumbnailSemaphore.release()

                                    isGeneratingThumbnailForUUID[item.uuid] = false
        
                                    return reject(e)
                                }
                            }).catch((err) => {
                                increaseErrorCount(maxTriesKey)
    
                                thumbnailSemaphore.release()

                                isGeneratingThumbnailForUUID[item.uuid] = false
                
                                return reject(err)
                            })
                        }).catch((err) => {
                            increaseErrorCount(maxTriesKey)
        
                            thumbnailSemaphore.release()

                            isGeneratingThumbnailForUUID[item.uuid] = false
    
                            return reject(err)
                        })
                    }

                    memoryCache.set("hideTransferProgress:" + item.uuid, true)

                    if(getFilePreviewType(getFileExt(item.name)) == "video"){
                        downloadFile(item, false, item.chunks < 16 ? item.chunks : 16).then((data) => {
                            if(!skipVisibleCheck){
                                if(!isItemVisible(item)){
                                    thumbnailSemaphore.release()
                
                                    isGeneratingThumbnailForUUID[item.uuid] = false
                
                                    return reject("notVisible")
                                }
                            }

                            const blob = new Blob([data as Uint8Array], {
                                type: item.mime
                            })
    
                            generateVideoThumbnail(blob).then((videoThumbnailBlob) => {
                                if(!videoThumbnailBlob){
                                    increaseErrorCount(maxTriesKey)
                
                                    thumbnailSemaphore.release()
            
                                    isGeneratingThumbnailForUUID[item.uuid] = false

                                    return reject(new Error("videoThumbnailBlob null"))
                                }

                                return compress(videoThumbnailBlob)
                            }).catch((err) => {
                                increaseErrorCount(maxTriesKey)
                
                                thumbnailSemaphore.release()
        
                                isGeneratingThumbnailForUUID[item.uuid] = false
                
                                return reject(err)
                            })
                        }).catch((err) => {
                            increaseErrorCount(maxTriesKey)
            
                            thumbnailSemaphore.release()
    
                            isGeneratingThumbnailForUUID[item.uuid] = false
            
                            return reject(err)
                        })
                    }
                    else{
                        downloadFile(item, false).then((data) => {
                            if(!skipVisibleCheck){
                                if(!isItemVisible(item)){
                                    thumbnailSemaphore.release()
                
                                    isGeneratingThumbnailForUUID[item.uuid] = false
                
                                    return reject("notVisible")
                                }
                            }
    
                            if(getFileExt(item.name) == "heic" || getFileExt(item.name) == "heif"){
                                convertHeic(data as Uint8Array, "JPEG").then((converted) => {
                                    const blob = new Blob([converted], {
                                        type: "image/jpeg"
                                    })
        
                                    return compress(blob)
                                }).catch(reject)
                            }
                            else{
                                const blob = new Blob([data as Uint8Array], {
                                    type: "image/jpeg"
                                })
    
                                return compress(blob)
                            }
                        }).catch((err) => {
                            increaseErrorCount(maxTriesKey)
            
                            thumbnailSemaphore.release()
    
                            isGeneratingThumbnailForUUID[item.uuid] = false
            
                            return reject(err)
                        })
                    }
                }
            }).catch((err) => {
                isGeneratingThumbnailForUUID[item.uuid] = false

                return reject(err)
            })
        })
    })
}