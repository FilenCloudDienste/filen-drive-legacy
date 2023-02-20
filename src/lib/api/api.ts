import { apiRequest, encryptMetadataPublicKey, decryptFileMetadata, decryptFolderName, decryptFolderLinkKey, encryptMetadata, hashFn, deriveKeyFromPassword } from "../worker/worker.com"
import db from "../db"
import striptags from "striptags"
import { Semaphore, generateRandomString, convertArrayBufferToBinaryString, getAPIServer } from "../helpers"
import type { ItemProps, UserInfoV1, FolderColors, UserGetSettingsV1, UserGetAccountV1, UserEvent, LinkGetInfoV1, LinkHasPasswordV1, LinkDirInfoV1, LinkDirContentV1, PaymentMethods } from "../../types"
import eventListener from "../eventListener"
import { getDirectoryTree } from "../services/items"
import { v4 as uuidv4 } from "uuid"
import { FileVersionsV1, ICFG } from "../../types"
import axios from "axios"

const createFolderSemaphore = new Semaphore(1)
const fetchFolderSizeSemaphore = new Semaphore(8192)
const shareItemsSemaphore = new Semaphore(10)
const linkItemsSemaphore = new Semaphore(10)

export const getCfg = async (): Promise<ICFG> => {
    const response = await axios.get("https://cdn.filen.io/cfg.json?noCache=" + new Date().getTime())

    if(response.status !== 200){
        throw new Error("Could not load CFG from CDN")
    }

    return response.data
}

