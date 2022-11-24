import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Flex, Avatar, Spinner, Progress, CircularProgress } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../../components/AppText"
import { IoTrash, IoCloud, IoFolderOpen, IoFolder, IoChevronDown, IoChevronForward } from "react-icons/io5"
import { RiFolderSharedFill, RiLink, RiFolderReceivedFill } from "react-icons/ri"
import { MdOutlineFavorite } from "react-icons/md"
import { HiClock } from "react-icons/hi"
import type { SidebarProps, DividerProps, ButtonProps, AccountButtonProps, CloudTreeProps, CloudTreeItemProps, ItemProps, ItemMovedEvent, FolderRenamedEvent, ItemColorChangedEvent, ItemTrashedEvent, FolderCreatedEvent, SidebarUsageProps, UserInfoV1 } from "../../types"
import { loadSidebarItems } from "../../lib/services/items"
import { getFolderColor, getCurrentParent, formatBytes } from "../../lib/helpers"
import db from "../../lib/db"
import { CHAKRA_COLOR_SCHEME, DROP_NAVIGATION_TIMEOUT } from "../../lib/constants"
import eventListener from "../../lib/eventListener"
import { debounce } from "lodash"
import { fetchUserInfo } from "../../lib/services/user"
import { moveToParent } from "../../lib/services/move"
import { i18n } from "../../i18n"
import { contextMenu } from "react-contexify"
import type { SocketEvent } from "../../lib/services/socket"
import memoryCache from "../../lib/memoryCache"

export const Divider = memo(({ darkMode, marginTop, marginBottom }: DividerProps) => {
    return (
        <Flex
            width="100%"
            height="1px"
            backgroundColor={getColor(darkMode, "borderSecondary")}
            marginTop={marginTop + "px"}
            marginBottom={marginBottom + "px"}
        >
            &nbsp;
        </Flex>
    )
})

export const Button = memo(({ darkMode, isMobile, type, text, to }: ButtonProps) => {
    const navigate = useNavigate()
    const [hovering, setHovering] = useState<boolean>(false)
    const location = useLocation()

    const active: boolean = useMemo(() => {
        return "/" + location.hash == to || location.hash.indexOf(type) !== -1
    }, [location.hash])
    
    return (
        <Flex
            width="100%"
            height="40px"
            alignItems="center"
            paddingLeft="15px"
            paddingRight="15px"
            cursor="pointer"
            transition="200ms"
            justifyContent={isMobile ? "center" : "flex-start"}
            color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            backgroundColor={(hovering || active) ? getColor(darkMode, "backgroundSecondary") : "transparent"}
            onClick={() => navigate(to)}
        >
            {
                type == "cloudDrive" && (
                    <IoCloud
                        size={20}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    />
                )
            }
            {
                type == "shared-in" && (
                    <RiFolderReceivedFill
                        size={20}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    />
                )
            }
            {
                type == "shared-out" && (
                    <RiFolderSharedFill
                        size={20}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    />
                )
            }
            {
                type == "links" && (
                    <RiLink
                        size={20}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    />
                )
            }
            {
                type == "favorites" && (
                    <MdOutlineFavorite
                        size={20}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    />
                )
            }
            {
                type == "recent" && (
                    <HiClock
                        size={20}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    />
                )
            }
            {
                type == "trash" && (
                    <IoTrash
                        size={20}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    />
                )
            }
            {
                !isMobile && (
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        marginLeft="12px"
                        noOfLines={1}
                        fontSize={15}
                        fontWeight="bold"
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    >
                        {text}
                    </AppText>
                )
            }
        </Flex>
    )
})

