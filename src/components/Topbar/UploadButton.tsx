import { memo } from "react"
import { Flex, Menu, MenuButton, MenuList, MenuItem, forwardRef, Button } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import type { UploadButtonProps } from "../../types"
import eventListener from "../../lib/eventListener"
import { i18n } from "../../i18n"

const UploadButton = memo(({ darkMode, isMobile, lang, enabled }: UploadButtonProps) => {
    return (
        <Flex
            backgroundColor="transparent"
            borderRadius={5}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
        >
            <Menu>
                <MenuButton
                    disabled={!enabled}
                    as={forwardRef((props, ref) => (
                        <Flex ref={ref} {...props}>
                            <Button
                                backgroundColor={darkMode ? "white" : "gray"}
                                color={darkMode ? "black" : "white"}
                                height="28px"
                                paddingLeft="10px"
                                paddingRight="10px"
                                fontSize={13}
                                border={"1px solid " + (darkMode ? "white" : "gray")}
                                marginRight="15px"
                                disabled={!enabled}
                                _hover={{
                                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                                    border: "1px solid " + (darkMode ? "white" : "gray"),
                                    color: darkMode ? "white" : "gray"
                                }}
                            >
                                {i18n(lang, "new")}
                            </Button>
                        </Flex>
                    ))}
                >
                    {i18n(lang, "new")}
                </MenuButton>
                <MenuList
                    boxShadow="base"
                    paddingTop="5px"
                    paddingBottom="5px"
                    backgroundColor={getColor(darkMode, "backgroundPrimary")}
                    borderColor={getColor(darkMode, "borderPrimary")}
                    minWidth="150px"
                    zIndex={1000001}
                >
                    <MenuItem 
                        height="auto"
                        fontSize={14}
                        paddingTop="5px"
                        paddingBottom="5px"
                        backgroundColor={getColor(darkMode, "backgroundPrimary")}
                        color={getColor(darkMode, "textSecondary")}
                        _hover={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        _active={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        _focus={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        onClick={() => document.getElementById("file-input")?.click()}
                    >
                        {i18n(lang, "uploadFiles")}
                    </MenuItem>
                    <MenuItem 
                        height="auto"
                        fontSize={14}
                        paddingTop="5px"
                        paddingBottom="5px"
                        backgroundColor={getColor(darkMode, "backgroundPrimary")}
                        color={getColor(darkMode, "textSecondary")}
                        _hover={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        _active={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        _focus={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        onClick={() => document.getElementById("folder-input")?.click()}
                    >
                        {i18n(lang, "uploadFolders")}
                    </MenuItem>
                    <MenuItem 
                        height="auto"
                        fontSize={14}
                        paddingTop="5px"
                        paddingBottom="5px"
                        backgroundColor={getColor(darkMode, "backgroundPrimary")}
                        color={getColor(darkMode, "textSecondary")}
                        _hover={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        _active={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        _focus={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: getColor(darkMode, "textPrimary")
                        }}
                        onClick={() => eventListener.emit("openCreateFolderModal")}
                    >
                        {i18n(lang, "newFolder")}
                    </MenuItem>
                </MenuList>
            </Menu>
        </Flex>
    )
})

export default UploadButton