import { memo, useState, useRef, useEffect, useMemo, useCallback } from "react"
import type { ItemComponentProps, ItemProps, SkeletonItemProps } from "../../types"
import { Flex, Checkbox, Skeleton, Image as ChakraImage, Spinner, Badge } from "@chakra-ui/react"
import AppText from "../AppText"
import { getColor } from "../../styles/colors"
import { contextMenu } from "react-contexify"
import { isBetween, generateRandomString, getRandomArbitrary, formatBytes, getFolderColor, getImageForFileByExt, getFileExt, getFilePreviewType, simpleDate, canCompressThumbnail, getCurrentParent } from "../../lib/helpers"
import { IoFolder } from "react-icons/io5"
import { useLocation, useNavigate } from "react-router-dom"
import { GRID_CELL_WIDTH, GRID_CELL_HEIGHT, LIST_ITEM_HEIGHT, CHAKRA_COLOR_SCHEME, THEME_COLOR, DROP_NAVIGATION_TIMEOUT } from "../../lib/constants"
import { BsThreeDots } from "react-icons/bs"
import { generateThumbnail } from "../../lib/services/thumbnails"
import memoryCache from "../../lib/memoryCache"
import eventListener from "../../lib/eventListener"
import { fetchFolderSize } from "../../lib/api"
import db from "../../lib/db"
import { MdOutlineFavorite } from "react-icons/md"
import { moveToParent } from "../../lib/services/move"
import { i18n } from "../../i18n"

const dragImg = new Image()

dragImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=="

