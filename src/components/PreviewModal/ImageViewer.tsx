import { memo } from "react"
import type { ItemProps } from "../../types"
import { Spinner, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import ImagePreview from "../ImagePreview"

export interface ImageViewerProps {
    darkMode: boolean,
    isMobile: boolean,
    windowHeight: number,
    windowWidth: number,
    currentItem: ItemProps,
    image: string
}

const ImageViewer = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, image }: ImageViewerProps) => {
    return (
        <Flex
            width="100vw"
            height="100vh"
            flexDirection="column"
            backgroundColor={getColor(darkMode, "backgroundPrimary")}
        >
            <Flex
                width={windowWidth}
                height="50px"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                paddingLeft="15px"
                paddingRight="15px"
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                position="absolute"
                zIndex={100001}
            >
                <Flex>
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        noOfLines={1}
                        wordBreak="break-all"
                        color={getColor(darkMode, "textSecondary")}
                    >
                        {currentItem.name}
                    </AppText>
                </Flex>
            </Flex>
            <Flex
                width={windowWidth + "px"}
                height={(windowHeight - 50) + "px"}
                alignItems="center"
                justifyContent="center"
                marginTop="50px"
            >
                {
                    image.length > 0 ? (
                        <ImagePreview
                            image={image}
                            maxWidth={windowWidth}
                            maxHeight={(windowHeight - 50)}
                        />
                    ) : (
                        <Spinner 
                            width="64px"
                            height="64px"
                            color={getColor(darkMode, "textPrimary")}
                        />
                    )
                }
            </Flex>
        </Flex>
    )
})

export default ImageViewer