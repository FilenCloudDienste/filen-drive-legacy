import { SOCKET } from "../../constants"
// @ts-ignore
import io from "socket.io-client"
import eventListener from "../../eventListener"
import db from "../../db"
import cookies from "../../cookies"
import type { FolderColors } from "../../../types"

export interface SocketNewEvent {
    uuid: string,
    type: string,
    timestamp: number,
    info: {
        ip: string,
        metadata: string,
        userAgent: string,
        uuid: string
    }
}

export interface SocketFileRename {
    uuid: string,
    metadata: string
}

export interface SocketFileArchiveRestored {
    currentUUID: string,
    parent: string,
    uuid: string,
    metadata: string,
    rm: string,
    timestamp: number,
    chunks: number,
    bucket: string,
    region: string,
    version: number,
    favorited: 0 | 1
}

export interface SocketFileNew {
    parent: string,
    uuid: string,
    metadata: string,
    rm: string,
    timestamp: number,
    chunks: number,
    bucket: string,
    region: string,
    version: number,
    favorited: 0 | 1
}

export interface SocketFileRestore {
    parent: string,
    uuid: string,
    metadata: string,
    rm: string,
    timestamp: number,
    chunks: number,
    bucket: string,
    region: string,
    version: number,
    favorited: 0 | 1
}

export interface SocketFileMove {
    parent: string,
    uuid: string,
    metadata: string,
    rm: string,
    timestamp: number,
    chunks: number,
    bucket: string,
    region: string,
    version: number,
    favorited: 0 | 1
}

export interface SocketFileTrash {
    uuid: string
}

export interface SocketFileArchived {
    uuid: string
}

export interface SocketFolderRename {
    name: string,
    uuid: string
}

export interface SocketFolderTrash {
    parent: string,
    uuid: string
}

export interface SocketFolderMove {
    name: string,
    uuid: string,
    parent: string,
    timestamp: number,
    favorited: 0 | 1
}

export interface SocketFolderSubCreated {
    name: string,
    uuid: string,
    parent: string,
    timestamp: number,
    favorited: 0 | 1
}

export interface SocketFolderRestore {
    name: string,
    uuid: string,
    parent: string,
    timestamp: number,
    favorited: 0 | 1
}

export interface SocketFolderColorChanged {
    uuid: string,
    color: FolderColors
}

export type SocketEvent = {
    type: "newEvent",
    data: SocketNewEvent
} | {
    type: "fileRename",
    data: SocketFileRename
} | {
    type: "fileArchiveRestored",
    data: SocketFileArchiveRestored
} | {
    type: "fileNew",
    data: SocketFileNew
} | {
    type: "fileRestore",
    data: SocketFileRestore
} | {
    type: "fileMove",
    data: SocketFileMove
} | {
    type: "fileTrash",
    data: SocketFileTrash
} | {
    type: "fileArchived",
    data: SocketFileArchived
} | {
    type: "folderRename",
    data: SocketFolderRename
} | {
    type: "folderTrash",
    data: SocketFolderTrash
} | {
    type: "folderMove",
    data: SocketFolderMove
} | {
    type: "folderSubCreated",
    data: SocketFolderSubCreated
} | {
    type: "folderRestore",
    data: SocketFolderRestore
} | {
    type: "folderColorChanged",
    data: SocketFolderColorChanged
} | {
    type: "trashEmpty"
}

let CONNECTED: boolean = false
let PING_INTERVAL: any = undefined
let SOCKET_HANDLE: any = undefined

export const connect = () => {
    CONNECTED = false
    SOCKET_HANDLE = undefined

    clearInterval(PING_INTERVAL)

    SOCKET_HANDLE = io(SOCKET, {
        path: "",
        reconnect: true,
        reconnection: true,
        transports: [
            "websocket"
        ],
        upgrade: false
    })
    
    SOCKET_HANDLE.on("connect", async () => {
        CONNECTED = true
    
        console.log("Connected to socket server")
    
        const loggedIn = cookies.get("loggedIn")
    
        if(loggedIn == "true"){
            SOCKET_HANDLE.emit("auth", {
                apiKey: await db.get("apiKey") || ""
            })
        
            clearInterval(PING_INTERVAL)
        
            PING_INTERVAL = setInterval(() => {
                SOCKET_HANDLE.emit("heartbeat")
            }, 5000)
        }
    })
    
    SOCKET_HANDLE.on("disconnect", () => {
        CONNECTED = false
    
        console.log("Disconnected from socket server")
    })
    
    SOCKET_HANDLE.on("new-event", (data: SocketNewEvent) => {
        eventListener.emit("socketEvent", {
            type: "newEvent",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("file-rename", (data: SocketFileRename) => {
        eventListener.emit("socketEvent", {
            type: "fileRename",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("file-archive-restored", (data: SocketFileArchiveRestored) => {
        eventListener.emit("socketEvent", {
            type: "fileArchiveRestored",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("file-new", (data: SocketFileNew) => {
        eventListener.emit("socketEvent", {
            type: "fileNew",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("file-new", (data: SocketFileNew) => {
        eventListener.emit("socketEvent", {
            type: "fileNew",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("file-move", (data: SocketFileMove) => {
        eventListener.emit("socketEvent", {
            type: "fileMove",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("file-trash", (data: SocketFileTrash) => {
        eventListener.emit("socketEvent", {
            type: "fileTrash",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("file-archived", (data: SocketFileArchived) => {
        eventListener.emit("socketEvent", {
            type: "fileArchived",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("folder-rename", (data: SocketFolderRename) => {
        eventListener.emit("socketEvent", {
            type: "folderRename",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("folder-trash", (data: SocketFolderTrash) => {
        eventListener.emit("socketEvent", {
            type: "folderTrash",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("folder-move", (data: SocketFolderMove) => {
        eventListener.emit("socketEvent", {
            type: "folderMove",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("folder-sub-created", (data: SocketFolderSubCreated) => {
        eventListener.emit("socketEvent", {
            type: "folderSubCreated",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("folder-restore", (data: SocketFolderRestore) => {
        eventListener.emit("socketEvent", {
            type: "folderRestore",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("folder-color-changed", (data: SocketFolderColorChanged) => {
        eventListener.emit("socketEvent", {
            type: "folderColorChanged",
            data
        } as SocketEvent)
    })
    
    SOCKET_HANDLE.on("trash-empty", () => {
        eventListener.emit("socketEvent", {
            type: "trashEmpty"
        } as SocketEvent)
    })
}

connect()