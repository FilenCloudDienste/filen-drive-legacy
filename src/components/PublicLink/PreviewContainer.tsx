import { memo } from "react"
import type { AppBaseProps, LinkGetInfoV1 } from "../../types"
import { Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../../components/AppText"
import Button from "../../components/Button"
import { MdReportGmailerrorred } from "react-icons/md"
import eventListener from "../../lib/eventListener"

export interface PreviewContainerProps extends AppBaseProps {
    children?: React.ReactNode,
    info: LinkGetInfoV1 | undefined,
    file: { name: string, size: number, mime: string } | undefined,
    download: any,
    toggleColorMode: any,
    previewContainerHeight: number,
    previewContainerWidth: number,
    password: string
}

const PreviewContainer = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang, children, info, file, download, toggleColorMode, previewContainerHeight, previewContainerWidth, password }: PreviewContainerProps) => {
    if(typeof file == "undefined" || typeof info == "undefined"){
        return null
    }

    return (
        <>
            <Flex
                width={previewContainerWidth + "px"}
                height={previewContainerHeight + "px"}
                justifyContent="center"
                alignItems="center"
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                padding={isMobile ? "0px" : "5px"}
                borderRadius={isMobile ? "0px" : "5px"}
                borderBottomRadius="0px"
            >
                <Flex
                    width="100%"
                    height="100%"
                    justifyContent="center"
                    alignItems="center"
                    backgroundColor={getColor(darkMode, "backgroundPrimary")}
                    borderRadius={isMobile ? "0px" : "5px"}
                >
                    {children}
                </Flex>
            </Flex>
            <Flex
                width={previewContainerWidth + "px"}
                height="auto"
                justifyContent="space-between"
                alignItems="center"
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                padding="5px"
                borderBottomRadius={isMobile ? "0px" : "5px"}
                paddingLeft="15px"
                paddingRight="15px"
                paddingBottom="10px"
            >
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    wordBreak="break-all"
                    color={getColor(darkMode, "textSecondary")}
                    paddingRight="15px"
                >
                    {file.name}
                </AppText>
                <Flex
                    alignItems="center"
                >
                    {
                        info.downloadBtn && (
                            <Button
                                darkMode={darkMode}
                                isMobile={isMobile}
                                backgroundColor={darkMode ? "white" : "gray"}
                                color={darkMode ? "black" : "white"}
                                border={"1px solid " + (darkMode ? "white" : "gray")}
                                height="35px"
                                _hover={{
                                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                                    border: "1px solid " + (darkMode ? "white" : "gray"),
                                    color: darkMode ? "white" : "gray"
                                }}
                                onClick={() => download()}
                            >
                                Download
                            </Button>
                        )
                    }
                    <Button
                        darkMode={darkMode}
                        isMobile={isMobile}
                        backgroundColor={darkMode ? "white" : "gray"}
                        color={darkMode ? "black" : "white"}
                        border={"1px solid " + (darkMode ? "white" : "gray")}
                        height="35px"
                        marginLeft="10px"
                        _hover={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            border: "1px solid " + (darkMode ? "white" : "gray"),
                            color: darkMode ? "white" : "gray"
                        }}
                        onClick={() => eventListener.emit("openAbuseReportModal", {
                            password
                        })}
                    >
                        <MdReportGmailerrorred
                            fontSize={24}
                        />
                    </Button>
                </Flex>
            </Flex>
        </>
    )
})

export default PreviewContainer