export const SkeletonItem = memo(({ darkMode, isMobile, style, listWidth, mode }: SkeletonItemProps) => {
    const [markerWidth, nameWidth, sizeWidth, lastModifiedWidth, actionsWidth] = useMemo(() => {
        let markerWidth: number = isMobile ? 0 : 35
        let listWidthMinusMarker: number = Math.floor(listWidth - markerWidth)
        let nameWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.50 : 0.70))
        let sizeWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.20 : 0.10))
        let lastModifiedWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.30 : 0.20))
        let actionsWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0 : 0.05))

        return [markerWidth, nameWidth, sizeWidth, lastModifiedWidth, actionsWidth]
    }, [listWidth, isMobile])

    return (
        <Flex
            style={style}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            width={mode == "grid" ? GRID_CELL_WIDTH + "px" : "100%"}
            height={(mode == "grid" ? GRID_CELL_HEIGHT : LIST_ITEM_HEIGHT) + "px"}
            paddingLeft={mode == "grid" ? "10px" : "15px"}
            paddingRight={mode == "grid" ? "0px" : "15px"}
            paddingTop={mode == "grid" ? "10px" : "10px"}
            paddingBottom={mode == "grid" ? "0px" : "10px"}
            cursor="auto"
            userSelect="none"
        >
            {
                mode == "grid" ? (
                    <>
                        <Skeleton
                            startColor={getColor(darkMode, "backgroundPrimary")}
                            endColor={getColor(darkMode, "backgroundSecondary")}
                            height="100%"
                            width="100%"
                        >
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                fontSize={13}
                                wordBreak="break-word"
                                position="absolute"
                                bottom="0px"
                                paddingBottom="5px"
                                paddingTop="5px"
                                paddingLeft="10px"
                                paddingRight="10px"
                                width={(GRID_CELL_WIDTH - 10) + "px"}
                                textAlign="center"
                            >
                                {generateRandomString(getRandomArbitrary(10, 40))}
                            </AppText>
                        </Skeleton>
                    </>
                ) : (
                    <>
                        <Flex
                            width={nameWidth + "px"}
                            justifyContent="flex-start"
                            alignItems="center"
                        >
                            <Skeleton
                                startColor={getColor(darkMode, "backgroundPrimary")}
                                endColor={getColor(darkMode, "backgroundSecondary")}
                                height="24px"
                            >
                                <AppText
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    noOfLines={1}
                                    fontSize={14}
                                    marginLeft="10px"
                                    color={getColor(darkMode, "textSecondary")}
                                    wordBreak="break-all"
                                    paddingRight="15px"
                                >
                                    {generateRandomString(getRandomArbitrary(10, 40))}
                                </AppText>
                            </Skeleton>
                        </Flex>
                        <Flex
                            width={sizeWidth + "px"}
                            justifyContent="flex-start"
                        >
                            <Skeleton
                                startColor={getColor(darkMode, "backgroundPrimary")}
                                endColor={getColor(darkMode, "backgroundSecondary")}
                                height="24px"
                            >
                                <AppText
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    noOfLines={1}
                                    fontSize={14}
                                    color={getColor(darkMode, "textSecondary")}
                                    wordBreak="break-all"
                                    paddingRight="15px"
                                >
                                    {generateRandomString(getRandomArbitrary(3, 8))}
                                </AppText>
                            </Skeleton>
                        </Flex>
                        <Flex
                            width={lastModifiedWidth + "px"}
                            justifyContent="flex-start"
                        >
                            <Skeleton
                                startColor={getColor(darkMode, "backgroundPrimary")}
                                endColor={getColor(darkMode, "backgroundSecondary")}
                                height="24px"
                            >
                                <AppText
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    noOfLines={1}
                                    fontSize={14}
                                    color={getColor(darkMode, "textSecondary")}
                                    wordBreak="break-all"
                                    paddingRight="15px"
                                >
                                    {simpleDate(new Date().getTime())}
                                </AppText>
                            </Skeleton>
                        </Flex>
                        {
                            !isMobile && (
                                <Flex
                                    width={actionsWidth + "px"}
                                    justifyContent="flex-start"
                                >
                                    <Skeleton
                                        startColor={getColor(darkMode, "backgroundPrimary")}
                                        endColor={getColor(darkMode, "backgroundSecondary")}
                                        height="24px"
                                    >
                                        <Flex
                                            width="auto"
                                            height="auto"
                                            padding="2px"
                                            paddingLeft="5px"
                                            paddingRight="5px"
                                            borderRadius="20px"
                                            marginLeft="15px"
                                            marginTop="2px"
                                        >
                                            <BsThreeDots
                                                size={14}
                                                style={{
                                                    flexShrink: 0
                                                }}
                                            />
                                        </Flex>
                                    </Skeleton>
                                </Flex>
                            )
                        }
                    </>
                )
            }
        </Flex>
    )
})

