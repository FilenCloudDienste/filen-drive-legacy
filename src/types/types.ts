import type { ButtonProps as ChakraButtonProps, InputProps as ChakraInputProps, TextProps } from "@chakra-ui/react"
import type { ReactElement } from "react"
import type { MouseEventHandler } from "react"

export interface AppBaseProps {
    windowWidth: number,
    windowHeight: number,
    darkMode: boolean,
    isMobile: boolean,
    lang: string
}

export interface AppTextProps extends TextProps {
    children: any,
    darkMode: boolean,
    isMobile: boolean
}

export interface BreadcrumbsProps {
    darkMode: boolean,
    isMobile: boolean,
    lang: string,
    gridFolders: any,
    setGridFolders: (value: any) => Promise<boolean>,
    items: ItemProps[]
}

export interface BreadcrumbProps {
    darkMode: boolean,
    isMobile: boolean,
    crumb: {
        uuid: string,
        name: string
    },
    index: number,
    length: number,
    lang: string
}

export interface AppButtonProps extends ChakraButtonProps {
    darkMode: boolean,
    isMobile: boolean,
    colorMode?: string
}

export interface ContextMenusProps {
    darkMode: boolean,
    isMobile: boolean,
    items: ItemProps[],
    lang: string
}

export interface DragSelectState {
    start: {
        clientX: number,
        clientY: number
    },
    current: {
        clientX: number,
        clientY: number
    }
}

export interface DragSelectProps {
    darkMode: boolean,
    dragSelectState: DragSelectState
}

export interface InputProps extends ChakraInputProps {
    darkMode: boolean,
    isMobile: boolean
}

export interface ItemReceiver {
    id: number,
    email: string
}

export interface ItemProps {
    root: string,
    type: "file" | "folder",
    uuid: string,
    name: string,
    size: number,
    mime: string,
    lastModified: number,
    lastModifiedSort: number,
    timestamp: number,
    selected: boolean,
    color: FolderColors,
    parent: string,
    rm: string,
    version: number,
    sharerEmail: string,
    sharerId: number,
    receiverEmail: string,
    receiverId: number,
    writeAccess: boolean,
    chunks: number,
    favorited: 0 | 1,
    key: string,
    bucket: string,
    region: string,
    linkUUID?: string,
    linkHasPassword?: boolean,
    linkPassword?: string,
    linkSalt?: string,
    linkKey?: string,
    receivers?: ItemReceiver[]
}

export const ItemTemplate: ItemProps = {
    root: "",
    type: "file",
    uuid: "",
    name: "template",
    size: 1,
    mime: "text/plain",
    lastModified: 0,
    lastModifiedSort: 0,
    timestamp: 0,
    selected: false,
    color: "default",
    parent: "base",
    rm: "",
    version: 0,
    sharerEmail: "",
    sharerId: 0,
    receiverEmail: "",
    receiverId: 0,
    writeAccess: false,
    chunks: 0,
    favorited: 0,
    key: "",
    bucket: "",
    region: ""
}

export interface ItemDragState {
    clientX: number,
    clientY: number,
    items: ItemProps[]
}

export interface ItemComponentProps {
    darkMode: boolean,
    isMobile: boolean,
    style: React.CSSProperties,
    item: ItemProps,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    setActiveItem: React.Dispatch<React.SetStateAction<ItemProps | null>>,
    setItemDragState: React.Dispatch<React.SetStateAction<ItemDragState>>,
    setDragSelectState: React.Dispatch<React.SetStateAction<DragSelectState>>,
    listWidth: number,
    mode: "list" | "grid",
    lang: string
}

export interface SkeletonItemProps {
    darkMode: boolean,
    isMobile: boolean,
    style: React.CSSProperties,
    listWidth: number,
    mode: "list" | "grid"
}

export interface ItemDragTooltipProps {
    darkMode: boolean,
    isMobile: boolean,
    itemDragState: ItemDragState
}

export interface ListProps {
    darkMode: boolean,
    isMobile: boolean,
    windowHeight: number,
    windowWidth: number,
    sidebarWidth: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    setActiveItem: React.Dispatch<React.SetStateAction<ItemProps | null>>,
    setItemDragState: React.Dispatch<React.SetStateAction<ItemDragState>>,
    setDragSelectState: React.Dispatch<React.SetStateAction<DragSelectState>>,
    loadingItems: boolean,
    gridFolders: any,
    lang: string
}

