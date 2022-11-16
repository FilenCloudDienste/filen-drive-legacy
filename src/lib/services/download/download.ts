import type { ItemProps, Download } from "../../../types"
import { MAX_CONCURRENT_DOWNLOADS, MAX_DOWNLOAD_THREADS, MAX_DOWNLOAD_WRITERS } from "../../constants"
import eventListener from "../../eventListener"
import { Semaphore, getDownloadServer, mergeUInt8Arrays } from "../../helpers"
import streamSaver from "../../streamSaver"
import { downloadAndDecryptChunk } from "../../worker/worker.com"
// @ts-ignore
import { Writer as ZIPWriter } from "@transcend-io/conflux"
import { getDirectoryTree } from "../items"
import db from "../../db"

const downloadSemaphore = new Semaphore(MAX_CONCURRENT_DOWNLOADS)
const downloadThreadsSemaphore = new Semaphore(MAX_DOWNLOAD_THREADS)
const writersSemaphore = new Semaphore(MAX_DOWNLOAD_WRITERS)

export const downloadFile = (item: ItemProps, streamToDisk: boolean = true): Promise<ItemProps | Uint8Array> => {
    return new Promise(async (resolve, reject) => {
        let currentWriteIndex = 0
        let paused = false
        let stopped = false
        let chunksConcatted: Uint8Array = new Uint8Array()

        if(streamToDisk){
            var stream = streamSaver.createWriteStream(item.name, {
                size: item.size
            })

            var writer = stream.getWriter()
        }

        const pauseListener = eventListener.on("pauseTransfer", (uuid: string) => {
            if(uuid == item.uuid){
                paused = true
            }
        })

        const resumeListener = eventListener.on("resumeTransfer", (uuid: string) => {
            if(uuid == item.uuid){
                paused = false
            }
        })

        const stopListener = eventListener.on("stopTransfer", (uuid: string) => {
            if(uuid == item.uuid){
                stopped = true
            }
        })

        const cleanup = (): void => {
            try{
                stopListener.remove()
                pauseListener.remove()
                resumeListener.remove()
                
                if(streamToDisk){
                    writer.close().catch(console.error)
                }
            }
            catch(e){
                console.error(e)
            }
        }

        const download = (index: number): Promise<{ index: number, chunk: Uint8Array }> => {
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

                const url = getDownloadServer() + "/" + item.region + "/" + item.bucket + "/" + item.uuid + "/" + index

                downloadAndDecryptChunk(item, url).then((chunk) => {
                    return resolve({
                        index,
                        chunk
                    })
                }).catch(reject)
            })
        }

        const write = (index: number, chunk: Uint8Array) => {
            if(index !== currentWriteIndex){
                return setTimeout(() => {
                    write(index, chunk)
                }, 10)
            }

            if(streamToDisk){
                writer.write(chunk).then(() => {
                    currentWriteIndex += 1

                    writersSemaphore.release()
                }).catch(() => {
                    cleanup()

                    eventListener.emit("download", {
                        type: "err",
                        err: "Stream error",
                        data: item
                    })

                    return reject(new Error("Stream error"))
                })
            }
            else{
                chunksConcatted = mergeUInt8Arrays(chunksConcatted, chunk)

                currentWriteIndex += 1

                writersSemaphore.release()
            }
        }

        eventListener.emit("download", {
            type: "started",
            data: item
        })

        try{
            await new Promise((resolve, reject) => {
                let done = 0

                for(let i = 0; i < item.chunks; i++){
                    Promise.all([
                        downloadThreadsSemaphore.acquire(),
                        writersSemaphore.acquire()
                    ]).then(() => {
                        if(stopped){
                            downloadThreadsSemaphore.release()
                            writersSemaphore.release()
                            
                            return reject("stopped")
                        }

                        download(i).then(({ index, chunk }) => {
                            if(stopped){
                                downloadThreadsSemaphore.release()
                                writersSemaphore.release()
                                
                                return reject("stopped")
                            }

                            write(index, chunk)

                            done += 1

                            downloadThreadsSemaphore.release()

                            if(done >= item.chunks){
                                return resolve(true)
                            }
                        }).catch((err) => {
                            downloadThreadsSemaphore.release()
                            writersSemaphore.release()

                            return reject(err)
                        })
                    })
                }
            })

            await new Promise((resolve) => {
                if(currentWriteIndex >= item.chunks){
                    return resolve(true)
                }

                const wait = setInterval(() => {
                    if(currentWriteIndex >= item.chunks){
                        clearInterval(wait)

                        return resolve(true)
                    }
                }, 10)
            })
        }
        catch(e: any){
            cleanup()

            eventListener.emit("download", {
                type: "err",
                err: e.toString(),
                data: item
            })

            console.error(e)

            return reject(e)
        }

        eventListener.emit("download", {
            type: "done",
            data: item
        })

        cleanup()

        if(streamToDisk){
            return resolve(item)
        }
        
        return resolve(chunksConcatted)
    })
}