export const Item = memo(({ darkMode, isMobile, style, item, items, setItems, setActiveItem, setItemDragState, listWidth, mode, lang }: ItemComponentProps) => {
    const [dragHover, setDragHover] = useState<boolean>(false)
    const [hovering, setHovering] = useState<boolean>(false)
    const [hoveringActions, setHoveringActions] = useState<boolean>(false)
    const location = useLocation()
    const navigate = useNavigate()
    const dropNavigationTimer = useRef<number | undefined | ReturnType<typeof setTimeout>>(undefined)
    const [thumbnail, setThumbnail] = useState<string>(memoryCache.has("generateThumbnail:" + item.uuid) ? memoryCache.get("generateThumbnail:" + item.uuid) : "")
    const currentItems = useRef<ItemProps[]>(items)
    const didGenerateThumbnail = useRef<boolean>(false)
    const startURL = useRef<string>(window.location.href).current

    const [markerWidth, nameWidth, sizeWidth, lastModifiedWidth, actionsWidth] = useMemo(() => {
        let markerWidth: number = 0
        let listWidthMinusMarker: number = Math.floor(listWidth - markerWidth)
        let nameWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.50 : 0.70))
        let sizeWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.20 : 0.10))
        let lastModifiedWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0.30 : 0.20))
        let actionsWidth: number = Math.floor(listWidthMinusMarker * (isMobile ? 0 : 0.05))

        return [markerWidth, nameWidth, sizeWidth, lastModifiedWidth, actionsWidth]
    }, [listWidth, isMobile])

    const bgHover: boolean = useMemo(() => {
        return item.selected || dragHover || hovering
    }, [item.selected, dragHover, hovering])

    const openSidebarFolder = useCallback(() => eventListener.emit("openSidebarFolder", item.uuid), [item])

    const handleItemOnClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        if((e.target as HTMLElement).classList.contains("item-actions-trigger")){
            handleItemOnContextMenu(e)

            return
        }

        if(e.detail >= 2){
            if(item.type == "folder"){
                if(item.root.indexOf("trash") == -1 && window.location.href.indexOf(item.uuid) == -1){
                    if(location.pathname.indexOf("/f/") !== -1){
                        eventListener.emit("publicLinkNavigate", item.uuid)
                    }
                    else{
                        if(Number.isInteger(item.receiverId)){
                            if(item.receiverId > 0){
                                window.currentReceiverId = item.receiverId
                            }
                        }
    
                        openSidebarFolder()

                        navigate("/" + (location.hash.split("/").length >= 2 ? location.hash : "#") + "/" + item.uuid)
                    }
                }
            }
            else if(getFilePreviewType(getFileExt(item.name)) !== "none"){
                eventListener.emit("openPreviewModal", {
                    item,
                    items: currentItems.current
                })
            }

            return
        }

        if(e.ctrlKey){
            setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, selected: !mapItem.selected } : mapItem))
        }
        else if(e.shiftKey){
            setItems(prev => {
                const current = [...prev]

                let firstSelected: number = -1
                let lastSelected: number = -1
                let itemIndex: number = -1

                for(let i = 0; i < current.length; i++){
                    if(current[i].uuid == item.uuid && itemIndex == -1){
                        itemIndex = i

                        break
                    }
                }

                for(let i = 0; i < current.length; i++){
                    if(current[i].selected && firstSelected == -1){
                        firstSelected = i

                        break
                    }
                }

                for(let i = (current.length - 1); i >= 0; i--){
                    if(current[i].selected && lastSelected == -1){
                        lastSelected = i

                        break
                    }
                }

                if(lastSelected >= itemIndex){
                    for(let i = 0; i < current.length; i++){
                        if(isBetween(itemIndex, lastSelected, i)){
                            current[i].selected = true
                        }
                    }
                }
                else{
                    for(let i = 0; i < current.length; i++){
                        if(isBetween(lastSelected, itemIndex, i)){
                            current[i].selected = true
                        }
                    }
                }

                return current
            })
        }
        else{
            if(currentItems.current.filter(filterItem => filterItem.selected).length > 1){
                setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, selected: true } : { ...mapItem, selected: false }))
            }
            else{
                setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, selected: !mapItem.selected } : { ...mapItem, selected: false }))
            }
        }
    }, [item])

    const handleItemOnContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        setActiveItem(item)

        const selectedCount: number = currentItems.current.filter(filterItem => filterItem.selected).length
        
        if(selectedCount > 1){
            setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, selected: true } : mapItem))
        }
        else{
            setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, selected: true } : { ...mapItem, selected: false }))
        }

        contextMenu.show({
            id: "itemsContextMenu",
            event: e,
            position: {
                x: e.nativeEvent.clientX,
                y: e.nativeEvent.clientY
            }
        })
    }, [])

    const handleItemOnDragStart = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        if(window.location.hash.indexOf("shared-in") !== -1){
            return
        }

        contextMenu.hideAll()

        const draggedItems: ItemProps[] = []

        draggedItems.push(item)

        for(let i = 0; i < items.length; i++){
            if(items[i].selected && items[i].uuid !== item.uuid){
                draggedItems.push(items[i])
            }
        }

        e.dataTransfer.setDragImage(dragImg, 0, 0)
        e.dataTransfer.setData("draggedItems", JSON.stringify(draggedItems))
        memoryCache.set("draggedItems", draggedItems)

        setItemDragState(prev => ({
            ...prev,
            clientX: e.clientX,
            clientY: e.clientY,
            items: draggedItems
        }))
    }, [item])

    const handleItemOnDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        if(window.location.hash.indexOf("shared-in") !== -1){
            return
        }

        setDragHover(false)

        const droppedItems: ItemProps[] = memoryCache.get("draggedItems") || []

        clearTimeout(dropNavigationTimer.current)

        dropNavigationTimer.current = undefined

        setItemDragState({ clientX: 0, clientY: 0, items: [] })

        if(item.root.indexOf("trash") !== -1){
            return
        }
        
        const parent = item.type == "folder" ? item.uuid : item.parent

        moveToParent(droppedItems, parent)
    }, [item])

    const handleItemOnDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        if(window.location.hash.indexOf("shared-in") !== -1){
            return
        }

        setDragHover(false)
        setItemDragState({ clientX: 0, clientY: 0, items: [] })
    }, [])

    const handleItemOnDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        if(window.location.hash.indexOf("shared-in") !== -1){
            return
        }

        if(item.type !== "folder"){
            return
        }

        setDragHover(true)

        if(typeof dropNavigationTimer.current !== "number" && item.root.indexOf("trash") == -1){
            clearTimeout(dropNavigationTimer.current)

            dropNavigationTimer.current = setTimeout(() => {
                if(window.location.href.indexOf(item.uuid) == -1){
                    openSidebarFolder()

                    if(location.pathname.indexOf("/f/") !== -1){
                        eventListener.emit("publicLinkNavigate", item.uuid)
                    }
                    else{
                        if(Number.isInteger(item.receiverId)){
                            if(item.receiverId > 0){
                                window.currentReceiverId = item.receiverId
                            }
                        }
                        
                        navigate("/" + (location.hash.split("/").length >= 2 ? location.hash : "#") + "/" + item.uuid)
                    }
                }

                clearTimeout(dropNavigationTimer.current)

                dropNavigationTimer.current = undefined
            }, DROP_NAVIGATION_TIMEOUT)
        }
    }, [item])

    const handleItemOnDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        if(window.location.hash.indexOf("shared-in") !== -1){
            return
        }

        setDragHover(false)

        clearTimeout(dropNavigationTimer.current)

        dropNavigationTimer.current = undefined
    }, [])

    const interactionProps = useMemo(() => {
        return {
            onMouseEnter: () => setHovering(true),
            onMouseLeave: () => setHovering(false),
            draggable: window.location.hash.indexOf("shared-in") == -1,
            onDragStart: handleItemOnDragStart,
            onDragEnd: handleItemOnDragEnd,
            onDragOver: handleItemOnDragOver,
            onDragLeave: handleItemOnDragLeave,
            onDrop: handleItemOnDrop,
            className: "drag-select-item list-item do-not-unselect-items",
            "data-uuid": item.uuid,
            transition: "100ms",
            onClick: handleItemOnClick,
            onContextMenu: handleItemOnContextMenu
        }
    }, [item])

    const queueThumbnailGeneration = useCallback(() => {
        if(canCompressThumbnail(getFileExt(item.name)) && !didGenerateThumbnail.current){
            didGenerateThumbnail.current = true

            generateThumbnail(item).then((url) => {
                setThumbnail(url)
            }).catch((err) => {
                if(err == "notVisible"){
                    didGenerateThumbnail.current = false

                    if(startURL == window.location.href){
                        setTimeout(queueThumbnailGeneration, 100)
                    }
                }
                else{
                    console.error(err)
                }
            })
        }
    }, [item, didGenerateThumbnail.current])

    useEffect(() => {
        currentItems.current = items
    }, [items])

    useEffect(() => {
        window.visibleItems.push(item)

        queueThumbnailGeneration()

        if(item.type == "folder"){
            if(window.location.href.indexOf("/f/") == -1){
                Promise.all([
                    db.get("loadItems:" + item.uuid, "metadata"),
                    db.get("loadSidebarItems:" + item.uuid, "metadata")
                ]).catch(console.error)
            }

            db.get("folderSize:" + item.uuid, "metadata").then((size) => {
                if(Number.isInteger(size)){
                    memoryCache.set("folderSize:" + item.uuid, size)

                    setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, size } : mapItem))
                }

                fetchFolderSize(item, startURL).then((size) => {
                    db.set("folderSize:" + item.uuid, size, "metadata").then(() => {
                        memoryCache.set("folderSize:" + item.uuid, size)

                        setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, size } : mapItem))
                    }).catch(console.error)
                }).catch((err) => {
                    console.error(err)
                })
            }).catch(console.error)
        }

        const thumbnailGeneratedListener = eventListener.on("thumbnailGenerated", ({ uuid, url }: { uuid: string, url: string }) => {
            if(uuid == item.uuid){
                setThumbnail(url)
            }
        })

        return () => {
            clearTimeout(dropNavigationTimer.current)

            dropNavigationTimer.current = undefined

            thumbnailGeneratedListener.remove()
        }
    }, [])

    return (
        <ItemBody
            style={style}
            mode={mode}
            item={item}
            darkMode={darkMode}
            dragHover={dragHover}
            hovering={hovering}
            interactionProps={interactionProps}
            thumbnail={thumbnail}
            isMobile={isMobile}
            markerWidth={markerWidth}
            nameWidth={nameWidth}
            sizeWidth={sizeWidth}
            lastModifiedWidth={lastModifiedWidth}
            actionsWidth={actionsWidth}
            hoveringActions={hoveringActions}
            setHoveringActions={setHoveringActions}
            bgHover={bgHover}
            lang={lang}
        />
    )
})