export interface ListScrollState {
    scrollHeight: number,
    clientHeight: number,
    scrollTop: number
}

export interface ListFooterProps {
    darkMode: boolean,
    isMobile: boolean,
    items: ItemProps[],
    loadingItems: boolean,
    listScrollState: ListScrollState,
    windowWidth: number,
    sidebarWidth: number,
    lang: string
}

export interface ListHeaderProps {
    darkMode: boolean,
    isMobile: boolean,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    loadingItems: boolean,
    listWidth: number,
    lang: string
}

export interface PreviewModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface RenameModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface PublicLinkModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface CreateFolderModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface DeleteModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface EventInfoModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    lang: string
}

export interface ShareModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface StopSharingModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface RemoveSharedInModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface MoveModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    lang: string
}

export interface VersionsModalProps {
    darkMode: boolean,
    isMobile: boolean,
    lang: string
}

export interface SidebarBaseProps {
    darkMode: boolean,
    isMobile: boolean
}

export interface SidebarProps extends SidebarBaseProps {
    sidebarWidth: number,
    windowHeight: number,
    lang: string,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    setActiveItem: React.Dispatch<React.SetStateAction<ItemProps | null>>
}

export interface DividerProps {
    darkMode: boolean,
    marginTop: number,
    marginBottom: number
}

export interface ButtonProps extends SidebarBaseProps {
    type: string,
    text: string,
    to: string
}

export interface AccountButtonProps extends SidebarBaseProps {

}

export interface CloudTreeProps extends SidebarBaseProps {
    parent: ItemProps,
    depth: number,
    sidebarFolderOpen: {
        [key: string]: boolean | undefined | null
    },
    setSidebarFolderOpen: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
    path: string,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    setActiveItem: React.Dispatch<React.SetStateAction<ItemProps | null>>
}

export interface SidebarFolderOpenProps {
    [key: string]: boolean | undefined | null
}

export interface CloudTreeItemProps extends SidebarBaseProps {
    parent: ItemProps,
    depth: number,
    folders: ItemProps[],
    sidebarFolderOpen: SidebarFolderOpenProps,
    setSidebarFolderOpen: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
    loading: boolean,
    path: string,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    setActiveItem: React.Dispatch<React.SetStateAction<ItemProps | null>>
}

export interface TopbarProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    lang: string,
    searchTerm: string,
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>
}

export interface TopbarMenuProps {
    darkMode: boolean,
    isMobile: boolean,
    lang: string
}

export interface TopbarMenuItemProps {
    darkMode: boolean,
    text: string,
    onClick: MouseEventHandler<HTMLButtonElement>,
    icon: ReactElement<any>
}

export interface TransfersToastProps {
    darkMode: boolean,
    isMobile: boolean,
    lang: string
}

export interface AuthContainerProps extends AppBaseProps {
    children: any
}

export interface UploadModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    lang: string,
    items: ItemProps[]
}

export interface DeletePermanentlyModalProps {
    darkMode: boolean,
    isMobile: boolean,
    windowWidth: number,
    windowHeight: number,
    lang: string,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>
}

export interface UploadQueueItemFile extends File {
    fullPath: string
}

export interface UploadQueueItem {
    file: UploadQueueItemFile,
    uuid: string,
    bytes: number
}

export interface UploadModalListProps {
    darkMode: boolean,
    isMobile: boolean,
    currentUploads: CurrentUpload[],
    lang: string
}

export interface UploadModalListItemProps {
    darkMode: boolean,
    isMobile: boolean,
    item: CurrentUpload,
    style: React.CSSProperties,
    lang: string
}

export interface UploadModalListItemActionsProps {
    darkMode: boolean,
    isMobile: boolean,
    item: CurrentUpload,
    paused: boolean,
    progress: number,
    setPaused: React.Dispatch<React.SetStateAction<boolean>>
}

export interface CurrentUpload {
    file: UploadQueueItemFile,
    bytes: number,
    lastBps: number,
    lastTime: number,
    percent: number,
    started: number,
    timeLeft: number,
    timestamp: number,
    uuid: string,
    done?: boolean,
    errored?: boolean
}
export interface UseTransfers {
    currentUploads: { [key: string]: CurrentUpload },
    currentDownloads: { [key: string]: CurrentDownload }
}