export const AccountButton = memo(({ darkMode, isMobile }: AccountButtonProps) => {
    const navigate = useNavigate()
    const [hovering, setHovering] = useState<boolean>(false)
    const location = useLocation()

    const active: boolean = useMemo(() => {
        return location.pathname == "/account"
    }, [location.pathname])
    
    return (
        <Flex
            width="100%"
            height="40px"
            alignItems="center"
            paddingLeft="15px"
            paddingRight="15px"
            cursor="pointer"
            transition="200ms"
            borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
            color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            backgroundColor={(hovering || active) ? getColor(darkMode, "backgroundSecondary") : "transparent"}
            onClick={() => navigate("/account")}
        >
            <Avatar
                name="User"
                width="22px"
                height="22px"
            />
            {
                !isMobile && (
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        marginLeft="10px"
                        noOfLines={1}
                        color={(hovering || active) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                    >
                        user@user.com
                    </AppText>
                )
            }
        </Flex>
    )
})

export const CloudTreeItem = memo(({ darkMode, isMobile, parent, depth, folders, sidebarFolderOpen, setSidebarFolderOpen, loading, path, setItems, items, setActiveItem }: CloudTreeItemProps) => {
    const navigate = useNavigate()
    const [hovering, setHovering] = useState<boolean>(false)
    const dropNavigationTimer = useRef<number | undefined | ReturnType<typeof setTimeout>>(undefined)
    const location = useLocation()
    const currentItems = useRef<ItemProps[]>([])

    const active: boolean = useMemo(() => {
        return getCurrentParent() == parent.uuid
    }, [parent.uuid, location.hash])

    const bgHover: boolean = useMemo(() => {
        return hovering || active
    }, [hovering, active])

    const handleItemOnDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        setHovering(false)

        clearTimeout(dropNavigationTimer.current)

        dropNavigationTimer.current = undefined

        const droppedItems: ItemProps[] = memoryCache.get("draggedItems") || []

        moveToParent(droppedItems, parent.uuid)
    }, [])

    const canMove = useCallback((uuids: string[]): boolean => {
        const pathEx: string[] = path.split("/")

        for(let i = 0; i < pathEx.length; i++){
            if(uuids.includes(pathEx[i])){
                return false
            }
        }

        return true
    }, [path])

    const handleItemOnDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        const droppedItems: ItemProps[] = memoryCache.get("draggedItems") || []

        const uuids: string[] = droppedItems.map(item => item.uuid)

        if(!canMove(uuids)){
            return
        }

        setHovering(true)

        if(typeof dropNavigationTimer.current !== "number"){
            clearTimeout(dropNavigationTimer.current)

            dropNavigationTimer.current = setTimeout(() => {
                db.get("defaultDriveUUID").then((defaultDriveUUID) => {
                    navigate("/#/" + path.replace("base", defaultDriveUUID))
                }).catch(console.error)

                clearTimeout(dropNavigationTimer.current)

                dropNavigationTimer.current = undefined
            }, DROP_NAVIGATION_TIMEOUT)
        }
    }, [path])

    const handleItemOnDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        setHovering(false)

        clearTimeout(dropNavigationTimer.current)

        dropNavigationTimer.current = undefined
    }, [])

    const handleItemOnContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        const item: ItemProps = parent

        if(item.uuid == "base"){
            return
        }

        setActiveItem(item)
        setItems(prev => prev.map(mapItem => ({ ...mapItem, selected: false })))

        contextMenu.show({
            id: "sidebarContextMenu",
            event: e,
            position: {
                x: e.nativeEvent.clientX,
                y: e.nativeEvent.clientY
            }
        })
    }, [])

    useEffect(() => {
        currentItems.current = items
    }, [items])

    useEffect(() => {
        db.get("defaultDriveUUID").then((defaultDriveUUID) => {
            Promise.all([
                db.get("loadItems:" + defaultDriveUUID, "metadata"),
                db.get("loadItems:" + parent.uuid == "base" ? defaultDriveUUID : parent.uuid, "metadata"),
                db.get("loadSidebarItems:" + parent.uuid == "base" ? defaultDriveUUID : parent.uuid, "metadata")
            ]).catch(console.error)
        }).catch(console.error)

        return () => {
            clearTimeout(dropNavigationTimer.current)

            dropNavigationTimer.current = undefined
        }
    }, [])

    return (
        <Flex
            height="auto"
            width="100%"
            flexDirection="column"
        >
            <Flex
                height={parent.uuid == "base" ? "40px" : "35px"}
                width="100%"
                alignItems="center"
                paddingLeft="15px"
                paddingRight="15px"
                flexDirection="row"
                cursor="pointer"
                transition="200ms"
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                backgroundColor={bgHover ? getColor(darkMode, "backgroundSecondary") : "transparent"}
                onDragOver={handleItemOnDragOver}
                onDragLeave={handleItemOnDragLeave}
                onDrop={handleItemOnDrop}
                onContextMenu={handleItemOnContextMenu}
            >
                <Flex
                    height={parent.uuid == "base" ? "40px" : "35px"}
                    width="100%"
                    alignItems="center"
                    flexDirection="row"
                    justifyContent="flex-start"
                    cursor="pointer"
                    paddingLeft={depth * (depth == 1 ? 18 : 17) + "px"}
                >
                    {
                        loading ? (
                            <Spinner 
                                width={parent.uuid == "base" ? "16px" : "13px"}
                                height={parent.uuid == "base" ? "16px" : "13px"}
                                color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                                flexShrink={0}
                            />
                        ) : sidebarFolderOpen[parent.uuid] ? (
                            <IoChevronDown
                                size={parent.uuid == "base" ? 16 : 13}
                                color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                                onClick={() => {
                                    setSidebarFolderOpen(prev => ({
                                        ...prev,
                                        [parent.uuid]: prev[parent.uuid] ? false : true
                                    }))
                                }}
                                style={{
                                    flexShrink: 0
                                }}
                            />
                        ) : (
                            <IoChevronForward
                                size={parent.uuid == "base" ? 16 : 13}
                                color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                                onClick={() => {
                                    setSidebarFolderOpen(prev => ({
                                        ...prev,
                                        [parent.uuid]: prev[parent.uuid] ? false : true
                                    }))
                                }}
                                style={{
                                    flexShrink: 0
                                }}
                            />
                        )
                    }
                    {
                        parent.uuid == "base" ? (
                            <IoCloud
                                size={parent.uuid == "base" ? 20 : 16}
                                color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                                onClick={() => {
                                    setSidebarFolderOpen(prev => ({
                                        ...prev,
                                        [parent.uuid]: prev[parent.uuid] ? false : true
                                    }))
                                }}
                                style={{
                                    marginLeft: "6px",
                                    flexShrink: 0
                                }}
                            />
                        ) : sidebarFolderOpen[parent.uuid] ? (
                            <IoFolderOpen
                                size={parent.uuid == "base" ? 20 : 16}
                                color={getFolderColor(parent.color)}
                                onClick={() => {
                                    setSidebarFolderOpen(prev => ({
                                        ...prev,
                                        [parent.uuid]: prev[parent.uuid] ? false : true
                                    }))
                                }}
                                style={{
                                    marginLeft: "6px",
                                    flexShrink: 0
                                }}
                            />
                        ) : (
                            <IoFolder
                                size={parent.uuid == "base" ? 20 : 16}
                                color={getFolderColor(parent.color)}
                                onClick={() => {
                                    setSidebarFolderOpen(prev => ({
                                        ...prev,
                                        [parent.uuid]: prev[parent.uuid] ? false : true
                                    }))
                                }}
                                style={{
                                    marginLeft: "6px",
                                    flexShrink: 0
                                }}
                            />
                        )
                    }
                    {
                        !isMobile && (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                marginLeft="9px"
                                width={195 - (depth * (depth == 1 ? 35 : 25)) + "px"}
                                noOfLines={1}
                                wordBreak="break-all"
                                color={bgHover ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                                fontSize={parent.uuid == "base" ? 16 : 14}
                                flexShrink={0}
                                height={parent.uuid == "base" ? "35px" : "30px"}
                                paddingTop="0.375em"
                                justifyContent="flex-start"
                                textAlign="start"
                                onClick={() => {
                                    setSidebarFolderOpen(prev => ({
                                        ...prev,
                                        [parent.uuid]: true
                                    }))
                
                                    db.get("defaultDriveUUID").then((defaultDriveUUID) => {
                                        navigate("/#/" + path.replace("base", defaultDriveUUID))
                                    }).catch(console.error)
                                }}
                            >
                                {parent.name}
                            </AppText>
                        )
                    }
                </Flex>
            </Flex>
            <Flex
                height="auto"
                width={window.innerWidth * window.innerWidth}
                flexDirection="column"
            >
                {
                    sidebarFolderOpen[parent.uuid] && folders.length > 0 && folders.map((folder) => {
                        return (
                            <CloudTree
                                key={folder.uuid}
                                darkMode={darkMode}
                                isMobile={isMobile}
                                parent={folder}
                                depth={depth + 1}
                                sidebarFolderOpen={sidebarFolderOpen}
                                setSidebarFolderOpen={setSidebarFolderOpen}
                                path={path + "/" + folder.uuid}
                                items={items}
                                setItems={setItems}
                                setActiveItem={setActiveItem}
                            />
                        )
                    })
                }
            </Flex>
        </Flex>
    )
})

