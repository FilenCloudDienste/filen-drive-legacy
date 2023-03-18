import { memo, useCallback, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import { ItemProps } from "../../types"
import { getColor } from "../../styles/colors"
import { RiLink } from "react-icons/ri"
import { List as RVList, Grid as RVGrid } from "react-virtualized"
import AppText from "../../components/AppText"
import { i18n } from "../../i18n"
import { isBetween } from "../../lib/helpers"
import { GRID_CELL_HEIGHT, GRID_CELL_WIDTH } from "../../lib/constants"
import { SkeletonItem, Item } from "../../components/Item"

export interface PublicLinkFolderListProps {
    items: ItemProps[],
    darkMode: boolean,
    isMobile: boolean,
    lang: string,
    width: number,
    height: number,
    loadingItems: boolean,
    viewMode: "list" | "grid"
}

const PublicLinkFolderList = memo(({ items, darkMode, isMobile, lang, width, height, loadingItems, viewMode }: PublicLinkFolderListProps) => {
    const [columnCount, rowCount] = useMemo(() => {
        const containerWidth: number = width
        const columnCount: number = Math.floor(containerWidth / GRID_CELL_WIDTH)
        const rowCount: number = Math.floor(items.length / columnCount) + 1

        return [columnCount, rowCount]
    }, [items, width])

    const rowCountGrid: number = useMemo(() => {
        return loadingItems || items.length == 0 ? Math.floor((height / GRID_CELL_HEIGHT) * 1) : rowCount
    }, [loadingItems, items.length, height])

    const onRowsRendered = useCallback(({ startIndex, stopIndex }: { startIndex: number, stopIndex: number }) => {
        window.visibleItems = items.filter((_, index) => isBetween(startIndex, stopIndex, index))
    }, [items])

    const onSectionRendered = useCallback(({ rowStartIndex, rowStopIndex }: { rowStartIndex: number, rowStopIndex: number }) => {
        const columms: number = (columnCount + 1)
        const startIndex: number = (rowStartIndex * columms)
        const stopIndex: number = ((rowStopIndex * columms) + (columms * 2))

        window.visibleItems = items.filter((_, index) => isBetween(startIndex, stopIndex, index))
    }, [items, columnCount])

    const rowRenderer = useCallback(({ style, key, index, width }: { style: React.CSSProperties, key: string, index: number, width: number }) => {
        const item = items[index]

        return loadingItems || items.length == 0 ? (
            <SkeletonItem
                key={key}
                darkMode={darkMode}
                isMobile={isMobile}
                style={style}
                listWidth={width}
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
                setItems={() => {}}
                setActiveItem={() => {}}
                setItemDragState={() => {}}
                setDragSelectState={() => {}}
                listWidth={width}
                mode="list"
                lang={lang}
            />
        )
    }, [darkMode, isMobile, items, loadingItems, lang])

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
                listWidth={width}
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
                setItems={() => {}}
                setActiveItem={() => {}}
                setItemDragState={() => {}}
                setDragSelectState={() => {}}
                listWidth={width}
                mode="grid"
                lang={lang}
            />
        )
    }, [darkMode, isMobile, width, items, lang])

    return (
        <>
            {
                !loadingItems && items.length == 0 ? (
                    <Flex
                        width={width + "px"}
                        height={height + "px"}
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        className="no-items-uploaded"
                        paddingLeft="25px"
                        paddingRight="25px"
                    >
                        <RiLink
                            size={64}
                            color={getColor(darkMode, "textSecondary")}
                        />
                        <AppText
                            darkMode={darkMode}
                            isMobile={isMobile}
                            fontSize={22}
                            color={getColor(darkMode, "textPrimary")}
                            marginTop="10px"
                        >
                            {i18n(lang, "thisFolderIsEmpty")}
                        </AppText>
                        <AppText
                            darkMode={darkMode}
                            isMobile={isMobile}
                            fontSize={14}
                            color={getColor(darkMode, "textSecondary")}
                        >
                            {i18n(lang, "linkFolderEmptyInfo")}
                        </AppText>
                    </Flex>
                ) : (
                    <>
                        {
                            viewMode == "list" ? (
                                <>
                                    {/* @ts-ignore */}
                                    <RVList
                                        key="list"
                                        height={height}
                                        rowHeight={35}
                                        rowCount={loadingItems ? 32 : items.length}
                                        width={width}
                                        onRowsRendered={onRowsRendered}
                                        overscanRowCount={1}
                                        style={{
                                            overflowX: "hidden",
                                            overflowY: loadingItems || items.length == 0 ? "hidden" : "auto",
                                            zIndex: 1000,
                                            outline: "none",
                                            paddingTop: loadingItems || items.length == 0 ? "8px" : "0px"
                                        }}
                                        rowRenderer={({ style, key, index }) => rowRenderer({ style, key, index, width })}
                                    />
                                </>
                            ) : (
                                <>
                                    {/* @ts-ignore */}
                                    <RVGrid
                                        key="grid"
                                        height={height}
                                        width={width}
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
            }
        </>
    )
})

export default PublicLinkFolderList