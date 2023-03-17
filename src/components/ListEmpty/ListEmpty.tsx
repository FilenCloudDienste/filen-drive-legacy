import { memo, useMemo } from "react"
import { useLocation } from "react-router-dom"
import SelectFromComputer from "../SelectFromComputer"
import { Flex } from "@chakra-ui/react"
import { IoFolder, IoTrash } from "react-icons/io5"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { MdOutlineFavorite } from "react-icons/md"
import { HiClock } from "react-icons/hi"
import { RiFolderSharedFill, RiLink, RiFolderReceivedFill } from "react-icons/ri"
import { i18n } from "../../i18n"
import { AiOutlineSearch } from "react-icons/ai"

const ListEmpty = memo(({ darkMode, isMobile, lang, handleContextMenu, searchTerm }: { darkMode: boolean, isMobile: boolean, lang: string, handleContextMenu: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => any, searchTerm: string }) => {
    const location = useLocation()

    const sizes = useMemo(() => {
        return {
            icon: isMobile ? 90 : 128,
            primary: isMobile ? 20 : 22,
            secondary: isMobile ? 12 : 14
        }
    }, [isMobile])

    if(searchTerm.length > 0){
        return (
            <Flex
                width="100%"
                height="100%"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                className="no-items-uploaded"
                paddingLeft="15px"
                paddingRight="15px"
            >
                <AiOutlineSearch
                    size={sizes.icon}
                    color={getColor(darkMode, "textSecondary")}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={isMobile ? 15: 17}
                    color={getColor(darkMode, "textSecondary")}
                    marginTop="10px"
                >
                    {i18n(lang, "searchNothingFound", true, ["__TERM__"], [searchTerm])}
                </AppText>
            </Flex>
        )
    }

    if(location.hash.indexOf("shared-in") !== -1){
        return (
            <Flex
                width="100%"
                height="100%"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                className="no-items-uploaded"
                paddingLeft="15px"
                paddingRight="15px"
            >
                <RiFolderReceivedFill
                    size={sizes.icon}
                    color={getColor(darkMode, "textSecondary")}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.primary}
                    color={getColor(darkMode, "textPrimary")}
                    marginTop="10px"
                >
                    {i18n(lang, "listEmpty_1")}
                </AppText>
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.secondary}
                    color={getColor(darkMode, "textSecondary")}
                >
                    {i18n(lang, "listEmpty_2")}
                </AppText>
            </Flex>
        )
    }

    if(location.hash.indexOf("shared-out") !== -1){
        return (
            <Flex
                width="100%"
                height="100%"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                className="no-items-uploaded"
                paddingLeft="15px"
                paddingRight="15px"
            >
                <RiFolderSharedFill
                    size={sizes.icon}
                    color={getColor(darkMode, "textSecondary")}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.primary}
                    color={getColor(darkMode, "textPrimary")}
                    marginTop="10px"
                >
                    {i18n(lang, "listEmpty_3")}
                </AppText>
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.secondary}
                    color={getColor(darkMode, "textSecondary")}
                >
                    {i18n(lang, "listEmpty_4")}
                </AppText>
            </Flex>
        )
    }

    if(location.hash.indexOf("links") !== -1){
        return (
            <Flex
                width="100%"
                height="100%"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                className="no-items-uploaded"
                paddingLeft="15px"
                paddingRight="15px"
            >
                <RiLink
                    size={sizes.icon}
                    color={getColor(darkMode, "textSecondary")}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.primary}
                    color={getColor(darkMode, "textPrimary")}
                    marginTop="10px"
                >
                    {i18n(lang, "listEmpty_5")}
                </AppText>
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.secondary}
                    color={getColor(darkMode, "textSecondary")}
                >
                    {i18n(lang, "listEmpty_6")}
                </AppText>
            </Flex>
        )
    }

    if(location.hash.indexOf("favorites") !== -1){
        return (
            <Flex
                width="100%"
                height="100%"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                className="no-items-uploaded"
                paddingLeft="15px"
                paddingRight="15px"
            >
                <MdOutlineFavorite
                    size={sizes.icon}
                    color={getColor(darkMode, "textSecondary")}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.primary}
                    color={getColor(darkMode, "textPrimary")}
                    marginTop="10px"
                >
                    {i18n(lang, "listEmpty_7")}
                </AppText>
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.secondary}
                    color={getColor(darkMode, "textSecondary")}
                >
                    {i18n(lang, "listEmpty_8")}
                </AppText>
            </Flex>
        )
    }

    if(location.hash.indexOf("recent") !== -1){
        return (
            <Flex
                width="100%"
                height="100%"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                className="no-items-uploaded"
                paddingLeft="15px"
                paddingRight="15px"
            >
                <HiClock
                    size={sizes.icon}
                    color={getColor(darkMode, "textSecondary")}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.primary}
                    color={getColor(darkMode, "textPrimary")}
                    marginTop="10px"
                >
                    {i18n(lang, "listEmpty_9")}
                </AppText>
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.secondary}
                    color={getColor(darkMode, "textSecondary")}
                >
                    {i18n(lang, "listEmpty_10")}
                </AppText>
            </Flex>
        )
    }

    if(location.hash.indexOf("trash") !== -1){
        return (
            <Flex
                width="100%"
                height="100%"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                className="no-items-uploaded"
                paddingLeft="15px"
                paddingRight="15px"
            >
                <IoTrash
                    size={sizes.icon}
                    color={getColor(darkMode, "textSecondary")}
                />
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.primary}
                    color={getColor(darkMode, "textPrimary")}
                    marginTop="10px"
                >
                    {i18n(lang, "listEmpty_11")}
                </AppText>
                <AppText
                    darkMode={darkMode}
                    isMobile={isMobile}
                    noOfLines={1}
                    fontSize={sizes.secondary}
                    color={getColor(darkMode, "textSecondary")}
                >
                    {i18n(lang, "listEmpty_12")}
                </AppText>
            </Flex>
        )
    }

    return (
        <Flex
            width="100%"
            height="100%"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            className="no-items-uploaded open-main-context-menu"
            onContextMenu={handleContextMenu}
            paddingLeft="15px"
            paddingRight="15px"
        >
            <IoFolder
                size={sizes.icon}
                color={getColor(darkMode, "textSecondary")}
            />
            <AppText
                darkMode={darkMode}
                isMobile={isMobile}
                noOfLines={1}
                fontSize={sizes.primary}
                color={getColor(darkMode, "textPrimary")}
                marginTop="10px"
            >
                {i18n(lang, "listEmpty_13")}
            </AppText>
            <AppText
                darkMode={darkMode}
                isMobile={isMobile}
                noOfLines={1}
                fontSize={sizes.secondary}
                color={getColor(darkMode, "textSecondary")}
            >
                {i18n(lang, "listEmpty_14")}
            </AppText>
            <Flex
                marginTop="15px"
            >
                <SelectFromComputer
                    darkMode={darkMode}
                    isMobile={isMobile}
                    lang={lang}
                    mode="uploadButton"
                />
            </Flex>
        </Flex>
    )
})

export default ListEmpty