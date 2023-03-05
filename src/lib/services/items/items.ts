import type { ItemProps, ItemReceiver } from "../../../types"
import db from "../../db"
import { decryptFolderName, decryptFileMetadata, decryptFolderNamePrivateKey, decryptFileMetadataPrivateKey, decryptFolderNameLink, decryptFileMetadataLink } from "../../worker/worker.com"
import { folderContent, sharedInContent, sharedOutContent, recentContent, getFolderContents } from "../../api"
import { orderItemsByType, getCurrentParent, Semaphore, convertTimestampToMs } from "../../helpers"
import memoryCache from "../../memoryCache"
import striptags from "striptags"
import { addToSearchItems } from "../search"

const addFolderNameToDbSemaphore = new Semaphore(1)

export const addFolderNameToDb = async (uuid: string, name: string): Promise<void> => {
    try{
        await addFolderNameToDbSemaphore.acquire()

        memoryCache.set("folderName:" + uuid, name)

        let folderNames = await db.get("folderNames", "metadata")

        if(folderNames == null){
            folderNames = {}
        }

        folderNames[uuid] = name

        await db.set("folderNames", folderNames, "metadata")
    }
    catch(e){
        console.error(e)
    }

    addFolderNameToDbSemaphore.release()
}

export const loadItems = (href: string, skipCache: boolean = false, dontSave: boolean = false): Promise<{ cache: boolean, items: ItemProps[] }> => {
    return new Promise((resolve, reject) => {
        const uuid: string = getCurrentParent(href)

        const refresh = () => {
            Promise.all([
                db.get("apiKey"),
                db.get("masterKeys"),
                db.get("privateKey"),
                db.get("userId"),
                db.get("userEmail"),
                db.get("sortBy")
            ]).then(async ([apiKey, masterKeys, privateKey, userId, userEmail, sortBy]) => {
                try{
                    let items: ItemProps[] = []
    
                    if(href.indexOf("shared-in") !== -1){
                        const content = await sharedInContent({ apiKey, uuid })
                        const folders = content.folders
                        const files = content.uploads
                        const exists: { [key: string]: boolean } = {}
    
                        for(let i = 0; i < folders.length; i++){
                            const folder = folders[i]
                            const folderName = striptags(await decryptFolderNamePrivateKey(folder.metadata, privateKey))
    
                            if(typeof folderName == "string"){
                                if(folderName.length > 0 && !exists[folder.uuid + ":" + folder.sharerId]){
                                    exists[folder.uuid + ":" + folder.sharerId] = true

                                    addFolderNameToDb(folder.uuid, folderName)
    
                                    items.push({
                                        type: "folder",
                                        parent: folder.parent,
                                        uuid: folder.uuid,
                                        name: folderName,
                                        size: memoryCache.has("folderSize:" + folder.uuid) ? memoryCache.get("folderSize:" + folder.uuid) : 0,
                                        mime: "Folder",
                                        lastModified: 0,
                                        lastModifiedSort: convertTimestampToMs(folder.timestamp),
                                        timestamp: convertTimestampToMs(folder.timestamp),
                                        selected: false,
                                        color: folder.color,
                                        sharerEmail: folder.sharerEmail,
                                        sharerId: folder.sharerId,
                                        receiverEmail: userEmail,
                                        receiverId: userId,
                                        version: 0,
                                        rm: "",
                                        favorited: 0,
                                        chunks: 0,
                                        writeAccess: folder.writeAccess,
                                        root: href,
                                        key: "",
                                        bucket: "",
                                        region: ""
                                    })
                                }
                            }
                        }
    
                        for(let i = 0; i < files.length; i++){
                            const file = files[i]
                            const fileMetadata = await decryptFileMetadataPrivateKey(file.metadata, privateKey)
    
                            fileMetadata.name = striptags(fileMetadata.name)
                            
                            const lastModified = typeof fileMetadata.lastModified == "number" && !isNaN(fileMetadata.lastModified) && fileMetadata.lastModified > 13000000 ? fileMetadata.lastModified : file.timestamp
    
                            if(typeof fileMetadata.name == "string"){
                                if(fileMetadata.name.length > 0 && !exists[file.uuid + ":" + file.sharerId]){
                                    exists[file.uuid + ":" + file.sharerId] = true

                                    items.push({
                                        type: "file",
                                        parent: file.parent,
                                        uuid: file.uuid,
                                        name: fileMetadata.name,
                                        size: parseInt(striptags(fileMetadata.size.toString())),
                                        mime: striptags(fileMetadata.mime),
                                        lastModified: convertTimestampToMs(lastModified),
                                        lastModifiedSort: lastModified,
                                        timestamp: convertTimestampToMs(file.timestamp),
                                        selected: false,
                                        color: "default",
                                        sharerEmail: file.sharerEmail,
                                        sharerId: file.sharerId,
                                        receiverEmail: userEmail,
                                        receiverId: userId,
                                        version: file.version,
                                        rm: "",
                                        favorited: 0,
                                        chunks: file.chunks,
                                        writeAccess: false,
                                        root: href,
                                        key: striptags(fileMetadata.key),
                                        bucket: file.bucket,
                                        region: file.region
                                    })
                                }
                            }
                        }
                    }
                    else if(href.indexOf("shared-out") !== -1){
                        const content = await sharedOutContent({ apiKey, uuid })
                        const folders = content.folders
                        const files = content.uploads
                        const exists: { [key: string]: boolean } = {}
    
                        for(let i = 0; i < folders.length; i++){
                            const folder = folders[i]
                            const folderName = striptags(await decryptFolderName(folder.metadata, masterKeys))
    
                            if(typeof folderName == "string"){
                                if(folderName.length > 0 && !exists[folder.uuid + ":" + folder.receiverId]){
                                    exists[folder.uuid + ":" + folder.receiverId] = true

                                    addFolderNameToDb(folder.uuid, folderName)
        
                                    items.push({
                                        type: "folder",
                                        parent: folder.parent,
                                        uuid: folder.uuid,
                                        name: folderName,
                                        size: memoryCache.has("folderSize:" + folder.uuid) ? memoryCache.get("folderSize:" + folder.uuid) : 0,
                                        mime: "Folder",
                                        lastModified: 0,
                                        lastModifiedSort: convertTimestampToMs(folder.timestamp),
                                        timestamp: convertTimestampToMs(folder.timestamp),
                                        selected: false,
                                        color: folder.color,
                                        sharerEmail: userEmail,
                                        sharerId: userId,
                                        receiverEmail: folder.receiverEmail,
                                        receiverId: folder.receiverId,
                                        version: 0,
                                        rm: "",
                                        favorited: folder.favorited,
                                        chunks: 0,
                                        writeAccess: true,
                                        root: href,
                                        key: "",
                                        bucket: "",
                                        region: ""
                                    })
                                }
                            }
                        }
    
                        for(let i = 0; i < files.length; i++){
                            const file = files[i]
                            const fileMetadata = await decryptFileMetadata(file.metadata, masterKeys)
    
                            fileMetadata.name = striptags(fileMetadata.name)
                            
                            const lastModified = typeof fileMetadata.lastModified == "number" && !isNaN(fileMetadata.lastModified) && fileMetadata.lastModified > 13000000 ? fileMetadata.lastModified : file.timestamp
    
                            if(typeof fileMetadata.name == "string"){
                                if(fileMetadata.name.length > 0 && !exists[file.uuid + ":" + file.receiverId]){
                                    exists[file.uuid + ":" + file.receiverId] = true

                                    items.push({
                                        type: "file",
                                        parent: file.parent,
                                        uuid: file.uuid,
                                        name: fileMetadata.name,
                                        size: parseInt(striptags(fileMetadata.size.toString())),
                                        mime: striptags(fileMetadata.mime),
                                        lastModified: convertTimestampToMs(lastModified),
                                        lastModifiedSort: convertTimestampToMs(lastModified),
                                        timestamp: convertTimestampToMs(file.timestamp),
                                        selected: false,
                                        color: "default",
                                        sharerEmail: userEmail,
                                        sharerId: userId,
                                        receiverEmail: file.receiverEmail,
                                        receiverId: file.receiverId,
                                        version: file.version,
                                        rm: file.rm,
                                        favorited: file.favorited,
                                        chunks: file.chunks,
                                        writeAccess: true,
                                        root: href,
                                        key: striptags(fileMetadata.key),
                                        bucket: file.bucket,
                                        region: file.region
                                    })
                                }
                            }
                        }

                        const groups: ItemProps[] = []
                        const sharedTo: { [key: string]: ItemReceiver[] } = {}
                        const added: { [key: string]: boolean } = {}

                        for(let i = 0; i < items.length; i++){
                            if(Array.isArray(sharedTo[items[i].uuid])){
                                sharedTo[items[i].uuid].push({
                                    id: items[i].receiverId,
                                    email: items[i].receiverEmail
                                })
                            }
                            else{
                                sharedTo[items[i].uuid] = [{
                                    id: items[i].receiverId,
                                    email: items[i].receiverEmail
                                }]
                            }
                        }

                        for(let i = 0; i < items.length; i++){
                            if(Array.isArray(sharedTo[items[i].uuid])){
                                items[i].receivers = sharedTo[items[i].uuid]
                            }

                            if(!added[items[i].uuid]){
                                added[items[i].uuid] = true

                                groups.push(items[i])
                            }
                        }

                        items = groups
                    }
                    else if(href.indexOf("recent") !== -1){
                        const files = await recentContent({ apiKey })
    
                        for(let i = 0; i < files.length; i++){
                            const file = files[i]
                            const fileMetadata = await decryptFileMetadata(file.metadata, masterKeys)
    
                            fileMetadata.name = striptags(fileMetadata.name)
                            
                            const lastModified = typeof fileMetadata.lastModified == "number" && !isNaN(fileMetadata.lastModified) && fileMetadata.lastModified > 13000000 ? fileMetadata.lastModified : file.timestamp
    
                            if(typeof fileMetadata.name == "string"){
                                if(fileMetadata.name.length > 0){
                                    items.push({
                                        type: "file",
                                        parent: file.parent,
                                        uuid: file.uuid,
                                        name: fileMetadata.name,
                                        size: parseInt(striptags(fileMetadata.size.toString())),
                                        mime: striptags(fileMetadata.mime),
                                        lastModified: convertTimestampToMs(lastModified),
                                        lastModifiedSort: convertTimestampToMs(lastModified),
                                        timestamp: convertTimestampToMs(file.timestamp),
                                        selected: false,
                                        color: "default",
                                        sharerEmail: "",
                                        sharerId: 0,
                                        receiverEmail: "",
                                        receiverId: 0,
                                        version: file.version,
                                        rm: file.rm,
                                        favorited: file.favorited,
                                        chunks: file.chunks,
                                        writeAccess: true,
                                        root: href,
                                        key: striptags(fileMetadata.key),
                                        bucket: file.bucket,
                                        region: file.region
                                    })
                                }
                            }
                        }
                    }
                    else{
                        const content = await folderContent({ apiKey, uuid })
                        const folders = content.folders
                        const files = content.uploads
    
                        for(let i = 0; i < folders.length; i++){
                            const folder = folders[i]
                            const folderName = striptags(await decryptFolderName(folder.name, masterKeys))
    
                            if(typeof folderName == "string"){
                                if(folderName.length > 0){
                                    addFolderNameToDb(folder.uuid, folderName)
        
                                    items.push({
                                        type: "folder",
                                        parent: folder.parent,
                                        uuid: folder.uuid,
                                        name: folderName,
                                        size: memoryCache.has("folderSize:" + folder.uuid) ? memoryCache.get("folderSize:" + folder.uuid) : 0,
                                        mime: "Folder",
                                        lastModified: 0,
                                        lastModifiedSort: convertTimestampToMs(folder.timestamp),
                                        timestamp: convertTimestampToMs(folder.timestamp),
                                        selected: false,
                                        color: folder.color,
                                        sharerEmail: "",
                                        sharerId: 0,
                                        receiverEmail: "",
                                        receiverId: 0,
                                        version: 0,
                                        rm: "",
                                        favorited: folder.favorited,
                                        chunks: 0,
                                        writeAccess: true,
                                        root: href,
                                        key: "",
                                        bucket: "",
                                        region: ""
                                    })
                                }
                            }
                        }
    
                        for(let i = 0; i < files.length; i++){
                            const file = files[i]
                            const fileMetadata = await decryptFileMetadata(file.metadata, masterKeys)
    
                            fileMetadata.name = striptags(fileMetadata.name)

                            const lastModified = typeof fileMetadata.lastModified == "number" && !isNaN(fileMetadata.lastModified) && fileMetadata.lastModified > 13000000 ? fileMetadata.lastModified : file.timestamp
    
                            if(typeof fileMetadata.name == "string"){
                                if(fileMetadata.name.length > 0){
                                    items.push({
                                        type: "file",
                                        parent: file.parent,
                                        uuid: file.uuid,
                                        name: fileMetadata.name,
                                        size: parseInt(striptags(fileMetadata.size.toString())),
                                        mime: striptags(fileMetadata.mime),
                                        lastModified: convertTimestampToMs(lastModified),
                                        lastModifiedSort: convertTimestampToMs(lastModified),
                                        timestamp: convertTimestampToMs(file.timestamp),
                                        selected: false,
                                        color: "default",
                                        sharerEmail: "",
                                        sharerId: 0,
                                        receiverEmail: "",
                                        receiverId: 0,
                                        version: file.version,
                                        rm: file.rm,
                                        favorited: file.favorited,
                                        chunks: file.chunks,
                                        writeAccess: true,
                                        root: href,
                                        key: striptags(fileMetadata.key),
                                        bucket: file.bucket,
                                        region: file.region
                                    })
                                }
                            }
                        }
                    }

                    if(sortBy == null){
                        sortBy = {}
                    }
    
                    const sorted: ItemProps[] = orderItemsByType(items, sortBy[href], href)

                    addToSearchItems(sorted)

                    if(dontSave){
                        return resolve({
                            cache: false,
                            items: sorted
                        })
                    }
    
                    db.set("loadItems:" + uuid, sorted, "metadata").then(() => {
                        return resolve({
                            cache: false,
                            items: sorted
                        })
                    }).catch(reject)
                }
                catch(e){
                    return reject(e)
                }
            }).catch(reject)
        }

        if(skipCache){
            return refresh()
        }

        db.get("loadItems:" + uuid, "metadata").then((data: ItemProps[]) => {
            if(data){
                return resolve({
                    cache: true,
                    items: data
                })
            }
            
            return refresh()
        }).catch(reject)
    })
}

