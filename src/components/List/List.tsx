import { memo, useState, useEffect, useMemo, useCallback } from "react"
import { Flex } from "@chakra-ui/react"
import type { ListProps, ListScrollState, ItemProps, ListBodyProps } from "../../types"
import { Item, SkeletonItem } from "../Item"
import { contextMenu } from "react-contexify"
import { List as RVList, Grid as RVGrid } from "react-virtualized"
import ListFooter from "../ListFooter"
import useDb from "../../lib/hooks/useDb"
import { GRID_CELL_WIDTH, GRID_CELL_HEIGHT, LIST_ITEM_HEIGHT } from "../../lib/constants"
import { useLocation } from "react-router-dom"
import { orderItemsByType, isBetween, getCurrentParent } from "../../lib/helpers"
import { moveToParent } from "../../lib/services/move"
import ListEmpty from "../ListEmpty"
import { DEFAULT_PARENTS } from "../../lib/services/metadata"
import memoryCache from "../../lib/memoryCache"

const ListBody = memo(({ darkMode, isMobile, gridFolders, windowHeight, windowWidth, sidebarWidth, setListScrollState, loadingItems, items, setItems, setActiveItem, setDragSelectState, setItemDragState, lang }: ListBodyProps) => {
    const [columnCount, rowCount] = useMemo(() => {
        const containerWidth: number = (windowWidth - sidebarWidth)
        const columnCount: number = Math.floor(containerWidth / GRID_CELL_WIDTH)
        const rowCount: number = Math.floor(items.length / columnCount) + 1

        return [columnCount, rowCount]
    }, [items, windowWidth, sidebarWidth])

    const rowCountList: number = useMemo(() => {
        return loadingItems || items.length == 0 ? Math.floor((windowHeight / 40) * 1.25) : items.length
    }, [loadingItems, items.length, windowHeight])

    const rowCountGrid: number = useMemo(() => {
        return loadingItems || items.length == 0 ? Math.floor((windowHeight / GRID_CELL_HEIGHT) * 1) : rowCount
    }, [loadingItems, items.length, windowHeight])

    const onRowsRendered = useCallback(({ startIndex, stopIndex }: { startIndex: number, stopIndex: number }) => {
        window.visibleItems = items.filter((_, index) => isBetween(startIndex, stopIndex, index))
    }, [items])

    const onSectionRendered = useCallback(({ rowStartIndex, rowStopIndex }: { rowStartIndex: number, rowStopIndex: number }) => {
        const columms: number = (columnCount + 1)
        const startIndex: number = (rowStartIndex * columms)
        const stopIndex: number = ((rowStopIndex * columms) + (columms * 2))

        window.visibleItems = items.filter((_, index) => isBetween(startIndex, stopIndex, index))
    }, [items, columnCount])

    const rowRenderer = useCallback(({ style, key, index }: { style: React.CSSProperties, key: string, index: number }) => {
        const item = items[index]

        return loadingItems || items.length == 0 ? (
            <SkeletonItem
                key={key}
                darkMode={darkMode}
                isMobile={isMobile}
                style={style}
                listWidth={windowWidth - sidebarWidth}
                mode="list"
            />
        ) : (
            <Item
                key={key + ":" + JSON.stringify(item)}
                darkMode={darkMode}
                isMobile={isMobile}
                style={style}
                item={item}
                items={items}
                setItems={setItems}
                setActiveItem={setActiveItem}
                setItemDragState={setItemDragState}
                setDragSelectState={setDragSelectState}
                listWidth={windowWidth - sidebarWidth}
                mode="list"
                lang={lang}
            />
        )
    }, [darkMode, isMobile, windowWidth, sidebarWidth, items, loadingItems, lang])

    const cellRenderer = useCallback(({ columnIndex, key, rowIndex, style }: { columnIndex: number, key: string, rowIndex: number, style: React.CSSProperties }) => {
        columnIndex += 1
        rowIndex += 1

        let index = 0

        if(rowIndex > 1){
            index = (columnCount * (rowIndex - 1)) + columnIndex
        }
        else{
            index = columnIndex
        }

        index -= 1

        const item = items[index]

        if(!item && !loadingItems){
            return null
        }

        return loadingItems || items.length == 0 ? (
            <SkeletonItem
                key={key}
                darkMode={darkMode}
                isMobile={isMobile}
                style={style}
                listWidth={windowWidth - sidebarWidth}
                mode="grid"
            />
        ) : (
            <Item
                key={key + ":" + JSON.stringify(item)}
                darkMode={darkMode}
                isMobile={isMobile}
                style={style}
                item={item}
                items={items}
                setItems={setItems}
                setActiveItem={setActiveItem}
                setItemDragState={setItemDragState}
                setDragSelectState={setDragSelectState}
                listWidth={windowWidth - sidebarWidth}
                mode="grid"
                lang={lang}
            />
        )
    }, [darkMode, isMobile, windowWidth, sidebarWidth, items, lang])

    return (
        <>
            {
                !gridFolders[window.location.href] ? (
                    <>
                        {/* @ts-ignore */}
                        <RVList
                            key="list"
                            height={windowHeight - 50 - 40 - 40}
                            rowHeight={35}
                            rowCount={rowCountList}
                            width={windowWidth - sidebarWidth}
                            onScroll={(e) => setListScrollState(e)}
                            onRowsRendered={onRowsRendered}
                            overscanRowCount={1}
                            style={{
                                overflowX: "hidden",
                                overflowY: loadingItems || items.length == 0 ? "hidden" : "auto",
                                zIndex: 1000,
                                outline: "none",
                                paddingTop: loadingItems || items.length == 0 ? "8px" : "0px"
                            }}
                            rowRenderer={rowRenderer}
                        />
                    </>
                ) : (
                    <>
                        {/* @ts-ignore */}
                        <RVGrid
                            key="grid"
                            height={windowHeight - 50 - 40}
                            width={windowWidth - sidebarWidth}
                            rowCount={rowCountGrid}
                            rowHeight={GRID_CELL_HEIGHT}
                            columnCount={columnCount}
                            columnWidth={GRID_CELL_WIDTH}
                            onSectionRendered={onSectionRendered}
                            overscanRowCount={1}
                            style={{
                                overflowX: "hidden",
                                overflowY: loadingItems || items.length == 0 ? "hidden" : "auto",
                                zIndex: 1000,
                                outline: "none"
                            }}
                            cellRenderer={cellRenderer}
                        />
                    </>
                )
            }
        </>
    )
})