export const CloudTree = memo(({ darkMode, isMobile, depth, parent, sidebarFolderOpen, setSidebarFolderOpen, path, items, setItems, setActiveItem }: CloudTreeProps) => {
    const [folders, setFolders] = useState<ItemProps[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const treeFolders = useRef<ItemProps[]>([])

    const fetchSidebarItems = useCallback(async (refresh: boolean = false): Promise<void> => {
        const getItemsInDb = await db.get("loadSidebarItems:" + parent.uuid, "metadata")
        const hasItemsInDb = Array.isArray(getItemsInDb)

        if(!hasItemsInDb){
            setLoading(true)
        }

        loadSidebarItems(parent.uuid, refresh).then((data) => {
            setFolders(data.items.filter(item => item.type == "folder"))
            
            setLoading(false)

            if(data.cache){
                fetchSidebarItems(true)
            }
        }).catch((err) => {
            setLoading(false)

            console.error(err)
        })
    }, [parent.uuid])

    useEffect(() => {
        if(sidebarFolderOpen[parent.uuid]){
            fetchSidebarItems(false)
        }
    }, [sidebarFolderOpen[parent.uuid]])

    useEffect(() => {
        treeFolders.current = folders
    }, [folders])

    useEffect(() => {
        const folderCreatedListener = eventListener.on("folderCreated", async (data: FolderCreatedEvent) => {
            const defaultDriveUUID = await db.get("defaultDriveUUID")
            const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

            if(data.parent == thisParent){
                fetchSidebarItems(true)
            }
        })

        const folderRenamedListener = eventListener.on("folderRenamed", async (data: FolderRenamedEvent) => {
            const defaultDriveUUID = await db.get("defaultDriveUUID")
            const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

            if(data.item.parent == thisParent){
                fetchSidebarItems(true)
            }
        })

        const itemTrashedListener = eventListener.on("itemTrashed", async (data: ItemTrashedEvent) => {
            const defaultDriveUUID = await db.get("defaultDriveUUID")
            const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

            if(data.item.parent == thisParent){
                fetchSidebarItems(true)
            }
        })

        const openSidebarFolderListener = eventListener.on("openSidebarFolder", (uuid: string) => {
            setSidebarFolderOpen(prev => ({
                ...prev,
                [uuid]: true
            }))
        })

        const itemColorChangedListener = eventListener.on("itemColorChanged", async (data: ItemColorChangedEvent) => {
            const defaultDriveUUID = await db.get("defaultDriveUUID")
            const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

            if(data.item.parent == thisParent){
                fetchSidebarItems(true)
            }
        })

        const itemMovedListener = eventListener.on("itemMoved", async (data: ItemMovedEvent) => {
            const defaultDriveUUID = await db.get("defaultDriveUUID")
            const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

            if(data.from == thisParent){
                fetchSidebarItems(true)
            }

            if(data.to == thisParent){
                fetchSidebarItems(true)
            }
        })

        const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
            await new Promise(resolve => setTimeout(resolve, 250))

            const defaultDriveUUID = await db.get("defaultDriveUUID")
            const thisParent = parent.uuid == "base" ? defaultDriveUUID : parent.uuid

            if(event.type == "folderSubCreated" || event.type == "folderRestore"){
                if(thisParent == event.data.parent){
                    fetchSidebarItems(true)
                }
            }
            else if(event.type == "folderMove"){
                if(thisParent == event.data.parent){
                    fetchSidebarItems(true)
                }
            }
            else if(event.type == "folderColorChanged"){
                if(treeFolders.current.filter(folder => folder.uuid == event.data.uuid).length > 0){
                    fetchSidebarItems(true)
                }
            }
        })

        return () => {
            folderCreatedListener.remove()
            folderRenamedListener.remove()
            itemTrashedListener.remove()
            openSidebarFolderListener.remove()
            itemColorChangedListener.remove()
            itemMovedListener.remove()
            socketEventListener.remove()
        }
    }, [])

    return (
        <CloudTreeItem
            darkMode={darkMode}
            isMobile={isMobile}
            parent={parent}
            depth={depth}
            folders={folders}
            sidebarFolderOpen={sidebarFolderOpen}
            setSidebarFolderOpen={setSidebarFolderOpen}
            loading={loading}
            path={path}
            items={items}
            setItems={setItems}
            setActiveItem={setActiveItem}
        />
    )
})