export const loadSidebarItems = (uuid: string, skipCache: boolean = false): Promise<{ cache: boolean, items: ItemProps[] }> => {
    return new Promise((resolve, reject) => {
        const refresh = () => {
            Promise.all([
                db.get("apiKey"),
                db.get("masterKeys"),
                db.get("defaultDriveUUID")
            ]).then(async ([apiKey, masterKeys, defaultDriveUUID]) => {
                try{
                    const items: ItemProps[] = []
    
                    if(uuid == "base" || uuid == "cloudDrive"){
                        const content = await folderContent({ apiKey, uuid: defaultDriveUUID, foldersOnly: true })
                        const folders = content.folders
    
                        for(let i = 0; i < folders.length; i++){
                            const folder = folders[i]
                            const folderName = await decryptFolderName(folder.name, masterKeys)
    
                            if(typeof folderName == "string"){
                                if(folderName.length > 0){
                                    addFolderNameToDb(folder.uuid, folderName)
        
                                    items.push({
                                        type: "folder",
                                        parent: folder.parent,
                                        uuid: folder.uuid,
                                        name: folderName,
                                        size: 0,
                                        mime: "Folder",
                                        lastModified: 0,
                                        lastModifiedSort: folder.timestamp,
                                        timestamp: folder.timestamp,
                                        selected: false,
                                        color: folder.color,
                                        sharerEmail: "",
                                        sharerId: 0,
                                        receiverEmail: "",
                                        receiverId: 0,
                                        version: 0,
                                        rm: "",
                                        favorited: folder.favorited,
                                        chunks: 0,
                                        writeAccess: true,
                                        root: "",
                                        key: "",
                                        bucket: "",
                                        region: ""
                                    })
                                }
                            }
                        }
                    }
                    else{
                        const content = await folderContent({ apiKey, uuid, foldersOnly: true })
                        const folders = content.folders
    
                        for(let i = 0; i < folders.length; i++){
                            const folder = folders[i]
                            const folderName = await decryptFolderName(folder.name, masterKeys)
    
                            if(typeof folderName == "string"){
                                if(folderName.length > 0){
                                    addFolderNameToDb(folder.uuid, folderName)
        
                                    items.push({
                                        type: "folder",
                                        parent: folder.parent,
                                        uuid: folder.uuid,
                                        name: folderName,
                                        size: 0,
                                        mime: "Folder",
                                        lastModified: 0,
                                        lastModifiedSort: folder.timestamp,
                                        timestamp: folder.timestamp,
                                        selected: false,
                                        color: folder.color,
                                        sharerEmail: "",
                                        sharerId: 0,
                                        receiverEmail: "",
                                        receiverId: 0,
                                        version: 0,
                                        rm: "",
                                        favorited: folder.favorited,
                                        chunks: 0,
                                        writeAccess: true,
                                        root: "",
                                        key: "",
                                        bucket: "",
                                        region: ""
                                    })
                                }
                            }
                        }
                    }
    
                    const sorted = orderItemsByType(items, "nameAsc")

                    addToSearchItems(sorted)
    
                    db.set("loadSidebarItems:" + uuid, sorted, "metadata").then(() => {
                        return resolve({
                            cache: false,
                            items: sorted
                        })
                    })
                }
                catch(e){
                    return reject(e)
                }
            }).catch(reject)
        }

        if(skipCache){
            return refresh()
        }

        db.get("loadSidebarItems:" + uuid, "metadata").then((data: ItemProps[]) => {
            if(data){
                return resolve({
                    cache: true,
                    items: data
                })
            }
            
            return refresh()
        }).catch(reject)
    })
}

