import { memo } from "react"
import type { ItemProps } from "../../types"
import { Spinner, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"

export interface VideoViewerProps {
    darkMode: boolean,
    isMobile: boolean,
    windowHeight: number,
    windowWidth: number,
    currentItem: ItemProps,
    video: string
}

const VideoViewer = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, video }: VideoViewerProps) => {
    return (
        <Flex
            className="full-viewport"
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
                    video.length > 0 ? (
                        <video
                            autoPlay={true}
                            controls={true}
                            src={video}
                            style={{
                                maxHeight: (windowHeight - 50) + "px",
                                maxWidth: windowWidth + "px"
                            }}
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

export default VideoViewer