const Usage = memo(({ sidebarWidth, darkMode, isMobile, lang }: SidebarUsageProps) => {
    const [userInfo, setUserInfo] = useState<UserInfoV1 | undefined>(undefined)
    const [percent, setPercent] = useState<number>(0)
    const navigate = useNavigate()

    const debouncedFetchUsage = useMemo(() => debounce(() => fetchUsage(), 30000), [])

    const fetchUsage = useCallback(async (): Promise<void> => {
        try{
            const info: UserInfoV1 = await fetchUserInfo()
            const percentage: number = parseFloat(((info.storageUsed / info.maxStorage) * 100).toFixed(2))

            setUserInfo(info)
            setPercent(isNaN(percentage) ? 0 : percentage >= 100 ? 100 : percentage)
        }
        catch(e){
            console.error(e)
        }
    }, [])

    useEffect(() => {
        fetchUsage()

        const uploadMarkedDoneListener = eventListener.on("uploadMarkedDone", () => debouncedFetchUsage())
        const trashEmptiedListener = eventListener.on("trashEmptied", () => debouncedFetchUsage())
        const updateInterval = setInterval(() => fetchUsage(), 60000)

        return () => {
            uploadMarkedDoneListener.remove()
            trashEmptiedListener.remove()

            clearInterval(updateInterval)
        }
    }, [])

    return (
        <Flex
            width={sidebarWidth + "px"}
            height="auto"
            flexDirection="column"
            position="absolute"
            bottom="10px"
            zIndex={1001}
            backgroundColor={getColor(darkMode, "backgroundPrimary")}
            borderRight={"1px solid " + getColor(darkMode, "borderPrimary")}
            userSelect="none"
        >
            <Divider
                darkMode={darkMode}
                marginTop={0}
                marginBottom={10}
            />
            {
                typeof userInfo == "undefined" ? (
                    <Flex
                        paddingLeft="20px"
                        paddingRight="20px"
                        paddingTop="5px"
                        paddingBottom="5px"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Spinner
                            width="20px"
                            height="20px"
                            color={getColor(darkMode, "textPrimary")}
                        />
                    </Flex>
                ) : (
                    <>
                        {
                            isMobile ? (
                                <Flex
                                    paddingLeft="10px"
                                    paddingRight="10px"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <CircularProgress
                                        value={percent}
                                        size={5}
                                        color="#805AD5"
                                        min={0}
                                        max={100}
                                        trackColor={getColor(darkMode, "backgroundSecondary")}
                                        thickness={18}
                                    />
                                </Flex>
                            ) : (
                                <>
                                    <Flex
                                        paddingLeft="20px"
                                        paddingRight="20px"
                                    >
                                        <Progress
                                            value={percent}
                                            height="5px"
                                            borderRadius="10px"
                                            colorScheme={CHAKRA_COLOR_SCHEME}
                                            min={0}
                                            max={100}
                                            marginTop="5px"
                                            width="100%"
                                            backgroundColor={getColor(darkMode, "backgroundSecondary")}
                                        />
                                    </Flex>
                                    <Flex
                                        flexDirection="row"
                                        justifyContent="space-between"
                                        paddingLeft="20px"
                                        paddingRight="20px"
                                        paddingTop="5px"
                                    >
                                        <AppText
                                            darkMode={darkMode}
                                            isMobile={isMobile}
                                            noOfLines={1}
                                            wordBreak="break-all"
                                            color={getColor(darkMode, "textSecondary")}
                                            fontSize={11}
                                        >
                                            {i18n(lang, "storageUsedInfo", true, ["__USED__", "__MAX__"], [formatBytes(userInfo.storageUsed), formatBytes(userInfo.maxStorage)])}
                                        </AppText>
                                        <AppText
                                            darkMode={darkMode}
                                            isMobile={isMobile}
                                            noOfLines={1}
                                            wordBreak="break-all"
                                            color={getColor(darkMode, "textSecondary")}
                                            fontSize={11}
                                            fontWeight="bold"
                                            _hover={{
                                                textDecoration: "underline",
                                                color: getColor(darkMode, "textPrimary")
                                            }}
                                            cursor="pointer"
                                            onClick={() => navigate("/#/account/plans")}
                                        >
                                            {i18n(lang, "upgrade")}
                                        </AppText>
                                    </Flex>
                                </>
                            )
                        }
                    </>
                )
            }
        </Flex>
    )
})

