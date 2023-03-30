import cookies from "../cookies"
import eventListener from "../eventListener"
import type { ItemProps, UploadQueueItemFile } from "../../types"
import { API_DOMAINS, DOWNLOAD_DOMAINS, UPLOAD_DOMAINS, API_V3_DOMAINS, UPLOAD_V3_DOMAINS } from "../constants"
import { wrap, memoize, debounce } from "lodash"

export const getAPIServer = (): string => {
    return API_DOMAINS[getRandomArbitrary(0, (API_DOMAINS.length - 1))]
}

export const getAPIV3Server = (): string => {
    return API_V3_DOMAINS[getRandomArbitrary(0, (API_V3_DOMAINS.length - 1))]
}

export const getDownloadServer = (): string => {
    return DOWNLOAD_DOMAINS[getRandomArbitrary(0, (DOWNLOAD_DOMAINS.length - 1))]
}

export const getUploadServer = (): string => {
    return UPLOAD_DOMAINS[getRandomArbitrary(0, (UPLOAD_DOMAINS.length - 1))]
}

export const getUploadV3Server = (): string => {
    return UPLOAD_V3_DOMAINS[getRandomArbitrary(0, (UPLOAD_V3_DOMAINS.length - 1))]
}

export const arrayBufferToHex = (buffer: ArrayBuffer) => {
    return new Uint8Array(buffer).reduce((a, b) => a + b.toString(16).padStart(2, "0"), "")
}

export const isBetween = (start: number, end: number, number: number) => {
    if(number >= start && end >= number){
        return true
    }

    return false
}

export const mergeUInt8Arrays = (a1: Uint8Array, a2: Uint8Array): Uint8Array => {
    const mergedArray = new Uint8Array(a1.length + a2.length)

    mergedArray.set(a1)
    mergedArray.set(a2, a1.length)

    return mergedArray
}

export const calcSpeed = (now: number, started: number, bytes: number): number => {
    now = Date.now() - 1000

    const secondsDiff: number = ((now - started) / 1000)
    const bps: number = Math.floor((bytes / secondsDiff) * 1)

    return bps > 0 ? bps : 0
}

export const calcTimeLeft = (loadedBytes: number, totalBytes: number, started: number): number => {
    const elapsed: number = (Date.now() - started)
    const speed: number = (loadedBytes / (elapsed / 1000))
    const remaining: number = ((totalBytes - loadedBytes) / speed)

    return remaining > 0 ? remaining : 0
}

export const getDragSelectCoords = (start: { clientX: number, clientY: number }, current: { clientX: number, clientY: number }) => {
    let tmp = 0
    let x1 = start.clientX
    let y1 = start.clientY
    let x2 = current.clientX
    let y2 = current.clientY

    if(x1 > x2){
        tmp = x2
        x2 = x1
        x1 = tmp
    }

    if(y1 > y2){
        tmp = y2
        y2 = y1
        y1 = tmp
    }

    return {
        left: x1,
        top: y1,
        width: (x2 - x1),
        height: (y2 - y1)
    }
}

export const getDragSelectCollisions = () => {
    const items = document.querySelectorAll(".drag-select-item")
    const box = document.getElementById("dragSelectBox")

    if(!box || !items){
        return []
    }

    const overlaps = (a: HTMLElement, b: HTMLElement) => {
        const rect1 = a.getBoundingClientRect()
        const rect2 = b.getBoundingClientRect()

        return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y
    }

    const overlapping = []

    for(let i = 0; i < items.length; i++){
        if(overlaps(items[i] as HTMLElement, box as HTMLElement)){
            overlapping.push(items[i].getAttribute("data-uuid"))
        }
    }

    return overlapping
}

export const getItemDragIndicatorCoords = (clientX: number, clientY: number, offsetX: number, offsetY: number): { left: number, top: number } => {
    const windowWidth = globalThis.innerWidth
    const windowHeight = globalThis.innerHeight

    let left = clientX + offsetX
    let top = clientY + offsetY

    if((left + 250) >= windowWidth){
        left = left - 250
    }

    if((top + 90) >= windowHeight){
        top = top - 90
    }

    return {
        left,
        top
    }
}

export const toggleColorMode = (darkMode: boolean): void => {
    cookies.set("colorMode", darkMode ? "light" : "dark")

    eventListener.emit("colorModeChanged", !darkMode)
}