export interface GetDirectoryTreeResult {
    path: string,
    item: ItemProps
}

export const getDirectoryTree = (uuid: string, type: "normal" | "shared" | "linked" = "normal", linkUUID: string | undefined = undefined, linkHasPassword: boolean | undefined = undefined, linkPassword: string | undefined = undefined, linkSalt: string | undefined = undefined, linkKey: string | undefined = undefined): Promise<GetDirectoryTreeResult[]> => {
    return new Promise((resolve, reject) => {
        Promise.all([
            db.get("masterKeys"),
            getFolderContents({ uuid, type, linkUUID, linkHasPassword, linkPassword, linkSalt }),
            db.get("privateKey")
        ]).then(async ([masterKeys, content, privateKey]) => {
            const treeItems = []
            const baseFolderUUID = content.folders[0].uuid
            const baseFolderMetadata = content.folders[0].name
            const baseFolderParent = content.folders[0].parent
            const baseFolderName = type == "normal" ? await decryptFolderName(baseFolderMetadata, masterKeys) : (type == "shared" ? await decryptFolderNamePrivateKey(baseFolderMetadata, privateKey) : await decryptFolderNameLink(baseFolderMetadata, linkKey as string))

            if(baseFolderParent !== "base"){
                return reject(new Error("Invalid base folder parent"))
            }

            if(baseFolderName.length <= 0){
                return reject(new Error("Could not decrypt base folder name"))
            }

            treeItems.push({
                uuid: baseFolderUUID,
                name: baseFolderName,
                parent: "base",
                type: "folder"
            })

            const addedFolders: any = {}
            const addedFiles: any = {}

            for(let i = 0; i < content.folders.length; i++){
                const { uuid, name: metadata, parent } = content.folders[i]

                if(uuid == baseFolderUUID){
                    continue
                }

                const name = type == "normal" ? await decryptFolderName(metadata, masterKeys) : (type == "shared" ? await decryptFolderNamePrivateKey(metadata, privateKey) : await decryptFolderNameLink(metadata, linkKey as string))

                if(name.length > 0 && !addedFolders[parent + ":" + name]){
                    addedFolders[parent + ":" + name] = true

                    treeItems.push({
                        uuid,
                        name,
                        parent,
                        type: "folder"
                    })
                }
            }

            for(let i = 0; i < content.files.length; i++){
                const { uuid, bucket, region, chunks, parent, metadata, version } = content.files[i]
                const decrypted = type == "normal" ? await decryptFileMetadata(metadata, masterKeys) : (type == "shared" ? await decryptFileMetadataPrivateKey(metadata, privateKey) : await decryptFileMetadataLink(metadata, linkKey as string))

                if(typeof decrypted.lastModified == "number"){
                    if(decrypted.lastModified <= 0){
                        decrypted.lastModified = new Date().getTime()
                    }
                }
                else{
                    decrypted.lastModified = new Date().getTime()
                }

                decrypted.lastModified = convertTimestampToMs(decrypted.lastModified)

                if(decrypted.name.length > 0 && !addedFiles[parent + ":" + decrypted.name]){
                    addedFiles[parent + ":" + decrypted.name] = true

                    treeItems.push({
                        uuid,
                        region,
                        bucket,
                        chunks,
                        parent,
                        metadata: decrypted,
                        version,
                        type: "file"
                    })
                }
            }

            const nest = (items: any, uuid: string = "base", currentPath: string = "", link: string = "parent"): any => {
                return items.filter((item: any) => item[link] == uuid).map((item: any) => ({ 
                    ...item,
                    path: item.type == "folder" ? (currentPath + "/" + item.name) : (currentPath + "/" + item.metadata.name),
                    children: nest(items, item.uuid, item.type == "folder" ? (currentPath + "/" + item.name) : (currentPath + "/" + item.metadata.name), link)
                }))
            }

            const tree = nest(treeItems)
            let reading: number = 0
            const folders: any = {}
            const files: any = {}

            const iterateTree = (parent: any, callback: Function) => {
                if(parent.type == "folder"){
                    folders[parent.path] = parent
                }
                else{
                    files[parent.path] = parent
                }

                if(parent.children.length > 0){
                    for(let i = 0; i < parent.children.length; i++){
                        reading += 1
        
                        iterateTree(parent.children[i], callback)
                    }
                }
        
                reading -= 1
        
                if(reading == 0){
                    return callback()
                }
            }
        
            reading += 1

            iterateTree(tree[0], async () => {
                const result: GetDirectoryTreeResult[] = []

                for(const prop in folders){
                    result.push({
                        path: prop.slice(1),
                        item: {
                            type: "folder",
                            parent: folders[prop].parent,
                            uuid: folders[prop].uuid,
                            name: folders[prop].name,
                            size: 0,
                            mime: "Folder",
                            lastModified: 0,
                            lastModifiedSort: 0,
                            timestamp: 0,
                            selected: false,
                            color: "default",
                            sharerEmail: "",
                            sharerId: 0,
                            receiverEmail: "",
                            receiverId: 0,
                            version: 0,
                            rm: "",
                            favorited: 0,
                            chunks: 0,
                            writeAccess: true,
                            root: "",
                            key: "",
                            bucket: "",
                            region: ""
                        }
                    })
                }

                for(const prop in files){
                    result.push({
                        path: prop.slice(1),
                        item: {
                            type: "file",
                            parent: files[prop].parent,
                            uuid: files[prop].uuid,
                            name: files[prop].metadata.name,
                            size: parseInt(striptags(files[prop].metadata.size.toString())),
                            mime: striptags(files[prop].metadata.mime),
                            lastModified: parseInt(striptags(files[prop].metadata.lastModified.toString())),
                            lastModifiedSort: parseInt(striptags(files[prop].metadata.lastModified.toString())),
                            timestamp: parseInt(striptags(files[prop].metadata.lastModified.toString())),
                            selected: false,
                            color: "default",
                            sharerEmail: "",
                            sharerId: 0,
                            receiverEmail: "",
                            receiverId: 0,
                            version: files[prop].version,
                            rm: "",
                            favorited: 0,
                            chunks: files[prop].chunks,
                            writeAccess: true,
                            root: "",
                            key: striptags(files[prop].metadata.key),
                            bucket: files[prop].bucket,
                            region: files[prop].region
                        }
                    })
                }

                return resolve(result)
            })
        }).catch(reject)
    })
}