export const queueFileDownload = (item: ItemProps, streamToDisk: boolean = true): Promise<ItemProps | Uint8Array> => {
    return new Promise(async (resolve, reject) => {
        eventListener.emit("download", {
            type: "start",
            data: item
        })

        await downloadSemaphore.acquire()

        downloadFile(item, streamToDisk).then((result) => {
            downloadSemaphore.release()

            return resolve(streamToDisk ? result as ItemProps : result as Uint8Array)
        }).catch((err) => {
            downloadSemaphore.release()

            console.error(err)

            return reject(err)
        })
    })
}

export const downloadMultipleFilesAsZipStream = (items: ItemProps[], paths: { [key: string]: string }): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const totalSize: number = items.reduce((prev, current) => prev + current.size, 0)
        const itemsToDownload: ItemProps[] = []

        if(totalSize <= 0 || items.length == 0){
            return reject(new Error("downloadMultipleFilesAsZipStream: File list empty"))
        }

        const readable: ReadableStream<any> = new ReadableStream({
            async start(controller){
                await new Promise(async (resolve) => {
                    let doneFiles: number = 0

                    for(let i = 0; i < items.length; i++){
                        const item: ItemProps = items[i]

                        itemsToDownload.push(item)

                        eventListener.emit("download", {
                            type: "start",
                            data: item
                        })

                        downloadSemaphore.acquire().then(() => {
                            controller.enqueue({
                                name: paths[item.uuid],
                                stream: () => new ReadableStream({
                                    async start(controller){
                                        let currentWriteIndex: number = 0
            
                                        const write = (index: number, chunk: Uint8Array) => {
                                            if(index !== currentWriteIndex){
                                                return setTimeout(() => {
                                                    write(index, chunk)
                                                }, 10)
                                            }
                                
                                            controller.enqueue(chunk)
            
                                            currentWriteIndex += 1
            
                                            writersSemaphore.release()
                                        }
            
                                        const download = (index: number): Promise<{ index: number, chunk: Uint8Array }> => {
                                            return new Promise(async (resolve, reject) => {
                                                const url = getDownloadServer() + "/" + item.region + "/" + item.bucket + "/" + item.uuid + "/" + index
                                
                                                downloadAndDecryptChunk(item, url).then((chunk) => {
                                                    return resolve({
                                                        index,
                                                        chunk
                                                    })
                                                }).catch(reject)
                                            })
                                        }

                                        eventListener.emit("download", {
                                            type: "started",
                                            data: item
                                        })
            
                                        try{
                                            await new Promise((resolve) => {
                                                let done: number = 0
                                
                                                for(let i = 0; i < item.chunks; i++){
                                                    Promise.all([
                                                        downloadThreadsSemaphore.acquire(),
                                                        writersSemaphore.acquire()
                                                    ]).then(() => {
                                                        download(i).then(({ index, chunk }) => {
                                                            write(index, chunk)
                                
                                                            done += 1
                
                                                            downloadThreadsSemaphore.release()
                                
                                                            if(done >= item.chunks){
                                                                return resolve(true)
                                                            }
                                                        }).catch((err) => {
                                                            downloadThreadsSemaphore.release()
                                                            writersSemaphore.release()
    
                                                            return reject(err)
                                                        })
                                                    })
                                                }
                                            })
                                
                                            await new Promise((resolve) => {
                                                if(currentWriteIndex >= item.chunks){
                                                    return resolve(true)
                                                }
                                
                                                const wait = setInterval(() => {
                                                    if(currentWriteIndex >= item.chunks){
                                                        clearInterval(wait)
                                
                                                        return resolve(true)
                                                    }
                                                }, 10)
                                            })
                                        }
                                        catch(e: any){
                                            eventListener.emit("download", {
                                                type: "err",
                                                err: e.toString(),
                                                data: item
                                            })

                                            throw e
                                        }

                                        eventListener.emit("download", {
                                            type: "done",
                                            data: item
                                        })

                                        doneFiles += 1

                                        downloadSemaphore.release()
            
                                        return controller.close()
                                    }
                                })
                            })
                        })
                    }

                    await new Promise((resolve) => {
                        if(doneFiles >= items.length){
                            return resolve(true)
                        }
        
                        const wait = setInterval(() => {
                            if(doneFiles >= items.length){
                                clearInterval(wait)
        
                                return resolve(true)
                            }
                        }, 10)
                    })

                    return resolve(true)
                })

                return controller.close()
            }
        })

        const stream = streamSaver.createWriteStream("Download_" + new Date().getTime() + ".zip", {
            size: totalSize
        })

        readable.pipeThrough(new ZIPWriter()).pipeTo(stream).then(() => {
            return resolve(true)
        }).catch((err) => {
            for(let i = 0; i < itemsToDownload.length; i++){
                eventListener.emit("download", {
                    type: "err",
                    data: itemsToDownload[i],
                    err: "Stream stopped"
                } as Download)
            }

            return reject(err)
        })
    })
}