export const authInfo = ({ email }: { email: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/auth/info",
            data: {
                email
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const login = ({ email, password, twoFactorCode, authVersion }: { email: string, password: string, twoFactorCode: string | number, authVersion: number }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/login",
            data: {
                email,
                password,
                twoFactorKey: twoFactorCode,
                authVersion
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const userInfo = (apiKey: string | undefined = undefined): Promise<UserInfoV1> => {
    return new Promise(async (resolve, reject) => {
        if(typeof apiKey == "undefined"){
            try{
                apiKey = await db.get("apiKey")
            }
            catch(e){
                return reject(e)
            }
        }

        apiRequest({
            method: "POST",
            endpoint: "/v1/user/info",
            data: {
                apiKey
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const baseFolders = (apiKey: string | undefined = undefined): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        if(typeof apiKey == "undefined"){
            try{
                apiKey = await db.get("apiKey")
            }
            catch(e){
                return reject(e)
            }
        }

        apiRequest({
            method: "POST",
            endpoint: "/v1/user/baseFolders",
            data: {
                apiKey,
                includeDefault: "true"
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const folderContent = ({ apiKey, uuid, foldersOnly = false }: { apiKey: string, uuid: string, foldersOnly?: boolean }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/content",
            data: {
                apiKey,
                app: "true",
                folders: JSON.stringify(["default"]),
                page: 1,
                uuid,
                foldersOnly: foldersOnly ? "true" : "false"
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const sharedInContent = ({ apiKey, uuid }: { apiKey: string, uuid: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/shared/in",
            data: {
                apiKey,
                app: "true",
                folders: JSON.stringify(["shared-in"]),
                page: 1,
                uuid
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const sharedOutContent = ({ apiKey, uuid }: { apiKey: string, uuid: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/shared/out",
            data: {
                apiKey,
                app: "true",
                folders: JSON.stringify(["shared-out"]),
                page: 1,
                receiverId: window.currentReceiverId,
                uuid
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const recentContent = ({ apiKey }: { apiKey: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/recent",
            data: {
                apiKey
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const markUploadAsDone = ({ uuid, uploadKey }: { uuid: string, uploadKey: string }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const max = 32
        let current = 0
        const timeout = 1000

        const req = () => {
            if(current > max){
                return reject(new Error("Could not mark upload " + uuid + " as done, max tries reached"))
            }

            current += 1

            apiRequest({
                method: "POST",
                endpoint: "/v1/upload/done",
                data: {
                    uuid,
                    uploadKey
                }
            }).then((response) => {
                if(!response.status){
                    if(
                        response.message.toString().toLowerCase().indexOf("chunks are not matching") !== -1
                        || response.message.toString().toLowerCase().indexOf("done yet") !== -1
                        || response.message.toString().toLowerCase().indexOf("finished yet") !== -1
                        || response.message.toString().toLowerCase().indexOf("chunks not found") !== -1
                    ){
                        return setTimeout(req, timeout)
                    }

                    return reject(response.message)
                }

                eventListener.emit("uploadMarkedDone", {
                    uuid
                })
    
                return resolve(true)
            }).catch(reject)
        }

        req()
    })
}

export const getFolderContents = ({ uuid, type = "normal", linkUUID = undefined, linkHasPassword = undefined, linkPassword = undefined, linkSalt = undefined }: { uuid: string, type?: "normal" | "shared" | "linked", linkUUID?: string | undefined, linkHasPassword?: boolean | undefined, linkPassword?: string | undefined, linkSalt?: string | undefined }): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then(async (apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: type == "shared" ? "/v1/download/dir/shared" : type == "linked" ? "/v1/download/dir/link" : "/v1/download/dir",
                data: type == "shared" ? {
                    apiKey,
                    uuid
                } : type == "linked" ? {
                    uuid: linkUUID,
                    parent: uuid,
                    password: linkHasPassword && linkSalt && linkPassword ? (linkSalt.length == 32 ? (await deriveKeyFromPassword(linkPassword, linkSalt, 200000, "SHA-512", 512, true) as string) : (await hashFn(linkPassword.length == 0 ? "empty" : linkPassword))) : (await hashFn("empty"))
                } : {
                    apiKey,
                    uuid
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(response.data)
            }).catch(reject)
        }).catch(reject)
    })
}

export const isSharingFolder = ({ uuid }: { uuid: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/share/dir/status",
                data: {
                    apiKey,
                    uuid
                }
            }).then((response: any) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve({
                    sharing: (response.data.sharing ? true : false),
                    users: response.data.users
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const isPublicLinkingFolder = ({ uuid }: {uuid: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/link/dir/status",
                data: {
                    apiKey,
                    uuid
                }
            }).then((response: any) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve({
                    linking: (response.data.link ? true : false),
                    links: response.data.links
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const addItemToPublicLink = ({ data }: { data: any }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/link/add",
            data
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(true)
        }).catch(reject)
    })
}

export const shareItem = ({ data }: { data: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/share",
            data
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(true)
        }).catch(reject)
    })
}

export const isSharingItem = ({ uuid }: { uuid: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/item/status",
                data: {
                    apiKey,
                    uuid
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve({
                    sharing: (response.data.sharing ? true : false),
                    users: response.data.users
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const isItemInPublicLink = ({ uuid }: { uuid: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/link/dir/item/status",
                data: {
                    apiKey,
                    uuid
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve({
                    linking: (response.data.link ? true : false),
                    links: response.data.links
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const renameItemInPublicLink = ({ data }: { data: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/link/dir/item/rename",
            data
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(true)
        }).catch(reject)
    })
}

export const renameSharedItem = ({ data }: { data: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/shared/item/rename",
            data
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(true)
        }).catch(reject)
    })
}

export const checkIfItemParentIsShared = ({ type, parent, metaData }: { type: string, parent: string, metaData: any }): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            db.get("masterKeys").then((masterKeys) => {
                let shareCheckDone = false
                let linkCheckDone = false
                let resolved = false
                let doneInterval: any = undefined

                const done = () => {
                    if(shareCheckDone && linkCheckDone){
                        clearInterval(doneInterval)

                        if(!resolved){
                            resolved = true

                            resolve(true)
                        }

                        return true
                    }

                    return false
                }

                doneInterval = setInterval(done, 100)

                isSharingFolder({ uuid: parent }).then((data: any) => {
                    if(!data.sharing){
                        shareCheckDone = true

                        return done()
                    }

                    const totalUsers = data.users.length

                    if(type == "file"){
                        let doneUsers = 0

                        const doneSharing = () => {
                            doneUsers += 1

                            if(doneUsers >= totalUsers){
                                shareCheckDone = true

                                done()
                            }

                            return true
                        }

                        for(let i = 0; i < totalUsers; i++){
                            const user = data.users[i]
                            const itemMetadata = JSON.stringify({
                                name: metaData.name,
                                size: metaData.size,
                                mime: metaData.mime,
                                key: metaData.key,
                                lastModified: metaData.lastModified
                            })

                            encryptMetadataPublicKey(itemMetadata, user.publicKey).then((encrypted) => {
                                shareItem({
                                    data: {
                                        apiKey,
                                        uuid: metaData.uuid,
                                        parent,
                                        email: user.email,
                                        type,
                                        metadata: encrypted
                                    }
                                }).then(() => {
                                    return doneSharing()
                                }).catch((err) => {
                                    console.log(err)
            
                                    return doneSharing()
                                })
                            }).catch((err) => {
                                console.log(err)
            
                                return doneSharing()
                            })
                        }
                    }
                    else{
                        getFolderContents({ uuid: metaData.uuid }).then(async (contents: any) => {
                            const itemsToShare = []

                            itemsToShare.push({
                                uuid: metaData.uuid,
                                parent,
                                metadata: metaData.name,
                                type: "folder"
                            })

                            const files = contents.files
                            const folders = contents.folders

                            for(let i = 0; i < files.length; i++){
                                const decrypted = await decryptFileMetadata(files[i].metadata, masterKeys)

                                if(typeof decrypted == "object"){
                                    if(typeof decrypted.name == "string"){
                                        decrypted.name = striptags(decrypted.name)

                                        if(decrypted.name.length > 0){
                                            itemsToShare.push({
                                                uuid: files[i].uuid,
                                                parent: files[i].parent,
                                                metadata: {
                                                    name: decrypted.name,
                                                    size: decrypted.size,
                                                    mime: striptags(decrypted.mime),
                                                    key: decrypted.key,
                                                    lastModified: decrypted.lastModified
                                                },
                                                type: "file"
                                            })
                                        }
                                    }
                                }
                            }

                            for(let i = 0; i < folders.length; i++){
                                const decrypted = striptags(await decryptFolderName(folders[i].name, masterKeys))

                                if(typeof decrypted == "string"){
                                    if(decrypted.length > 0){
                                        if(folders[i].uuid !== metaData.uuid && folders[i].parent !== "base"){
                                            itemsToShare.push({
                                                uuid: folders[i].uuid,
                                                parent: (i == 0 ? "none" : folders[i].parent),
                                                metadata: decrypted,
                                                type: "folder"
                                            })
                                        }
                                    }
                                }
                            }

                            let itemsShared = 0

                            const doneSharingItem = () => {
                                itemsShared += 1

                                if(itemsShared >= (itemsToShare.length * totalUsers)){
                                    shareCheckDone = true

                                    done()
                                }

                                return true
                            }

                            for(let i = 0; i < itemsToShare.length; i++){
                                const itemToShare = itemsToShare[i]

                                for(let x = 0; x < totalUsers; x++){
                                    const user = data.users[x]
                                    let itemMetadata = ""

                                    if(itemToShare.type == "file"){
                                        itemMetadata = JSON.stringify({
                                            name: itemToShare.metadata.name,
                                            size: itemToShare.metadata.size,
                                            mime: itemToShare.metadata.mime,
                                            key: itemToShare.metadata.key,
                                            lastModified: itemToShare.metadata.lastModified
                                        })
                                    }
                                    else{
                                        itemMetadata = JSON.stringify({
                                            name: itemToShare.metadata
                                        })
                                    }

                                    encryptMetadataPublicKey(itemMetadata, user.publicKey).then((encrypted) => {
                                        shareItem({
                                            data: {
                                                apiKey,
                                                uuid: itemToShare.uuid,
                                                parent: itemToShare.parent,
                                                email: user.email,
                                                type: itemToShare.type,
                                                metadata: encrypted
                                            }
                                        }).then(() => {
                                            return doneSharingItem()
                                        }).catch((err) => {
                                            console.log(err)
                    
                                            return doneSharingItem()
                                        })
                                    }).catch((err) => {
                                        console.log(err)
                    
                                        return doneSharingItem()
                                    })
                                }
                            }
                        }).catch((err) => {
                            console.log(err)

                            shareCheckDone = true

                            return done()
                        })
                    }
                }).catch((err) => {
                    console.log(err)

                    shareCheckDone = true

                    return done()
                })

                isPublicLinkingFolder({ uuid: parent }).then(async (data: any) => {
                    if(!data.linking){
                        linkCheckDone = true

                        return done()
                    }

                    const totalLinks = data.links.length

                    if(type == "file"){
                        let linksDone = 0

                        const doneLinking = () => {
                            linksDone += 1

                            if(linksDone >= totalLinks){
                                linkCheckDone = true

                                done()
                            }

                            return true
                        }

                        for(let i = 0; i < totalLinks; i++){
                            const link = data.links[i]

                            try{
                                var key: any = await decryptFolderLinkKey(link.linkKey, masterKeys)
                            }
                            catch(e){
                                //console.log(e)
                            }

                            if(typeof key == "string"){
                                if(key.length > 0){
                                    try{
                                        var encrypted: any = await encryptMetadata(JSON.stringify({
                                            name: metaData.name,
                                            size: metaData.size,
                                            mime: metaData.mime,
                                            key: metaData.key,
                                            lastModified: metaData.lastModified
                                        }), key)
                                    }
                                    catch(e){
                                        //console.log(e)
                                    }

                                    if(typeof encrypted == "string"){
                                        if(encrypted.length > 0){
                                            addItemToPublicLink({
                                                data: {
                                                    apiKey,
                                                    uuid: metaData.uuid,
                                                    parent,
                                                    linkUUID: link.linkUUID,
                                                    type,
                                                    metadata: encrypted,
                                                    key: link.linkKey,
                                                    expiration: "never",
                                                    password: "empty",
                                                    passwordHashed: "8f83dfba6522ce8c34c5afefa64878e3a4ac554d", //hashFn("empty")
                                                    downloadBtn: "enable"
                                                }
                                            }).then(() => {
                                                return doneLinking()
                                            }).catch((err) => {
                                                console.log(err)

                                                return doneLinking()
                                            })
                                        }
                                        else{
                                            doneLinking()
                                        }
                                    }
                                    else{
                                        doneLinking()
                                    }
                                }
                                else{
                                    doneLinking()
                                }
                            }
                            else{
                                doneLinking()
                            }
                        }
                    }
                    else{
                        getFolderContents({ uuid: metaData.uuid }).then(async (contents: any) => {
                            const itemsToLink = []

                            itemsToLink.push({
                                uuid: metaData.uuid,
                                parent,
                                metadata: metaData.name,
                                type: "folder"
                            })

                            const files = contents.files
                            const folders = contents.folders

                            for(let i = 0; i < files.length; i++){
                                const decrypted = await decryptFileMetadata(files[i].metadata, masterKeys)

                                if(typeof decrypted == "object"){
                                    if(typeof decrypted.name == "string"){
                                        decrypted.name = striptags(decrypted.name)

                                        if(decrypted.name.length > 0){
                                            itemsToLink.push({
                                                uuid: files[i].uuid,
                                                parent: files[i].parent,
                                                metadata: {
                                                    name: decrypted.name,
                                                    size: decrypted.size,
                                                    mime: striptags(decrypted.mime),
                                                    key: decrypted.key,
                                                    lastModified: decrypted.lastModified
                                                },
                                                type: "file"
                                            })
                                        }
                                    }
                                }
                            }

                            for(let i = 0; i < folders.length; i++){
                                try{
                                    var decrypted: any = striptags(await decryptFolderName(folders[i].name, masterKeys))
                                }
                                catch(e){
                                    //console.log(e)
                                }

                                if(typeof decrypted == "string"){
                                    if(decrypted.length > 0){
                                        if(folders[i].uuid !== metaData.uuid && folders[i].parent !== "base"){
                                            itemsToLink.push({
                                                uuid: folders[i].uuid,
                                                parent: (i == 0 ? "none" : folders[i].parent),
                                                metadata: decrypted,
                                                type: "folder"
                                            })
                                        }
                                    }
                                }
                            }

                            let itemsLinked = 0

                            const itemLinked = () => {
                                itemsLinked += 1

                                if(itemsLinked >= (itemsToLink.length * totalLinks)){
                                    linkCheckDone = true

                                    done()
                                }

                                return true
                            }

                            for(let i = 0; i < itemsToLink.length; i++){
                                const itemToLink = itemsToLink[i]

                                for(let x = 0; x < totalLinks; x++){
                                    const link = data.links[x]

                                    try{
                                        var key: any = await decryptFolderLinkKey(link.linkKey, masterKeys)
                                    }
                                    catch(e){
                                        //console.log(e)
                                    }

                                    if(typeof key == "string"){
                                        if(key.length > 0){
                                            let itemMetadata = ""

                                            if(itemToLink.type == "file"){
                                                itemMetadata = JSON.stringify({
                                                    name: itemToLink.metadata.name,
                                                    size: itemToLink.metadata.size,
                                                    mime: itemToLink.metadata.mime,
                                                    key: itemToLink.metadata.key,
                                                    lastModified: itemToLink.metadata.lastModified
                                                })
                                            }
                                            else{
                                                itemMetadata = JSON.stringify({
                                                    name: itemToLink.metadata
                                                })
                                            }

                                            try{
                                                var encrypted: any = await encryptMetadata(itemMetadata, key)
                                            }
                                            catch(e){
                                                //console.log(e)
                                            }

                                            if(typeof encrypted == "string"){
                                                if(encrypted.length > 0){
                                                    addItemToPublicLink({
                                                        data: {
                                                            apiKey,
                                                            uuid: itemToLink.uuid,
                                                            parent: itemToLink.parent,
                                                            linkUUID: link.linkUUID,
                                                            type: itemToLink.type,
                                                            metadata: encrypted,
                                                            key: link.linkKey,
                                                            expiration: "never",
                                                            password: "empty",
                                                            passwordHashed: "8f83dfba6522ce8c34c5afefa64878e3a4ac554d", //hashFn("empty")
                                                            downloadBtn: "enable"
                                                        }
                                                    }).then(() => {
                                                        return itemLinked()
                                                    }).catch((err) => {
                                                        console.log(err)

                                                        return itemLinked()
                                                    })
                                                }
                                                else{
                                                    itemLinked()
                                                }
                                            }
                                            else{
                                                itemLinked()
                                            }
                                        }
                                        else{
                                            itemLinked()
                                        }
                                    }
                                    else{
                                        itemLinked()
                                    }
                                }
                            }
                        }).catch((err) => {
                            console.log(err)

                            linkCheckDone = true

                            return done()
                        })
                    }
                }).catch((err) => {
                    console.log(err)

                    linkCheckDone = true

                    return done()
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const checkIfItemIsSharedForRename = ({ type, uuid, metaData }: { type: string, uuid: string, metaData: any }): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            db.get("masterKeys").then((masterKeys) => {
                let shareCheckDone = false
                let linkCheckDone = false
                let resolved = false
                let doneInterval: any = undefined

                const done = () => {
                    if(shareCheckDone && linkCheckDone){
                        clearInterval(doneInterval)

                        if(!resolved){
                            resolved = true

                            resolve(true)
                        }

                        return true
                    }

                    return false
                }

                doneInterval = setInterval(done, 100)

                isSharingItem({ uuid }).then((data: any) => {
                    if(!data.sharing){
                        shareCheckDone = true

                        return done()
                    }

                    const totalUsers = data.users.length
                    let doneUsers = 0

                    const doneSharing = () => {
                        doneUsers += 1

                        if(doneUsers >= totalUsers){
                            shareCheckDone = true

                            done()
                        }

                        return true
                    }

                    for(let i = 0; i < totalUsers; i++){
                        const user = data.users[i]
                        let itemMetadata = ""

                        if(type == "file"){
                            itemMetadata = JSON.stringify({
                                name: metaData.name,
                                size: metaData.size,
                                mime: metaData.mime,
                                key: metaData.key,
                                lastModified: metaData.lastModified
                            })
                        }
                        else{
                            itemMetadata = JSON.stringify({
                                name: metaData.name
                            })
                        }

                        encryptMetadataPublicKey(itemMetadata, user.publicKey).then((encrypted) => {
                            renameSharedItem({
                                data: {
                                    apiKey,
                                    uuid,
                                    receiverId: user.id,
                                    metadata: encrypted
                                }
                            }).then(() => {
                                return doneSharing()
                            }).catch((err) => {
                                console.log(err)

                                return doneSharing()
                            })
                        }).catch((err) => {
                            console.log(err)

                            return doneSharing()
                        })
                    }
                }).catch((err) => {
                    console.log(err)

                    shareCheckDone = true

                    return done()
                })

                isItemInPublicLink({ uuid }).then((data: any) => {
                    if(!data.linking){
                        linkCheckDone = true

                        return done()
                    }

                    const totalLinks = data.links.length
                    let linksDone = 0

                    const doneLinking = () => {
                        linksDone += 1

                        if(linksDone >= totalLinks){
                            linkCheckDone = true

                            done()
                        }

                        return true
                    }

                    for(let i = 0; i < totalLinks; i++){
                        const link = data.links[i]

                        decryptFolderLinkKey(link.linkKey, masterKeys).then((key) => {
                            let itemMetadata = ""

                            if(type == "file"){
                                itemMetadata = JSON.stringify({
                                    name: metaData.name,
                                    size: metaData.size,
                                    mime: metaData.mime,
                                    key: metaData.key,
                                    lastModified: metaData.lastModified
                                })
                            }
                            else{
                                itemMetadata = JSON.stringify({
                                    name: metaData.name
                                })
                            }

                            encryptMetadata(itemMetadata, key).then((encrypted) => {
                                renameItemInPublicLink({
                                    data: {
                                        apiKey,
                                        uuid,
                                        linkUUID: link.linkUUID,
                                        metadata: encrypted
                                    }
                                }).then(() => {
                                    return doneLinking()
                                }).catch((err) => {
                                    console.log(err)

                                    return doneLinking()
                                })
                            }).catch((err) => {
                                console.log(err)

                                return doneLinking()
                            })
                        }).catch((err) => {
                            console.log(err)

                            return doneLinking()
                        })
                    }
                }).catch((err) => {
                    console.log(err)

                    linkCheckDone = true

                    return done()
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const folderExists = ({ name, parent }: { name: string, parent: string }): Promise<{ exists: boolean, existsUUID: string }> => {
    return new Promise((resolve, reject) => {
        Promise.all([
            db.get("apiKey"),
            hashFn(name.toLowerCase())
        ]).then(([apiKey, nameHashed]) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/exists",
                data: {
                    apiKey,
                    parent,
                    nameHashed
                }
            }).then((response: any) => {
                if(!response.status){
                    return reject(response.message)
                }

                return resolve({
                    exists: (response.data.exists ? true : false),
                    existsUUID: response.data.uuid
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const fileExists = ({ name, parent }: { name: string, parent: string }): Promise<{ exists: boolean, existsUUID: string }> => {
    return new Promise((resolve, reject) => {
        Promise.all([
            db.get("apiKey"),
            hashFn(name.toLowerCase())
        ]).then(([apiKey, nameHashed]) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/file/exists",
                data: {
                    apiKey,
                    parent,
                    nameHashed
                }
            }).then((response: any) => {
                if(!response.status){
                    return reject(response.message)
                }

                return resolve({
                    exists: (response.data.exists ? true : false),
                    existsUUID: response.data.uuid
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const createFolder = ({ uuid, name, parent, emitEvents = true }: { uuid: string, name: string, parent: string, emitEvents?: boolean }): Promise<any> => {
    return new Promise((resolve, reject) => {
        if(emitEvents){
            eventListener.emit("createFolder", {
                type: "start",
                data: {
                    uuid,
                    name,
                    parent
                }
            })
        }

        createFolderSemaphore.acquire().then(() => {
            Promise.all([
                db.get("apiKey"),
                db.get("masterKeys"),
                hashFn(name.toLowerCase())
            ]).then(([apiKey, masterKeys, nameHashed]) => {
                encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1]).then((encrypted) => {
                    apiRequest({
                        method: "POST",
                        endpoint: "/v1/dir/sub/create",
                        data: {
                            apiKey,
                            uuid,
                            name: encrypted,
                            nameHashed,
                            parent
                        }
                    }).then((response: any) => {
                        if(!response.status){
                            createFolderSemaphore.release()

                            if(typeof response.data !== "undefined"){
                                if(typeof response.data.existsUUID !== "undefined"){
                                    if(emitEvents){
                                        eventListener.emit("createFolder", {
                                            type: "done",
                                            data: {
                                                uuid,
                                                name,
                                                parent
                                            }
                                        })
                                    }

                                    eventListener.emit("folderCreated", {
                                        uuid: response.data.existsUUID,
                                        name,
                                        parent
                                    })

                                    return resolve(response.data.existsUUID)
                                }
                            }

                            if(emitEvents){
                                eventListener.emit("createFolder", {
                                    type: "err",
                                    data: {
                                        uuid,
                                        name,
                                        parent
                                    },
                                    err: response.message
                                })
                            }

                            return reject(response.message)
                        }
        
                        checkIfItemParentIsShared({
                            type: "folder",
                            parent,
                            metaData: {
                                uuid,
                                name
                            }
                        }).then(() => {
                            createFolderSemaphore.release()

                            if(emitEvents){
                                eventListener.emit("createFolder", {
                                    type: "done",
                                    data: {
                                        uuid,
                                        name,
                                        parent
                                    }
                                })
                            }

                            eventListener.emit("folderCreated", {
                                uuid,
                                name,
                                parent
                            })

                            return resolve(uuid)
                        }).catch((err) => {
                            createFolderSemaphore.release()

                            if(emitEvents){
                                eventListener.emit("createFolder", {
                                    type: "err",
                                    data: {
                                        uuid,
                                        name,
                                        parent
                                    },
                                    err: err.toString()
                                })
                            }

                            return reject(err)
                        })
                    }).catch((err) => {
                        createFolderSemaphore.release()

                        if(emitEvents){
                            eventListener.emit("createFolder", {
                                type: "err",
                                data: {
                                    uuid,
                                    name,
                                    parent
                                },
                                err: err.toString()
                            })
                        }

                        return reject(err)
                    })
                }).catch((err) => {
                    createFolderSemaphore.release()

                    if(emitEvents){
                        eventListener.emit("createFolder", {
                            type: "err",
                            data: {
                                uuid,
                                name,
                                parent
                            },
                            err: err.toString()
                        })
                    }

                    return reject(err)
                })
            }).catch((err) => {
                createFolderSemaphore.release()

                if(emitEvents){
                    eventListener.emit("createFolder", {
                        type: "err",
                        data: {
                            uuid,
                            name,
                            parent
                        },
                        err: err.toString()
                    })
                }

                return reject(err)
            })
        }).catch((err) => {
            if(emitEvents){
                eventListener.emit("createFolder", {
                    type: "err",
                    data: {
                        uuid,
                        name,
                        parent
                    },
                    err: err.toString()
                })
            }

            return reject(err)
        })
    })
}

export const folderPresent = ({ apiKey, uuid }: { apiKey: string, uuid: string }): Promise<any> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/present",
            data: {
                apiKey,
                uuid
            }
        }).then((response: any) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const trashItem = (item: ItemProps): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: item.type == "folder" ? "/v1/dir/trash" : "/v1/file/trash",
                data: {
                    apiKey,
                    uuid: item.uuid
                }
            }).then((response) => {
                if(!response.status){
                    if(
                        response.message.toString().toLowerCase().indexOf("already") !== -1
                        || response.message.toString().toLowerCase().indexOf("does not exist") !== -1
                        || (response.message.toString().toLowerCase().indexOf("not found") !== -1 && response.message.toString().toLowerCase().indexOf("api") == -1)
                    ){
                        eventListener.emit("itemTrashed", {
                            item
                        })

                        return resolve(true)
                    }

                    return reject(response.message)
                }

                eventListener.emit("itemTrashed", {
                    item
                })
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const moveFile = ({ file, parent, emitEvents = true }: { file: ItemProps, parent: string, emitEvents?: boolean }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/file/move",
                data: {
                    apiKey,
                    fileUUID: file.uuid,
                    folderUUID: parent
                }
            }).then((response) => {
                if(!response.status){
                    if(
                        response.message.toString().toLowerCase().indexOf("already") !== -1
                        || response.message.toString().toLowerCase().indexOf("does not exist") !== -1
                        || (response.message.toString().toLowerCase().indexOf("not found") !== -1 && response.message.toString().toLowerCase().indexOf("api") == -1)
                    ){
                        if(emitEvents){
                            eventListener.emit("itemMoved", {
                                item: file,
                                from: file.parent,
                                to: parent
                            })
                        }

                        return resolve(true)
                    }

                    return reject(response.message)
                }
    
                checkIfItemParentIsShared({
                    type: "file",
                    parent,
                    metaData: {
                        uuid: file.uuid,
                        name: file.name,
                        size: file.size,
                        mime: file.mime,
                        key: file.key,
                        lastModified: file.lastModified
                    }
                }).then(() => {
                    if(emitEvents){
                        eventListener.emit("itemMoved", {
                            item: file,
                            from: file.parent,
                            to: parent
                        })
                    }

                    return resolve(true)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const moveFolder = ({ folder, parent, emitEvents = true }: { folder: ItemProps, parent: string, emitEvents?: boolean }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/move",
                data: {
                    apiKey,
                    uuid: folder.uuid,
                    folderUUID: parent
                }
            }).then((response) => {
                if(!response.status){
                    if(
                        response.message.toString().toLowerCase().indexOf("already") !== -1
                        || response.message.toString().toLowerCase().indexOf("does not exist") !== -1
                        || response.message.toString().toLowerCase().indexOf("not found") !== -1
                    ){
                        if(emitEvents){
                            eventListener.emit("itemMoved", {
                                item: folder,
                                from: folder.parent,
                                to: parent
                            })
                        }

                        return resolve(true)
                    }

                    return reject(response.message)
                }
    
                checkIfItemParentIsShared({
                    type: "folder",
                    parent,
                    metaData: {
                        name: folder.name,
                        uuid: folder.uuid
                    }
                }).then(() => {
                    if(emitEvents){
                        eventListener.emit("itemMoved", {
                            item: folder,
                            from: folder.parent,
                            to: parent
                        })
                    }

                    return resolve(true)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const renameFile = ({ file, name }: { file: ItemProps, name: string }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        Promise.all([
            db.get("apiKey"),
            db.get("masterKeys"),
            hashFn(name.toLowerCase())
        ]).then(([apiKey, masterKeys, nameHashed]) => {
            Promise.all([
                encryptMetadata(JSON.stringify({
                    name,
                    size: file.size,
                    mime: file.mime,
                    key: file.key,
                    lastModified: file.lastModified
                }), masterKeys[masterKeys.length - 1]),
                encryptMetadata(name, file.key)
            ]).then(([encrypted, encryptedName]) => {
                apiRequest({
                    method: "POST",
                    endpoint: "/v1/file/rename",
                    data: {
                        apiKey,
                        uuid: file.uuid,
                        name: encryptedName,
                        nameHashed,
                        metaData: encrypted
                    }
                }).then((response) => {
                    if(!response.status){
                        if(
                            response.message.toString().toLowerCase().indexOf("already") !== -1
                            || response.message.toString().toLowerCase().indexOf("does not exist") !== -1
                            || (response.message.toString().toLowerCase().indexOf("not found") !== -1 && response.message.toString().toLowerCase().indexOf("api") == -1)
                        ){
                            return resolve(true)
                        }

                        eventListener.emit("fileRenamed", {
                            item: file,
                            to: name
                        })

                        return reject(response.message)
                    }
        
                    checkIfItemIsSharedForRename({
                        type: "file",
                        uuid: file.uuid,
                        metaData: {
                            name,
                            size: file.size,
                            mime: file.mime,
                            key: file.key,
                            lastModified: file.lastModified
                        }
                    }).then(() => {
                        eventListener.emit("fileRenamed", {
                            item: file,
                            to: name
                        })

                        return resolve(true)
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const renameFolder = ({ folder, name }: { folder: ItemProps, name: string }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        Promise.all([
            db.get("apiKey"),
            db.get("masterKeys"),
            hashFn(name.toLowerCase())
        ]).then(([apiKey, masterKeys, nameHashed]) => {
            encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1]).then((encrypted) => {
                apiRequest({
                    method: "POST",
                    endpoint: "/v1/dir/rename",
                    data: {
                        apiKey,
                        uuid: folder.uuid,
                        name: encrypted,
                        nameHashed
                    }
                }).then((response) => {
                    if(!response.status){
                        if(
                            response.message.toString().toLowerCase().indexOf("already") !== -1
                            || response.message.toString().toLowerCase().indexOf("does not exist") !== -1
                            || (response.message.toString().toLowerCase().indexOf("not found") !== -1 && response.message.toString().toLowerCase().indexOf("api") == -1)
                        ){
                            eventListener.emit("folderRenamed", {
                                item: folder,
                                to: name
                            })

                            return resolve(true)
                        }
                        
                        return reject(response.message)
                    }
        
                    checkIfItemIsSharedForRename({
                        type: "folder",
                        uuid: folder.uuid,
                        metaData: {
                            name
                        }
                    }).then(() => {
                        eventListener.emit("folderRenamed", {
                            item: folder,
                            to: name
                        })

                        return resolve(true)
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const fetchFolderSize = (item: ItemProps, href: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        fetchFolderSizeSemaphore.acquire().then(() => {
            db.get("apiKey").then((apiKey) => {
                let payload: {
                    apiKey?: string,
                    uuid?: string,
                    sharerId?: number,
                    receiverId?: number,
                    trash?: number,
                    linkUUID?: string
                } = {}

                try{
                    if(href.indexOf("shared-out") !== -1){
                        payload = {
                            apiKey,
                            uuid: item.uuid,
                            sharerId: item.sharerId || 0,
                            receiverId: item.receiverId || 0
                        }
                    }
                    else if(href.indexOf("shared-in") !== -1){
                        payload = {
                            apiKey,
                            uuid: item.uuid,
                            sharerId: item.sharerId || 0,
                            receiverId: item.receiverId || 0
                        }
                    }
                    else if(href.indexOf("trash") !== -1){
                        payload = {
                            apiKey,
                            uuid: item.uuid,
                            sharerId: 0,
                            receiverId: 0,
                            trash: 1
                        }
                    }
                    else if(href.indexOf("/f/") !== -1){
                        payload = {
                            linkUUID: href.split("/f/")[1].split("#")[0],
                            uuid: item.uuid
                        }
                    }
                    else{
                        payload = {
                            apiKey,
                            uuid: item.uuid,
                            sharerId: 0,
                            receiverId: 0
                        }
                    }
                }
                catch(e){
                    fetchFolderSizeSemaphore.release()

                    return reject(e)
                }

                apiRequest({
                    method: "POST",
                    endpoint: "/v1/dir/size" + (href.indexOf("/f/") !== -1 ? "/link" : ""),
                    data: payload
                }).then((response) => {
                    fetchFolderSizeSemaphore.release()

                    if(!response.status){
                        return reject(response.message)
                    }

                    return resolve(response.data.size)
                }).catch((err) => {
                    fetchFolderSizeSemaphore.release()

                    return reject(err)
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const favoriteItem = ({ item, favorite, emitEvents = true }: { item: ItemProps, favorite: number, emitEvents?: boolean }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/item/favorite",
                data: {
                    apiKey,
                    uuid: item.uuid,
                    type: item.type,
                    value: favorite
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                if(emitEvents){
                    eventListener.emit("itemFavorited", {
                        item,
                        favorited: favorite
                    })
                }
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const emptyTrash = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/trash/empty",
                data: {
                    apiKey
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                eventListener.emit("trashEmptied")
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const deleteItemPermanently = (item: ItemProps): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: item.type == "folder" ? "/v1/dir/delete/permanent" : "/v1/file/delete/permanent",
                data: {
                    apiKey,
                    uuid: item.uuid
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }

                eventListener.emit("itemDeletedPermanently", {
                    item
                })
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const restoreItem = (item: ItemProps): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: item.type == "folder" ? "/v1/dir/restore" : "/v1/file/restore",
                data: {
                    apiKey,
                    uuid: item.uuid
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }

                eventListener.emit("itemRestored", {
                    item
                })
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const restoreArchivedFile = ({ uuid, currentUUID }: { uuid: string, currentUUID: string }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/file/archive/restore",
                data: {
                    apiKey,
                    uuid,
                    currentUUID
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const shareItemsToUser = async ({ items, email, publicKey, progressCallback }: { items: ItemProps[], email: string, publicKey: string, progressCallback?: (current: number, total: number) => any }): Promise<boolean> => {
    const apiKey = await db.get("apiKey")
    const encryptPromises = []
    const itemsToShare: { item: ItemProps, encrypted: string }[] = []

    for(let i = 0; i < items.length; i++){
        const item = items[i]

        encryptPromises.push(new Promise(async (resolve, reject) => {
            await shareItemsSemaphore.acquire()

            if(item.type == "file"){
                encryptMetadataPublicKey(JSON.stringify({
                    name: item.name,
                    size: item.size,
                    mime: item.mime,
                    key: item.key,
                    lastModified: item.lastModified
                }), publicKey).then((encrypted) => {
                    itemsToShare.push({
                        item: {
                            ...item,
                            parent: "none"
                        },
                        encrypted
                    })

                    return resolve(true)
                }).catch((err) => {
                    shareItemsSemaphore.release()

                    return reject(err)
                })
            }
            else{
                getDirectoryTree(item.uuid, "normal").then(async (content) => {
                    const folderItemsEncryptedPromises: Promise<{ item: ItemProps, encrypted: string }>[] = []

                    for(let x = 0; x < content.length; x++){
                        const folderItem = content[x].item
                        const index = x

                        if(folderItem.type == "file"){
                            folderItemsEncryptedPromises.push(new Promise((resolve, reject) => {
                                encryptMetadataPublicKey(JSON.stringify({
                                    name: folderItem.name,
                                    size: folderItem.size,
                                    mime: folderItem.mime,
                                    key: folderItem.key,
                                    lastModified: folderItem.lastModified
                                }), publicKey).then((encrypted) => {
                                    return resolve({
                                        item: folderItem,
                                        encrypted
                                    })
                                }).catch(reject)
                            }))
                        }
                        else{
                            folderItemsEncryptedPromises.push(new Promise((resolve, reject) => {
                                encryptMetadataPublicKey(JSON.stringify({
                                    name: folderItem.name
                                }), publicKey).then((encrypted) => {
                                    return resolve({
                                        item: {
                                            ...folderItem,
                                            parent: (index == 0 ? "none" : folderItem.parent)
                                        },
                                        encrypted
                                    })
                                }).catch(reject)
                            }))
                        }
                    }

                    Promise.all(folderItemsEncryptedPromises).then((results) => {
                        for(let i = 0; i < results.length; i++){
                            itemsToShare.push({
                                item: results[i].item,
                                encrypted: results[i].encrypted
                            })
                        }

                        return resolve(true)
                    }).catch((err) => {
                        shareItemsSemaphore.release()
        
                        return reject(err)
                    })
                }).catch((err) => {
                    shareItemsSemaphore.release()
    
                    return reject(err)
                })
            }
        }))
    }

    await Promise.all(encryptPromises)

    if(itemsToShare.length == 0){
        return true
    }

    const sorted = itemsToShare.sort((a, b) => a.item.parent.length - b.item.parent.length)
    let done: number = 0
    const sharePromises = []

    for(let i = 0; i < sorted.length; i++){
        const itemToShare = sorted[i].item
        const encrypted = sorted[i].encrypted

        sharePromises.push(new Promise(async (resolve, reject) => {
            await shareItemsSemaphore.acquire()

            shareItem({
                data: {
                    apiKey,
                    uuid: itemToShare.uuid,
                    parent: itemToShare.parent,
                    email: email,
                    type: itemToShare.type,
                    metadata: encrypted
                }
            }).then(() => {
                done += 1

                if(typeof progressCallback == "function"){
                    progressCallback(done, sorted.length)
                }

                shareItemsSemaphore.release()

                return resolve(true)
            }).catch((err) => {
                shareItemsSemaphore.release()

                return reject(err)
            })
        }))
    }

    try{
        await Promise.all(sharePromises)
    }
    catch(e: any){
        if(e.toString().toLowerCase().indexOf("already sharing") == -1){
            throw e
        }
    }

    return true
}

export const getPublicKeyFromEmail = (email: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/publicKey/get",
            data: {
                email
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data.publicKey)
        }).catch(reject)
    })
}

export const stopSharingItem = (item: ItemProps): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/item/out/remove",
                data: {
                    apiKey,
                    uuid: item.uuid,
                    receiverId: item.receiverId
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const removeSharedInItem = (item: ItemProps): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/item/in/remove",
                data: {
                    apiKey,
                    uuid: item.uuid,
                    receiverId: 0
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject)  
        }).catch(reject)
    })
}

export const itemPublicLinkInfo = (item: ItemProps): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: item.type == "file" ? "/v1/link/status" : "/v1/dir/link/status",
                data: item.type == "file" ? {
                    apiKey,
                    fileUUID: item.uuid
                } : {
                    apiKey,
                    uuid: item.uuid
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(response.data)
            }).catch(reject) 
        }).catch(reject)
    })
}

export const addItemToFolderPublicLink = (data: {
    apiKey: string,
    uuid: string,
    parent: string,
    linkUUID: string,
    type: string,
    metadata: string,
    key: string,
    expiration: string,
    password: string,
    passwordHashed: string,
    downloadBtn: string
}): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/link/add",
            data
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(true)
        }).catch(reject)
    })
}

export const createFolderPublicLink = (item: ItemProps, progressCallback?: (current: number, total: number) => any): Promise<any> => {
    return new Promise((resolve, reject) => {
        if(item.type !== "folder"){
            return reject(new Error("Invalid item type"))
        }

        Promise.all([
            db.get("apiKey"),
            db.get("masterKeys"),
            getDirectoryTree(item.uuid, "normal")
        ]).then(async ([apiKey, masterKeys, content]) => {
            if(content.length == 0){
                return resolve(true)
            }

            const key: string = generateRandomString(32)
            const encryptedKey: string = await encryptMetadata(key, masterKeys[masterKeys.length - 1])
            const linkUUID: string = uuidv4()
            const promises = []
            const emptyHashed: string = await hashFn("empty")
            const sorted = content.sort((a, b) => b.item.parent.length - a.item.parent.length)
            let done: number = 0

            for(let i = 0; i < sorted.length; i++){
                promises.push(new Promise(async (resolve, reject) => {
                    await linkItemsSemaphore.acquire()

                    const metadata = JSON.stringify(sorted[i].item.type == "file" ? {
                        name: sorted[i].item.name,
                        mime: sorted[i].item.mime,
                        key: sorted[i].item.key,
                        size: sorted[i].item.size,
                        lastModified: sorted[i].item.lastModified
                    } : {
                        name: sorted[i].item.name
                    })

                    encryptMetadata(metadata, key).then((encrypted) => {
                        addItemToFolderPublicLink({
                            apiKey,
                            uuid: sorted[i].item.uuid,
                            parent: sorted[i].item.parent,
                            linkUUID,
                            type: sorted[i].item.type,
                            metadata: encrypted,
                            key: encryptedKey,
                            expiration: "never",
                            password: "empty",
                            passwordHashed: emptyHashed,
                            downloadBtn: "enable"
                        }).then(() => {
                            done += 1

                            if(typeof progressCallback == "function"){
                                progressCallback(done, sorted.length)
                            }

                            linkItemsSemaphore.release()

                            return resolve(true)
                        }).catch((err) => {
                            linkItemsSemaphore.release()

                            return reject(err)
                        })
                    }).catch((err) => {
                        linkItemsSemaphore.release()

                        return reject(err)
                    })
                }))
            }

            Promise.all(promises).then(() => {
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const enableItemPublicLink = (item: ItemProps, progressCallback?: (current: number, total: number) => any): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then(async (apiKey) => {
            if(item.type == "file"){
                const linkUUID: string = uuidv4()

                apiRequest({
                    method: "POST",
                    endpoint: "/v1/link/edit",
                    data: {
                        apiKey,
                        uuid: linkUUID,
                        fileUUID: item.uuid,
                        expiration: "never",
                        password: "empty",
                        passwordHashed: await hashFn("empty"),
                        salt: generateRandomString(32),
                        downloadBtn: "enable",
                        type: "enable"
                    }
                }).then((response) => {
                    if(typeof progressCallback == "function"){
                        progressCallback(1, 1)
                    }

                    if(!response.status){
                        return reject(response.message)
                    }
        
                    return resolve(true)
                }).catch(reject) 
            }
            else{
                createFolderPublicLink(item, progressCallback).then(() => {
                    return resolve(true)
                }).catch(reject)
            }
        }).catch(reject)
    })
}

export const disableItemPublicLink = (item: ItemProps, linkUUID: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then(async (apiKey) => {
            if(item.type == "file"){
                if(typeof linkUUID !== "string"){
                    return reject(new Error("Invalid linkUUID"))
                }

                if(linkUUID.length < 32){
                    return reject(new Error("Invalid linkUUID"))
                }

                apiRequest({
                    method: "POST",
                    endpoint: "/v1/link/edit",
                    data: {
                        apiKey,
                        uuid: linkUUID,
                        fileUUID: item.uuid,
                        expiration: "never",
                        password: "empty",
                        passwordHashed: await hashFn("empty"),
                        salt: generateRandomString(32),
                        downloadBtn: "enable",
                        type: "disable"
                    }
                }).then((response) => {
                    if(!response.status){
                        return reject(response.message)
                    }
        
                    return resolve(true)
                }).catch(reject) 
            }
            else{
                apiRequest({
                    method: "POST",
                    endpoint: "/v1/dir/link/remove",
                    data: {
                        apiKey,
                        uuid: item.uuid
                    }
                }).then((response) => {
                    if(!response.status){
                        return reject(response.message)
                    }
        
                    return resolve(true)
                }).catch(reject)
            }
        }).catch(reject)
    })
}

export const editItemPublicLink = (item: ItemProps, linkUUID: string, expiration: string = "30d", password: string = "", downloadBtn: "enable" | "disable" = "enable"): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if(password == null){
            password = ""
        }

        if(typeof downloadBtn !== "string"){
            downloadBtn = "enable"
        }

        const pass: string = (password.length > 0 ? "notempty" : "empty")
        const passH: string = (password.length > 0 ? password : "empty")
        const salt: string = generateRandomString(32)

        console.log(linkUUID, expiration, password, downloadBtn)

        db.get("apiKey").then(async (apiKey) => {
            if(item.type == "file"){
                if(typeof linkUUID !== "string"){
                    return reject(new Error("Invalid linkUUID"))
                }

                if(linkUUID.length < 32){
                    return reject(new Error("Invalid linkUUID"))
                }

                apiRequest({
                    method: "POST",
                    endpoint: "/v1/link/edit",
                    data: {
                        apiKey,
                        uuid: linkUUID,
                        fileUUID: item.uuid,
                        expiration,
                        password: pass,
                        passwordHashed: await deriveKeyFromPassword(passH, salt, 200000, "SHA-512", 512, true),
                        salt,
                        downloadBtn,
                        type: "enable"
                    }
                }).then((response) => {
                    if(!response.status){
                        return reject(response.message)
                    }
        
                    return resolve(true)
                }).catch(reject) 
            }
            else{
                apiRequest({
                    method: "POST",
                    endpoint: "/v1/dir/link/edit",
                    data: {
                        apiKey,
                        uuid: item.uuid,
                        expiration,
                        password: pass,
                        passwordHashed: await deriveKeyFromPassword(passH, salt, 200000, "SHA-512", 512, true),
                        salt, 
                        downloadBtn
                    }
                }).then((response) => {
                    if(!response.status){
                        return reject(response.message)
                    }
        
                    return resolve(true)
                }).catch(reject)
            }
        }).catch(reject)
    })
}

export const fetchFileVersions = (item: ItemProps): Promise<FileVersionsV1[]> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/file/versions",
                data: {
                    apiKey,
                    uuid: item.uuid
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(response.data.versions)
            }).catch(reject)  
        }).catch(reject)
    })
}

export const changeFolderColor = (folder: ItemProps, color: FolderColors): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get("apiKey").then((apiKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/color/change",
                data: {
                    apiKey,
                    uuid: folder.uuid,
                    color
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }

                eventListener.emit("folderColorChanged", {
                    uuid: folder.uuid,
                    color
                })
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const userSettings = async (): Promise<UserGetSettingsV1> => {
    const apiKey = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/get/settings",
        data: {
            apiKey
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const userAccount = async (): Promise<UserGetAccountV1> => {
    const apiKey = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/get/account",
        data: {
            apiKey
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const userGDPR = async (): Promise<any> => {
    const apiKey = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/gdpr/download",
        data: {
            apiKey
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const uploadAvatar = async (buffer: Uint8Array): Promise<boolean> => {
    const binaryString: string = convertArrayBufferToBinaryString(buffer)
    const apiKey: string = await db.get("apiKey")
    const response = await fetch(getAPIServer() + "/v1/user/avatar/upload/" + apiKey, {
        body: binaryString,
        method: "POST"
    })
    const json = await response.json()

    if(!json.status){
        throw new Error(json.message)
    }

    return true
}

export const changeEmail = async (email: string, emailRepeat: string, password: string, authVersion: number): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/settings/email/change",
        data: {
            apiKey,
            email,
            emailRepeat,
            password,
            authVersion
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const updatePersonal = async (
    {
        city = "__NONE__",
        companyName = "__NONE__",
        country = "__NONE__",
        firstName = "__NONE__",
        lastName = "__NONE__",
        postalCode = "__NONE__",
        street = "__NONE__",
        streetNumber = "__NONE__",
        vatId = "__NONE__"
    }: {
        city?: string,
        companyName?: string,
        country?: string,
        firstName?: string,
        lastName?: string,
        postalCode?: string,
        street?: string,
        streetNumber?: string,
        vatId?: string
    }
): Promise<boolean> => {
    if(city.length <= 0){
        city = "__NONE__"
    }

    if(companyName.length <= 0){
        companyName = "__NONE__"
    }

    if(country.length <= 0){
        country = "__NONE__"
    }

    if(firstName.length <= 0){
        firstName = "__NONE__"
    }

    if(lastName.length <= 0){
        lastName = "__NONE__"
    }

    if(postalCode.length <= 0){
        postalCode = "__NONE__"
    }

    if(street.length <= 0){
        street = "__NONE__"
    }

    if(streetNumber.length <= 0){
        streetNumber = "__NONE__"
    }

    if(vatId.length <= 0){
        vatId = "__NONE__"
    }

    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/personal/update",
        data: {
            apiKey,
            city,
            companyName,
            country,
            firstName,
            lastName,
            postalCode,
            street,
            streetNumber,
            vatId
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const deleteAccount = async (twoFactorKey: string = "XXXXXX"): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/account/delete",
        data: {
            apiKey,
            twoFactorKey
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const redeemCode = async (code: string): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/code/redeem",
        data: {
            apiKey,
            code
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const deleteVersioned = async (): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/versions/delete",
        data: {
            apiKey
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const deleteAll = async (): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/delete/all",
        data: {
            apiKey
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const changePassword = async ({ password, passwordRepeat, currentPassword, authVersion, salt, masterKeys }: { password: string, passwordRepeat: string, currentPassword: string, authVersion: number, salt: string, masterKeys: string }): Promise<any> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/settings/password/change",
        data: {
            apiKey,
            password,
            passwordRepeat,
            currentPassword,
            authVersion,
            salt,
            masterKeys
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const enable2FA = async (code: string): Promise<string> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/settings/2fa/enable",
        data: {
            apiKey,
            code
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data.recoveryKeys
}

export const disable2FA = async (code: string): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/settings/2fa/disable",
        data: {
            apiKey,
            code
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const fetchEvents = async (lastTimestamp: number = (Math.floor(new Date().getTime() / 1000) + 60), filter: string = "all"): Promise<{ events: UserEvent[], limit: number }> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v2/user/events",
        data: {
            apiKey,
            filter,
            timestamp: lastTimestamp
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return {
        events: response.data.events,
        limit: response.data.limit
    }
}

export const fetchEventInfo = async (uuid: string): Promise<any> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/events/get",
        data: {
            apiKey,
            uuid
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const publicLinkInfo = async (uuid: string, password: string): Promise<LinkGetInfoV1> => {
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/link/get/info",
        data: {
            uuid,
            password
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const publicLinkHasPassword = async (uuid: string): Promise<LinkHasPasswordV1> => {
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/link/hasPassword",
        data: {
            uuid
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return {
        hasPassword: response.data.hasPassword,
        salt: response.data.salt
    }
}

export const folderLinkInfo = async (uuid: string): Promise<LinkDirInfoV1> => {
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/link/dir/info",
        data: {
            uuid
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const folderLinkContents = async (uuid: string, parent: string, password: string): Promise<LinkDirContentV1> => {
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/link/dir/content",
        data: {
            uuid,
            password,
            parent,
            folders: JSON.stringify(["default"])
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const cancelSub = async (id: string): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/sub/cancel",
        data: {
            apiKey,
            id
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const generateInvoice = async (id: string): Promise<string> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "GET",
        endpoint: "/v1/invoice/download?apiKey=" + apiKey + "&uuid=" + id,
        data: {}
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return response.data
}

export const buySub = async (planId: number, paymentMethod: PaymentMethods, lifetime: boolean): Promise<string> => {
    const apiKey: string = await db.get("apiKey")
    
    if(lifetime){
        var response = await apiRequest({
            method: "POST",
            endpoint: "/v1/pay/" + paymentMethod,
            data: {
                apiKey,
                planId
            }
        })
    }
    else{
        if(paymentMethod == "paypal"){
            var response = await apiRequest({
                method: "POST",
                endpoint: "/v1/sub/create/" + paymentMethod,
                data: {
                    apiKey,
                    planId
                }
            })
        }
        else{
            var response = await apiRequest({
                method: "POST",
                endpoint: "/v1/sub/stripe/init",
                data: {
                    apiKey,
                    planId
                }
            })
        }
    }

    if(!response.status){
        throw new Error(response.message)
    }

    if(lifetime){
        return response.data.url
    }

    if(paymentMethod == "paypal"){
        return response.data.href
    }

    if(paymentMethod == "stripe"){
        return response.data.url
    }

    return response.data.url
}

export const requestAffiliatePayout = async (method: string, address: string): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/affiliate/payout",
        data: {
            apiKey,
            method,
            address
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}

export const detectOrphans = async (): Promise<boolean> => {
    const apiKey: string = await db.get("apiKey")
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/orphans",
        data: {
            apiKey
        }
    })

    if(!response.status){
        throw new Error(response.message)
    }

    return true
}