const List = memo(({ darkMode, isMobile, items, setItems, windowHeight, windowWidth, sidebarWidth, setActiveItem, setDragSelectState, setItemDragState, loadingItems, gridFolders, lang, searchTerm }: ListProps) => {
    const [listScrollState, setListScrollState] = useState<ListScrollState>({ clientHeight: windowHeight, scrollHeight: LIST_ITEM_HEIGHT * items.length, scrollTop: 0 })
    const [sortBy] = useDb("sortBy", {})
    const location = useLocation()

    const handleOnDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        setItemDragState({ clientX: 0, clientY: 0, items: [] })

        if(
            (e.target as HTMLElement).classList.contains("ReactVirtualized__List")
            || (e.target as HTMLElement).classList.contains("ReactVirtualized__List__innerScrollContainer")
            || (e.target as HTMLElement).classList.contains("ReactVirtualized__Grid")
            || (e.target as HTMLElement).classList.contains("ReactVirtualized__Grid__innerScrollContainer")
            || (e.target as HTMLElement).classList.contains("no-items-uploaded")
        ){
            const droppedItems: ItemProps[] = memoryCache.get("draggedItems") || []

            moveToParent(droppedItems, getCurrentParent()).catch(console.error)
        }
    }, [setItemDragState])

    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if(getCurrentParent().length < 32){
            return
        }

        if(DEFAULT_PARENTS.map(parent => location.pathname.indexOf(parent) !== -1 ? 1 : 0).filter(res => res == 1).length > 0){
            return
        }

        if(
            (e.target as HTMLElement).classList.contains("ReactVirtualized__List")
            || (e.target as HTMLElement).classList.contains("ReactVirtualized__List__innerScrollContainer")
            || (e.target as HTMLElement).classList.contains("ReactVirtualized__Grid")
            || (e.target as HTMLElement).classList.contains("ReactVirtualized__Grid__innerScrollContainer")
            || (e.target as HTMLElement).classList.contains("open-main-context-menu")
        ){
            setItems(prev => prev.map(mapItem => ({ ...mapItem, selected: false })))
            
            contextMenu.show({
                id: "mainContextMenu",
                event: e,
                position: {
                    x: e.nativeEvent.clientX,
                    y: e.nativeEvent.clientY
                }
            })
        }
    }, [location])

    useEffect(() => {
        setListScrollState({ clientHeight: windowHeight, scrollHeight: (gridFolders[window.location.href] ? GRID_CELL_HEIGHT : LIST_ITEM_HEIGHT ) * items.length, scrollTop: 0 })
    }, [location, items.length, windowHeight, gridFolders])

    useEffect(() => {
        setItems(prev => orderItemsByType(prev, sortBy[window.location.href], window.location.href))
    }, [sortBy[window.location.href]])

    return (
        <Flex
            width="100%"
            height={windowHeight - 50 - 40 - (gridFolders[window.location.href] ? 10 : 41) + "px"}
            flexDirection="column"
            overflowX="hidden"
            overflowY="hidden"
            zIndex={100}
            onDrop={handleOnDrop}
            outline="none"
            onContextMenu={handleContextMenu}
        >
            {
                !loadingItems && items.length == 0 ? (
                    <ListEmpty
                        darkMode={darkMode}
                        isMobile={isMobile}
                        lang={lang}
                        handleContextMenu={handleContextMenu}
                        searchTerm={searchTerm}
                    />
                ) : (
                    <>
                        <ListBody
                            darkMode={darkMode}
                            isMobile={isMobile}
                            gridFolders={gridFolders}
                            windowHeight={windowHeight}
                            windowWidth={windowWidth}
                            sidebarWidth={sidebarWidth}
                            setListScrollState={setListScrollState}
                            loadingItems={loadingItems}
                            items={items}
                            setItems={setItems}
                            setActiveItem={setActiveItem}
                            setItemDragState={setItemDragState}
                            setDragSelectState={setDragSelectState}
                            lang={lang}
                        />
                        <ListFooter 
                            darkMode={darkMode}
                            isMobile={isMobile}
                            items={items}
                            loadingItems={loadingItems}
                            listScrollState={listScrollState}
                            windowWidth={windowWidth}
                            sidebarWidth={sidebarWidth}
                            lang={lang}
                        />
                    </>
                )
            }
        </Flex>
    )
})

export default List