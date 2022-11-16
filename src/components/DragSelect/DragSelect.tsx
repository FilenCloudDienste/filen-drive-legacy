import { memo, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import type { DragSelectProps } from "../../types"
import { getDragSelectCoords } from "../../lib/helpers"
import { getColor } from "../../styles/colors"

const DragSelect = memo(({ darkMode, dragSelectState }: DragSelectProps) => {
    const coords = useMemo(() => {
        return getDragSelectCoords(dragSelectState.start, dragSelectState.current)
    }, [dragSelectState.start, dragSelectState.current])

    if(dragSelectState.start.clientX == 0 || dragSelectState.start.clientY == 0){
        return null
    }

    if(coords.height < 10 || coords.width < 10){
        return null
    }

    return (
        <Flex
            id="dragSelectBox"
            position="absolute"
            left={coords.left + "px"}
            top={coords.top + "px"}
            backgroundColor={getColor(darkMode, "dragSelect")}
            borderRadius="0px"
            width={coords.width + "px"}
            height={coords.height + "px"}
            border={"1px solid " + getColor(darkMode, "borderPrimary")}
            zIndex={100000}
            userSelect="none"
        >
            &nbsp;
        </Flex>
    )
})

export default DragSelect