export const normalDownload = async (selected: ItemProps[], loadCallback?: Function) => {
    const paths: { [key: string]: string } = {}
    const pathExists: { [key: string]: boolean } = {}

    const folderCount: number = selected.filter(item => item.type == "folder").length

    const userId = await db.get("userId")

    if(folderCount > 0){
        const zipItems: ItemProps[] = []

        for(let i = 0; i < selected.length; i++){
            if(selected[i].type == "file"){
                if(typeof pathExists[selected[i].name] == "undefined"){
                    pathExists[selected[i].name] = true
                    paths[selected[i].uuid] = selected[i].name

                    zipItems.push(selected[i])
                }
            }
            else{
                const folderItems = typeof selected[i].linkUUID == "string"
                                        ? await getDirectoryTree(selected[i].uuid, "linked", selected[i].linkUUID, selected[i].linkHasPassword, selected[i].linkPassword, selected[i].linkSalt, selected[i].linkKey)
                                        : await getDirectoryTree(selected[i].uuid, selected[i].receiverId == userId ? "shared" : "normal")

                for(let x = 0; x < folderItems.length; x++){
                    if(folderItems[x].item.type == "file" && typeof pathExists[folderItems[x].path] == "undefined"){
                        pathExists[folderItems[x].path] = true
                        paths[folderItems[x].item.uuid] = folderItems[x].path

                        zipItems.push(folderItems[x].item)
                    }
                }
            }
        }

        if(zipItems.length <= 0){
            return
        }

        if(typeof loadCallback == "function"){
            loadCallback(true)
        }

        downloadMultipleFilesAsZipStream(zipItems, paths).catch(console.error)
    }
    else{
        for(let i = 0; i < selected.length; i++){
            queueFileDownload(selected[i]).catch(console.error)
        }

        if(typeof loadCallback == "function"){
            loadCallback(true)
        }
    }
}

export const zipDownload = async (selected: ItemProps[], loadCallback?: Function) => {
    const paths: { [key: string]: string } = {}
    const pathExists: { [key: string]: boolean } = {}

    const folderCount: number = selected.filter(item => item.type == "folder").length

    const userId = await db.get("userId")

    if(folderCount > 0){
        const zipItems: ItemProps[] = []

        for(let i = 0; i < selected.length; i++){
            if(selected[i].type == "file"){
                if(typeof pathExists[selected[i].name] == "undefined"){
                    pathExists[selected[i].name] = true
                    paths[selected[i].uuid] = selected[i].name

                    zipItems.push(selected[i])
                }
            }
            else{
                const folderItems = typeof selected[i].linkUUID == "string"
                                        ? await getDirectoryTree(selected[i].uuid, "linked", selected[i].linkUUID, selected[i].linkHasPassword, selected[i].linkPassword, selected[i].linkSalt, selected[i].linkKey)
                                        : await getDirectoryTree(selected[i].uuid, selected[i].receiverId == userId ? "shared" : "normal")

                for(let x = 0; x < folderItems.length; x++){
                    if(folderItems[x].item.type == "file" && typeof pathExists[folderItems[x].path] == "undefined"){
                        pathExists[folderItems[x].path] = true
                        paths[folderItems[x].item.uuid] = folderItems[x].path

                        zipItems.push(folderItems[x].item)
                    }
                }
            }
        }

        if(typeof loadCallback == "function"){
            loadCallback(true)
        }

        if(zipItems.length <= 0){
            return
        }

        downloadMultipleFilesAsZipStream(zipItems, paths).catch(console.error)
    }
    else{
        for(let i = 0; i < selected.length; i++){
            paths[selected[i].uuid] = selected[i].name
        }

        downloadMultipleFilesAsZipStream(selected, paths).catch(console.error)

        if(typeof loadCallback == "function"){
            loadCallback(true)
        }
    }
}