const Sidebar = memo(({ darkMode, isMobile, sidebarWidth, windowHeight, lang, items, setActiveItem, setItems }: SidebarProps) => {
    //const [sidebarFolderOpen, setSidebarFolderOpen] = useDb("sidebarFolderOpen", {})
    const [sidebarFolderOpen, setSidebarFolderOpen] = useState<{ [key: string]: boolean }>({ "base": true })

    const treeMaxHeight: number = useMemo(() => {
        const sidebarOtherHeight: number = (40 * 11)
        const treeHeight: number = (windowHeight - sidebarOtherHeight)
        const treeMaxHeight: number = treeHeight < 40 ? 40 : treeHeight

        return treeMaxHeight
    }, [windowHeight])

    return (
        <Flex
            width={sidebarWidth + "px"}
            height="100%"
            flexDirection="column"
            borderRight={"1px solid " + getColor(darkMode, "borderSecondary")}
            overflowX="hidden"
            overflowY="auto"
            userSelect="none"
        >
            {/*<AccountButton
                darkMode={darkMode}
                isMobile={isMobile}
            />*/}
            <Flex
                width={sidebarWidth + "px"}
                height="auto"
                maxHeight={treeMaxHeight + "px"}
                flexDirection="column"
                overflowX="hidden"
                overflowY={treeMaxHeight > 40 ? "auto" : "hidden"}
                userSelect="none"
            >
                {
                    !isMobile ? (
                        <CloudTree
                            darkMode={darkMode}
                            isMobile={isMobile}
                            parent={{
                                type: "folder",
                                parent: "base",
                                uuid: "base",
                                name: "Cloud Drive",
                                size: 0,
                                mime: "",
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
                                region: "",
                                bucket: ""
                            }}
                            path="base"
                            depth={0}
                            sidebarFolderOpen={sidebarFolderOpen}
                            setSidebarFolderOpen={setSidebarFolderOpen}
                            items={items}
                            setItems={setItems}
                            setActiveItem={setActiveItem}
                        />
                    ) : (
                        <Button
                            darkMode={darkMode}
                            isMobile={isMobile}
                            type="cloudDrive"
                            text={i18n(lang, "cloudDrive")}
                            to="/"
                        />
                    )
                }
            </Flex>
            <Divider
                darkMode={darkMode}
                marginTop={0}
                marginBottom={4}
            />
            <Button
                darkMode={darkMode}
                isMobile={isMobile}
                type="shared-in"
                text={i18n(lang, "sharedWithMe")}
                to="/#/shared-in"
            />
            <Button
                darkMode={darkMode}
                isMobile={isMobile}
                type="shared-out"
                text={i18n(lang, "sharedWithOthers")}
                to="/#/shared-out"
            />
            <Button
                darkMode={darkMode}
                isMobile={isMobile}
                type="links"
                text={i18n(lang, "links")}
                to="/#/links"
            />
            <Divider
                darkMode={darkMode}
                marginTop={4}
                marginBottom={4}
            />
            <Button
                darkMode={darkMode}
                isMobile={isMobile}
                type="favorites"
                text={i18n(lang, "favorites")}
                to="/#/favorites"
            />
            <Button
                darkMode={darkMode}
                isMobile={isMobile}
                type="recent"
                text={i18n(lang, "recents")}
                to="/#/recent"
            />
            <Button
                darkMode={darkMode}
                isMobile={isMobile}
                type="trash"
                text={i18n(lang, "trash")}
                to="/#/trash"
            />
            <Usage
                darkMode={darkMode}
                isMobile={isMobile}
                sidebarWidth={sidebarWidth}
                lang={lang}
            />
        </Flex>
    )
})

export default Sidebar