export interface ItemBodyProps {
    style: React.CSSProperties,
    mode: "list" | "grid",
    item: ItemProps,
    darkMode: boolean,
    dragHover: boolean,
    hovering: boolean,
    interactionProps: any,
    thumbnail: string,
    isMobile: boolean,
    markerWidth: number,
    nameWidth: number,
    sizeWidth: number,
    lastModifiedWidth: number,
    actionsWidth: number,
    hoveringActions: boolean,
    setHoveringActions: React.Dispatch<React.SetStateAction<boolean>>,
    bgHover: boolean,
    lang: string
}

const ItemBody = memo(({ style, mode, item, darkMode, dragHover, hovering, interactionProps, thumbnail, isMobile, markerWidth, nameWidth, sizeWidth, lastModifiedWidth, actionsWidth, hoveringActions, setHoveringActions, bgHover, lang }: ItemBodyProps) => {
    return (
        <Flex
            style={style}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            width={mode == "grid" ? GRID_CELL_WIDTH + "px" : "100%"}
            height={(mode == "grid" ? GRID_CELL_HEIGHT : LIST_ITEM_HEIGHT) + "px"}
            paddingLeft={mode == "grid" ? "10px" : "15px"}
            paddingRight={mode == "grid" ? "0px" : "15px"}
            paddingTop={mode == "grid" ? "10px" : "10px"}
            paddingBottom={mode == "grid" ? "0px" : "10px"}
            cursor={mode == "grid" ? "auto" : "pointer"}
            userSelect="none"
            backgroundColor={bgHover && mode == "list" ? getColor(darkMode, "backgroundSecondary") : "transparent"}
            _hover={{
                backgroundColor: mode == "grid" ? "transparent" : getColor(darkMode, "backgroundSecondary")
            }}
            {...(mode == "list" ? interactionProps : {})}
        >
            {
                mode == "grid" ? (
                    <>
                        <Flex
                            width="100%"
                            height="100%"
                            border={bgHover ? ("2px solid " + THEME_COLOR) : ("1px solid " + getColor(darkMode, "borderSecondary"))}
                            borderRadius="5px"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            backgroundColor={bgHover ? getColor(darkMode, "backgroundSecondary") : "transparent"}
                            {...interactionProps}
                        >
                            {
                                item.favorited == 1 && (
                                    <Flex
                                        position="absolute"
                                        top={18}
                                        left={18}
                                    >
                                        <MdOutlineFavorite
                                            fontSize={14}
                                            color={getColor(darkMode, "textPrimary")}
                                            style={{
                                                flexShrink: 0
                                            }}
                                        />
                                    </Flex>
                                )
                            }
                            {
                                item.type == "folder" ? (
                                    <IoFolder
                                        size={45}
                                        color={getFolderColor(item.color)}
                                        style={{
                                            flexShrink: 0
                                        }}
                                    />
                                ) : thumbnail.length > 0 ? (
                                    <ChakraImage
                                        src={thumbnail}
                                        width={"100%"}
                                        height={"100%"}
                                        flexShrink={0}
                                        borderRadius="5px"
                                        objectFit="cover"
                                    />
                                ) : (
                                    <ChakraImage
                                        src={getImageForFileByExt(getFileExt(item.name))}
                                        width="45px"
                                        height="45px"
                                        flexShrink={0}
                                        objectFit="cover"
                                    />
                                )
                            }
                            <Flex
                                borderBottomLeftRadius="5px"
                                borderBottomRightRadius="5px"
                                backgroundColor={bgHover ? getColor(darkMode, "backgroundSecondary") : getColor(darkMode, "backgroundPrimary")}
                                position="absolute"
                                bottom="5px"
                                paddingBottom="5px"
                                paddingTop="5px"
                                paddingLeft="10px"
                                paddingRight="10px"
                                width={(GRID_CELL_WIDTH - 20) + "px"}
                                maxWidth={(GRID_CELL_WIDTH - 20) + "px"}
                                textAlign="center"
                                justifyContent="center"
                                alignItems="center"
                                borderRadius="15px"
                            >
                                <AppText
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    noOfLines={1}
                                    fontSize={13}
                                    wordBreak="break-all"
                                    color={getColor(darkMode, "textSecondary")}
                                >
                                    {item.name}
                                </AppText>
                            </Flex>
                        </Flex>
                    </>
                ) : (
                    <>
                        <Flex
                            width={nameWidth + "px"}
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Flex
                                alignItems="center"
                                width="100%"
                            >
                                {
                                    item.type == "folder" ? (
                                        <IoFolder
                                            size={18}
                                            color={getFolderColor(item.color)}
                                            style={{
                                                flexShrink: 0
                                            }}
                                        />
                                    ) : thumbnail.length > 0 ? (
                                        <ChakraImage
                                            src={thumbnail}
                                            width="18px"
                                            height="18px"
                                            flexShrink={0}
                                            borderRadius="3px"
                                            objectFit="cover"
                                        />
                                    ) : (
                                        <ChakraImage
                                            src={getImageForFileByExt(getFileExt(item.name))}
                                            width="18px"
                                            height="18px"
                                            flexShrink={0}
                                            objectFit="cover"
                                        />
                                    )
                                }
                                <Flex
                                    justifyContent="space-between"
                                    width="100%"
                                >
                                    <AppText
                                        darkMode={darkMode}
                                        isMobile={isMobile}
                                        noOfLines={1}
                                        fontSize={14}
                                        marginLeft="10px"
                                        color={getColor(darkMode, "textSecondary")}
                                        wordBreak="break-all"
                                        paddingRight="15px"
                                    >
                                        {item.name}
                                    </AppText>
                                    {
                                        Array.isArray(item.receivers) && item.receivers.length > 0 && !isMobile && getCurrentParent().length < 32 && window.location.href.indexOf("shared-out") !== -1 && (
                                            <Flex
                                                alignItems="center"
                                                paddingRight="15px"
                                            >
                                                <Badge
                                                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                                                    color={getColor(darkMode, "textSecondary")}
                                                    _hover={{
                                                        color: getColor(darkMode, "textPrimary")
                                                    }}
                                                    onClick={() => eventListener.emit("openSharedWithInfoModal", item)}
                                                >
                                                    Shared with {item.receivers.length}
                                                </Badge>
                                            </Flex>
                                        )
                                    }
                                    {
                                        item.sharerId > 0 && item.sharerEmail.indexOf("@") !== -1 && window.location.href.indexOf("shared-in") !== -1 && getCurrentParent().length < 32 && (
                                            <Flex
                                                alignItems="center"
                                                paddingRight="15px"
                                            >
                                                <Badge
                                                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                                                    color={getColor(darkMode, "textSecondary")}
                                                >
                                                    {item.sharerEmail}
                                                </Badge>
                                            </Flex>
                                        )
                                    }
                                </Flex>
                            </Flex>
                            {
                                item.favorited == 1 && (
                                    <MdOutlineFavorite
                                        fontSize={14}
                                        color={getColor(darkMode, "textPrimary")}
                                        style={{
                                            marginRight: "25px",
                                            flexShrink: 0
                                        }}
                                    />
                                )
                            }
                        </Flex>
                        <Flex
                            width={sizeWidth + "px"}
                            justifyContent="flex-start"
                        >
                            {
                                item.type == "folder" ? (
                                    memoryCache.has("folderSize:" + item.uuid) ? (
                                        <AppText
                                            darkMode={darkMode}
                                            isMobile={isMobile}
                                            noOfLines={1}
                                            fontSize={14}
                                            color={getColor(darkMode, "textSecondary")}
                                            wordBreak="break-all"
                                            paddingRight="15px"
                                        >
                                            {formatBytes(memoryCache.get("folderSize:" + item.uuid))}
                                        </AppText>
                                    ) : (
                                        <Spinner
                                            width="16px"
                                            height="16px"
                                            color={getColor(darkMode, "textSecondary")}
                                        />
                                    )
                                ) : (
                                    <AppText
                                        darkMode={darkMode}
                                        isMobile={isMobile}
                                        noOfLines={1}
                                        fontSize={14}
                                        color={getColor(darkMode, "textSecondary")}
                                        wordBreak="break-all"
                                        paddingRight="15px"
                                    >
                                        {formatBytes(item.size)}
                                    </AppText>
                                )
                            }
                        </Flex>
                        <Flex
                            width={lastModifiedWidth + "px"}
                            justifyContent="flex-start"
                        >
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                fontSize={14}
                                color={getColor(darkMode, "textSecondary")}
                                wordBreak="break-all"
                                paddingRight="15px"
                            >
                                {item.type == "folder" ? i18n(lang, "na") : simpleDate(item.lastModified)}
                            </AppText>
                        </Flex>
                        {
                            !isMobile && (
                                <Flex
                                    width={actionsWidth + "px"}
                                    justifyContent="flex-start"
                                >
                                    {
                                        bgHover && (
                                            <Flex
                                                width="auto"
                                                height="auto"
                                                padding="2px"
                                                paddingLeft="5px"
                                                paddingRight="5px"
                                                backgroundColor={hoveringActions ? (darkMode ? "white" : "black") : getColor(darkMode, "backgroundPrimary")}
                                                borderRadius="20px"
                                                marginLeft="15px"
                                                marginTop="2px"
                                                onMouseEnter={() => setHoveringActions(true)}
                                                onMouseLeave={() => setHoveringActions(false)}
                                                transition="200ms"
                                                className="item-actions-trigger"
                                            >
                                                <BsThreeDots
                                                    size={14}
                                                    color={hoveringActions ? (darkMode ? "black" : "white") : getColor(darkMode, "textPrimary")}
                                                    className="item-actions-trigger"
                                                    style={{
                                                        flexShrink: 0
                                                    }}
                                                />
                                            </Flex>
                                        )
                                    }
                                </Flex>
                            )
                        }
                    </>
                )
            }
        </Flex>
    )
})