export const getRandomArbitrary = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min) + min)
}

export const sleep = (ms: number = 1000) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export const fileAndFolderNameValidation = (name: string) => {
    const regex = /[<>:"\/\\|?*\x00-\x1F]|^(?:aux|con|clock\$|nul|prn|com[1-9]|lpt[1-9])$/i
  
    if(regex.test(name)){
        return false
    }
  
    return true
}

export const formatBytes = (bytes: number, decimals: number = 2) => {
    if(bytes == 0){
        return "0 Bytes"
    }

    let k = 1024
    let dm = decimals < 0 ? 0 : decimals
    let sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

    let i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export const generateRandomString = (length: number = 32) => {
	return globalThis.btoa(Array.from(globalThis.crypto.getRandomValues(new Uint8Array(length * 2))).map((b) => String.fromCharCode(b)).join("")).replace(/[+/]/g, "").substring(0, length)
}

export interface SemaphoreProps {
    acquire(): Promise<boolean>,
    release(): void,
    count(): number,
    setMax(newMax: number): void,
    purge(): number
}
  
export const Semaphore = function(this: SemaphoreProps, max: number){
    let counter = 0
    let waiting: any[] = []
    let maxCount = max || 1
    
    var take = function(){
        if(waiting.length > 0 && counter < maxCount){
            counter++

            const promise = waiting.shift()

            promise.resolve()
        }
    }
    
    this.acquire = function(){
        if(counter < maxCount){
            counter++

            return new Promise(resolve => {
                resolve(true)
            })
        }
        else{
            return new Promise((resolve, err) => {
                waiting.push({
                    resolve: resolve,
                    err: err
                })
            })
        }
    }
    
    this.release = function(){
        counter--

        take()
    }

    this.count = function(){
        return counter
    }

    this.setMax = function(newMax: number){
        maxCount = newMax
    }
    
    this.purge = function(){
        const unresolved = waiting.length
        
        for(let i = 0; i < unresolved; i++){
            waiting[i].err("Task has been purged")
        }
        
        counter = 0
        waiting = []
        
        return unresolved
    }
} as any as { new (max: number): SemaphoreProps }

export const convertTimestampToMs = (timestamp: number): number => {
    try{
        const floored = Math.floor(timestamp)

        if(floored.toString().length >= 13){
            return floored
        }
    
        return Math.floor(floored * 1000)
    }
    catch(e){
        return timestamp
    }
}

export const fileNameToLowerCaseExt = (name: string) => {
    if(name.indexOf(".") == -1){
		return name
	}
    
    let generatedFileName = name
    let fileNameEx = generatedFileName.split(".")
    let lowerCaseFileEnding = fileNameEx[fileNameEx.length - 1].toLowerCase()

    fileNameEx.pop()

    const fileNameWithLowerCaseEnding = fileNameEx.join(".") + "." + lowerCaseFileEnding

    generatedFileName = fileNameWithLowerCaseEnding

    return generatedFileName
}

export const bpsToReadable = (bps: number) => {
    if(!(bps > 0 && bps < (1024 * 1024 * 1024 * 1024))){
        bps = 1
    }

    let i = -1
    const byteUnits = [
        " KB/s",
        " MB/s",
        " GB/s",
        " TB/s",
        " PB/s",
        " EB/s",
        " ZB/s",
        " YB/s"
    ]

    do{
        bps = bps / 1024
        i++
    }
    while(bps > 1024)

    return Math.max(bps, 0.1).toFixed(1) + byteUnits[i]
}

export const getTimeRemaining = (endtime: number) => {
    // @ts-ignore
    const total = Date.parse(new Date(endtime)) - Date.parse(new Date())
    const seconds = Math.floor((total / 1000) % 60)
    const minutes = Math.floor((total / 1000 / 60) % 60)
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
    const days = Math.floor(total / (1000 * 60 * 60 * 24))
  
    return {
        total,
        days,
        hours,
        minutes,
        seconds
    }
}

export function timeSince(timestamp: number, lang: string = "en") {
    const date = new Date(timestamp).getTime()
    const seconds = Math.floor((Date.now() - date) / 1000)
    let interval = seconds / 31536000
  
    if(interval > 1){
        return Math.floor(interval) + " years ago"
    }

    interval = seconds / 2592000

    if(interval > 1){
        return Math.floor(interval) + " months ago"
    }

    interval = seconds / 86400

    if(interval > 1){
        return Math.floor(interval) + " days ago"
    }

    interval = seconds / 3600

    if(interval > 1){
        return Math.floor(interval) + " hours ago"
    }

    interval = seconds / 60

    if(interval > 1){
        return Math.floor(interval) + " minutes ago"
    }

    return Math.floor(seconds) + " seconds ago"
}

export const base64ToArrayBuffer = (base64: string) => {
    const binary_string = globalThis.atob(base64)
    const len = binary_string.length
    const bytes = new Uint8Array(len)

    for(let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }

    return bytes.buffer
}

export function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
    let base64 = ""
    const encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    const bytes = new Uint8Array(arrayBuffer)
    const byteLength = bytes.byteLength
    const byteRemainder = byteLength % 3
    const mainLength = byteLength - byteRemainder
    let a, b, c, d
    let chunk
  
    for(let i = 0; i < mainLength; i = i + 3){
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
        a = (chunk & 16515072) >> 18
        b = (chunk & 258048) >> 12
        c = (chunk & 4032) >> 6
        d = chunk & 63
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }
  
    if(byteRemainder == 1){
        chunk = bytes[mainLength]
        a = (chunk & 252) >> 2
        b = (chunk & 3) << 4
        base64 += encodings[a] + encodings[b] + "=="
    }

    else if(byteRemainder == 2){
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
        a = (chunk & 64512) >> 10
        b = (chunk & 1008) >> 4
        c = (chunk & 15) << 2
        base64 += encodings[a] + encodings[b] + encodings[c] + "="
    }
    
    return base64
}

export const compareVersions = (current: string, got: string) => {
	const compare = (a: string, b: string) => {
		if(a == b){
		    return 0
		}
	
		const aComp = a.split(".")
		const bComp = b.split(".")
		const len = Math.min(aComp.length, bComp.length)

		for(let i = 0; i < len; i++){
			if(parseInt(aComp[i]) > parseInt(bComp[i])){
				return 1
			}
	
			if(parseInt(aComp[i]) < parseInt(bComp[i])){
				return -1
			}
		}
	
		if(aComp.length > bComp.length){
			return 1
		}
	
		if(aComp.length < bComp.length){
			return -1
		}
	
		return 0
	}

	if(compare(current, got) == -1){
		return "update"
	}
	
    return "ok"
}

export const convertArrayBufferToBinaryString = (u8Array: any) => {
    let i, len = u8Array.length, binary = ""

    for(i = 0; i < len; i++){
        binary += String.fromCharCode(u8Array[i])
    }

    return binary
}

export const convertWordArrayToArrayBuffer = (wordArray: any) => {
    let arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : []
    let length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4
    let uInt8Array = new Uint8Array(length), index=0, word, i

    for(i = 0; i < length; i++){
        word = arrayOfWords[i]

        uInt8Array[index++] = word >> 24
        uInt8Array[index++] = (word >> 16) & 0xff
        uInt8Array[index++] = (word >> 8) & 0xff
        uInt8Array[index++] = word & 0xff
    }

    return uInt8Array
}

export const getAvailableFolderColors = () => {
    return {
        "default": "#f6c358",
        "blue": "#2992E5",
        "green": "#57A15B",
        "purple": "#8E3A9D",
        "red": "#CB2E35",
        "gray": "gray"
    }
}

export const getFolderColor = (color: string) => {
    const colors: any = getAvailableFolderColors()

    if(typeof colors[color] !== "undefined"){
        return colors[color]
    }

    return colors['default']
}

export const simpleDate = (timestamp: number): string => {
    try{
        return new Date(convertTimestampToMs(timestamp)).toString().split(" ").slice(0, 5).join(" ")
    }
    catch(e){
        return new Date().toString().split(" ").slice(0, 5).join(" ")
    }
}

export const randomIdUnsafe = () => {
    return Math.random().toString().slice(3)
}

export const canCompressThumbnail = (ext: string) => {
    switch(ext.toLowerCase()){
        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
        case "svg":
        case "mp4":
        case "webm":
        //case "heif":
        //case "heic":
            return true
        break
        default:
            return false
        break
    }
}

export const canShowThumbnail = (ext: string) => {
    switch(ext.toLowerCase()){
        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
        case "svg":
        case "mp4":
        case "webm":
        //case "heif":
        //case "heic":
            return true
        break
        default:
            return false
        break
    }
}

export const getFilePreviewType = (ext: string) => {
    ext = ext.split(".").join("")

    switch(ext.toLowerCase()){
        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
        case "svg":
        case "heic":
        case "heif":
            return "image"
        break
        case "mp3":
        case "wav":
        case "ogg":
            return "audio"
        break
        case "mp4":
        case "mov":
        case "webm":
        case "ogv":
            return "video"
        break
        case "json":
        case "swift":
        case "m":
        case "js":
        case "md":
        case "php":
        case "css":
        case "c":
        case "perl":
        case "html":
        case "html5":
        case "jsx":
        case "php5":
        case "yml":
        case "md":
        case "xml":
        case "sql":
        case "java":
        case "csharp":
        case "dist":
        case "py":
        case "cc":
        case "cpp":
        case "log":
        case "conf":
        case "cxx":
        case "ini":
        case "lock":
        case "bat":
        case "sh":
        case "properties":
        case "cfg":
        case "ahk":
        case "ts":
        case "tsx":
            return "text"
        break
        case "txt":
        case "rtf":
          return "text"
        break
        case "pdf":
            return "pdf"
        break
        case "docx":
        case "doc":
        case "csv":
        case "ppt":
        case "pptx":
        case "xls":
        case "xlsx":
        case "bmp":
        case "tiff":
            //return "doc"
            return "none"
        break
        default:
            return "none"
        break
    }
}

export const orderItemsByType = (items: ItemProps[], type: "nameAsc" | "sizeAsc" | "dateAsc" | "typeAsc" | "nameDesc" | "sizeDesc" | "dateDesc" | "typeDesc" | "lastModifiedAsc" | "lastModifiedDesc", href?: string) => {
    const files = []
    const folders = []

    for(let i = 0; i < items.length; i++){
        if(items[i].type == "file"){
            files.push(items[i])
        }
        else{
            folders.push(items[i])
        }
    }

    if(typeof href == "string" && href.indexOf("recent") !== -1){
        const sortedFiles = files.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }

    if(type == "nameAsc" || typeof type == "undefined" || type == null){
        const sortedFiles = files.sort((a, b) => {
            return a.name.localeCompare(b.name, "en", { numeric: true })
        })

        const sortedFolders = folders.sort((a, b) => {
            return a.name.localeCompare(b.name, "en", { numeric: true })
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "sizeAsc"){
        const sortedFiles = files.sort((a, b) => {
            return a.size - b.size
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "dateAsc"){
        const sortedFiles = files.sort((a, b) => {
            return a.lastModifiedSort - b.lastModifiedSort
        })

        const sortedFolders = folders.sort((a, b) => {
            return a.timestamp - b.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "typeAsc"){
        const sortedFiles = files.sort((a, b) => {
            if(typeof a.mime == "undefined"){
                a.mime = "_"
            }

            if(typeof b.mime == "undefined"){
                b.mime = "_"
            }

            if(a.mime.length <= 1){
                a.mime = "_"
            }

            if(b.mime.length <= 1){
                b.mime = "_"
            }

            return a.mime.localeCompare(b.mime, "en", { numeric: true })
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "nameDesc"){
        const sortedFiles = files.sort((a, b) => {
            return b.name.localeCompare(a.name, "en", { numeric: true })
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.name.localeCompare(a.name, "en", { numeric: true })
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "sizeDesc"){
        const sortedFiles = files.sort((a, b) => {
            return b.size - a.size
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "typeDesc"){
        const sortedFiles = files.sort((a, b) => {
            if(typeof a.mime == "undefined"){
                a.mime = "_"
            }

            if(typeof b.mime == "undefined"){
                b.mime = "_"
            }

            if(a.mime.length <= 1){
                a.mime = "_"
            }

            if(b.mime.length <= 1){
                b.mime = "_"
            }

            return b.mime.localeCompare(a.mime, "en", { numeric: true })
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "lastModifiedAsc"){
        const sortedFiles = files.sort((a, b) => {
            return a.lastModifiedSort - b.lastModifiedSort
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "lastModifiedDesc"){
        const sortedFiles = files.sort((a, b) => {
            return b.lastModifiedSort - a.lastModifiedSort
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "dateDesc"){
        const sortedFiles = files.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        const sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else{
        const sortedFiles = files.sort((a, b) => {
            return a.name.localeCompare(b.name, "en", { numeric: true })
        })

        const sortedFolders = folders.sort((a, b) => {
            return a.name.localeCompare(b.name, "en", { numeric: true })
        })

        return sortedFolders.concat(sortedFiles)
    }
}

export const utf8ToHex = (str: string) => {
    return Array.from(str).map(c => 
        c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) : encodeURIComponent(c).replace(/\%/g, "").toLowerCase()
    ).join('')
}

export function replaceAll(str: string, find: string, replace: string) {
    return str.replace(new RegExp(find, "g"), replace)
}

export const getFileExt = (name: string) => {
    if(name.indexOf(".") == -1){
        return ""
    }

    const ex = name.split(".")

    return ex[ex.length - 1].toLowerCase()
}

export const getImageForFileByExt = (ext: string) => {
    switch(ext){
        case "pdf":
            return require("../../assets/files/pdf.png")
        break
        case "doc":
        case "docx":
            return require("../../assets/files/doc.png")
        break
        case "exe":
            return require("../../assets/files/exe.png")
        break
        case "mp3":
            return require("../../assets/files/mp3.png")
        break
        case "json":
            return require("../../assets/files/json-file.png")
        break
        case "png":
            return require("../../assets/files/png.png")
        break
        //case "ico":
        //  return require("../../assets/files/ico.png")
        //break
        case "txt":
            return require("../../assets/files/txt.png")
        break
        case "jpg":
        case "jpeg":
            return require("../../assets/files/jpg.png")
        break
        case "iso":
            return require("../../assets/files/iso.png")
        break
        case "js":
            return require("../../assets/files/javascript.png")
        break
        case "html":
            return require("../../assets/files/html.png")
        break
        case "css":
            return require("../../assets/files/css.png")
        break
        case "csv":
            return require("../../assets/files/csv.png")
        break
        case "avi":
            return require("../../assets/files/avi.png")
        break
        case "mp4":
            return require("../../assets/files/mp4.png")
        break
        case "ppt":
            return require("../../assets/files/ppt.png")
        break
        case "zip":
            return require("../../assets/files/zip.png")
        break
        case "rar":
        case "tar":
        case "tgz":
        case "gz":
        case "gzip":
            return require("../../assets/files/zip-1.png")
        break
        case "svg":
            return require("../../assets/files/svg.png")
        break
        case "xml":
            return require("../../assets/files/xml.png")
        break
        case "dwg":
            return require("../../assets/files/dwg.png")
        break
        case "fla":
            return require("../../assets/files/fla.png")
        break
        case "ai":
            return require("../../assets/files/ai.png")
        break
        default:
            return require("../../assets/files/file.png")
        break
    }
}

export const safeAwait = async <T>(promise: Promise<T>): Promise<[Error | null, T]> => {
    try{
        const result = await promise

        return [null, result]
    }
    catch(e){
        return [e as Error, null as any as T]
    }
}

export const getCurrentParent = (href?: string): string => {
    let ex: string[] = []

    if(href){
        ex = href.split("/")
    }
    else{
        ex = window.location.href.split("/")
    }

    return ex[ex.length - 1]
}

export const buildBreadcrumbHashLink = (uuid: string): string => {
    const ex = window.location.hash.split("/")

    if(ex.indexOf(uuid) !== -1){
        return ex.slice(0, ex.indexOf(uuid) + 1).join("/")
    }
    else{
        return window.location.hash + "/" + uuid
    }
}

export const readChunk = (file: File, chunkIndex: number, chunkSize: number): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader()

        fileReader.onloadend = () => {
            if(typeof fileReader.result == "string" || fileReader.result == null){
                return resolve(new ArrayBuffer(0))
            }

            return resolve(fileReader.result as ArrayBuffer)
        }

        fileReader.onerror = (err) => {
            return reject(err)
        }

        const offset = (chunkSize * chunkIndex)

        fileReader.readAsArrayBuffer(file.slice(offset, (offset + chunkSize)))
    })
}

export const getCurrentURLParentFolder = (): string => {
    const ex = window.location.href.split("/")

    return ex[ex.length - 1]
}

export const pathGetDirname = (path: string) => {
	const ex = path.split("/")
  
    if(ex.length <= 1){
  	    return "."
    }
  
    ex.pop()
  
    return ex.join("/")
}

export const pathGetBasename = (path: string) => {
	const ex = path.split("/")
  
    if(ex.length <= 1){
  	    return path
    }
  
    return ex.pop() || path
}

export const getEveryPossibleFolderPathFromPath = (path: string) => {
    const ex = path.split("/")
  
    if(ex.length <= 1){
  	    return [path]
    }

    const paths: string[] = []

    for(let i = 0; i < ex.length; i++){
        const toJoin = []
    
        for(let x = 0; x < (i + 1); x++){
            toJoin.push(ex[x])
        }
        
        paths.push(toJoin.join("/"))
    }

    if(paths.length <= 0){
        return [path]
    }

    return paths
}

async function getAllFileEntries(dataTransferItemList: DataTransferItemList){
    const fileEntries = []
    const queue = []

    for(let i = 0; i < dataTransferItemList.length; i++){
        queue.push(dataTransferItemList[i].webkitGetAsEntry())
    }

    while(queue.length > 0){
        const entry: any = queue.shift()
        
        if(entry){
            if(typeof entry.isFile !== "undefined" && typeof entry.isDirectory !== "undefined"){
                if(entry.isFile){
                    fileEntries.push(entry)
                }
                else if(entry.isDirectory){
                    const reader: any = entry.createReader()
        
                    queue.push(...await readAllDirectoryEntries(reader))
                }
            }
        }
    }

    return fileEntries
}

async function readAllDirectoryEntries(directoryReader: any){
    const entries = []
    let readEntries: any = await readEntriesPromise(directoryReader)

    while(readEntries.length > 0){
        entries.push(...readEntries)
        readEntries = await readEntriesPromise(directoryReader)
    }

    return entries
}

async function readEntriesPromise(directoryReader: any) {
    try{
        return await new Promise((resolve, reject) => {
            directoryReader.readEntries(resolve, reject)
        })
    }
    catch(e){
        console.log(e)
    }
}

export const readLocalDroppedDirectory = (items: DataTransferItemList): Promise<UploadQueueItemFile[]> => {
    return new Promise(async (resolve, reject) => {
        const list = await getAllFileEntries(items)
        const fileList = list.flat(Number.MAX_SAFE_INTEGER)
        const files: UploadQueueItemFile[] = []

        for(let i = 0; i < fileList.length; i++){
            try{
                const file = fileList[i]

                if(file && typeof file.file == "function"){
                    const fileEntry = await new Promise((resolve, reject) => {
                        file.file((fEntry: any) => {
                            try{
                                if(typeof file.isFile == "function" && file.isFile()){
                                    Object.defineProperty(fEntry, "fullPath", {
                                        value: file.name,
                                        writable: true
                                    })
                    
                                    files.push(fEntry as UploadQueueItemFile)
                                }
                                else{
                                    Object.defineProperty(fEntry, "fullPath", {
                                        value: file.fullPath.slice(1),
                                        writable: true
                                    })
                                }
        
                                return resolve(fEntry)
                            }
                            catch(e){
                                return reject(e)
                            }
                        })
                    })
    
                    files.push(fileEntry as UploadQueueItemFile)
                }
            }
            catch(e){
                return reject(e)
            }
        }

        return resolve(files)
    })
}

export function downloadObjectAsJson(exportObj: any, exportName: string){
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, undefined, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function downloadObjectAsText(string: string, exportName: string){
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(string);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".txt");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export const downloadPDF = (pdf: string, name: string) => {
    let linkSource = `data:application/pdf;base64,${pdf}`
    let downloadLink = document.createElement("a")
    let fileName = name + ".pdf"

    downloadLink.href = linkSource
    downloadLink.download = fileName

    return downloadLink.click()
}

export const areBuffersEqual = (first: Uint8Array, second: Uint8Array) => first.length === second.length && first.every((value, index) => value === second[index])

export const firstToLowerCase = (str: string) => {
    return str.charAt(0).toLowerCase() + str.slice(1)
}

export const getLang = (): string => {
    const cookie = cookies.get("lang")

    return typeof cookie == "string" ? cookie as string : "en"
}

export const debounceByParam = (targetFunc: any, resolver: any, ...debounceParams: any) => {
    wrap(
        memoize(
            () => debounce(targetFunc, ...debounceParams),
            resolver
        ),
        (getMemoizedFunc: any, ...params: any) => {
            getMemoizedFunc(...params)(...params)
        }
    )
}