export interface UseTransfersParams {
    onUploadStart?: (upload: Upload) => any,
    onUploadStarted?: (upload: Upload) => any,
    onUploadDone?: (upload: Upload) => any,
    onUploadError?: (upload: Upload) => any,
    onDownloadStart?: (download: Download) => any,
    onDownloadStarted?: (download: Download) => any,
    onDownloadDone?: (download: Download) => any,
    onDownloadError?: (download: Download) => any,
    onUploadProgress?: (progress: ProgressData) => any,
    onDownloadProgress?: (progress: ProgressData) => any,
    onTransferStopped?: (uuid: string) => any 
}

export interface Upload {
    type: string,
    data: UploadQueueItem
}

export interface Download {
    type: string,
    data: ItemProps
}

export interface CurrentDownload {
    file: ItemProps,
    bytes: number,
    lastBps: number,
    lastTime: number,
    percent: number,
    started: number,
    timeLeft: number,
    timestamp: number,
    uuid: string,
    done?: boolean
}

export interface ProgressData {
    type: string,
    data: {
        uuid: string,
        bytes: number
    }
}

export type CustomToastTypes = "success" | "error" | "transfers" | "creatingFolders" | "loading"

export interface CreateFolderEvent {
    type: "start" | "started" | "err" | "done",
    data: {
        uuid: string,
        name: string,
        parent: string
    },
    err?: string
}

export interface FolderRenamedEvent {
    item: ItemProps,
    to: string
}

export interface FileRenamedEvent {
    item: ItemProps,
    to: string
}

export interface SeparateFolderContextMenuItem {
    uuid: string
}

export interface ItemTrashedEvent {
    item: ItemProps
}

export interface FolderCreatedEvent {
    uuid: string,
    name: string,
    parent: string
}

export interface ItemFavoritedEvent {
    item: ItemProps,
    favorited: 0 | 1
}

export interface SidebarUsageProps {
    darkMode: boolean,
    isMobile: boolean,
    sidebarWidth: number,
    lang: string
}

export interface UploadMarkedDoneEvent {
    uuid: string
}

export interface ItemMovedEvent {
    item: ItemProps,
    from: string,
    to: string
}

export interface MoveSubmenuProps {
    parent: string,
    load: boolean,
    uuid: string,
    darkMode: boolean,
    isMobile: boolean,
    items: ItemProps[],
    lang: string
}

export interface SelectFromComputerProps {
    darkMode: boolean,
    isMobile: boolean,
    lang: string,
    mode?: "text" | "uploadButton"
}

export interface UploadButtonProps {
    darkMode: boolean,
    isMobile: boolean,
    lang: string,
    enabled: boolean
}

export interface ItemRestoredEvent {
    item: ItemProps
}

export type KeyValues = { key: string, data: ItemProps[] }[]
export type MetadataOpsItems = { item: ItemProps, parent: string }[]
export type MetadataOpsChangeItems = { item: ItemProps, change: any }[]

export interface FileUploadedEvent {
    item: ItemProps
}

export interface AddFolderEvent {
    item: ItemProps
}

export type FolderColors = "default" | "blue" | "green" | "purple" | "red" | "gray"

export interface ItemColorChangedEvent {
    item: ItemProps,
    color: FolderColors
}

export interface ItemUpdatedEvent {
    uuid: string,
    updated: ItemProps
}

export interface ListBodyProps {
    darkMode: boolean,
    isMobile: boolean,
    gridFolders: any,
    windowHeight: number,
    windowWidth: number,
    sidebarWidth: number,
    setListScrollState: React.Dispatch<React.SetStateAction<ListScrollState>>,
    loadingItems: boolean,
    items: ItemProps[],
    setItems: React.Dispatch<React.SetStateAction<ItemProps[]>>,
    setActiveItem: React.Dispatch<React.SetStateAction<ItemProps | null>>,
    setItemDragState: React.Dispatch<React.SetStateAction<ItemDragState>>,
    setDragSelectState: React.Dispatch<React.SetStateAction<DragSelectState>>,
    lang: string
}

export interface AccountProps {
    darkMode: boolean,
    isMobile: boolean,
    windowHeight: number,
    windowWidth: number,
    sidebarWidth: number,
    lang: string
}

export interface UserEvent {
    id: number,
    info: {
        ip: string,
        userAgent: string
    },
    timestamp: number,
    type: string,
    uuid: string
}

export interface FolderColorChangedEvent {
    uuid: string,
    color: FolderColors
}

export type PaymentMethods = "paypal" | "stripe" | "crypto"