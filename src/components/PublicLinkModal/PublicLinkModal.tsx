import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { PublicLinkModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Spinner, ModalFooter, ModalHeader, Switch, Flex, Button, Select } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { itemPublicLinkInfo, enableItemPublicLink, disableItemPublicLink, editItemPublicLink } from "../../lib/api"
import db from "../../lib/db"
import { show as showToast, dismiss as dismissToast, update as updateToast } from "../Toast/Toast"
import { CHAKRA_COLOR_SCHEME } from "../../lib/constants"
import { decryptFolderLinkKey } from "../../lib/worker/worker.com"
import { ONE_YEAR } from "../../lib/constants"
import { i18n } from "../../i18n"
import { removeItemsFromStore, addItemsToStore } from "../../lib/services/metadata"

const PublicLinkModal = memo(({ darkMode, isMobile, lang, setItems }: PublicLinkModalProps) => {
    const [open, setOpen] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<ItemProps>()
    const [fetchingInfo, setFetchingInfo] = useState<boolean>(false)
    const [info, setInfo] = useState<any>(undefined)
    const [key, setKey] = useState<string>("")
    const [passwordDummy, setPasswordDummy] = useState<string>("")
    const isOpen = useRef<boolean>(false)

    const mapExpirationToString: { [key: string]: string } = useMemo(() => {
        return {
            "never": i18n(lang, "expire_never"),
            "1h": i18n(lang, "expire_1h"),
            "6h": i18n(lang, "expire_6h"),
            "1d": i18n(lang, "expire_1d"),
            "3d": i18n(lang, "expire_3d"),
            "7d": i18n(lang, "expire_7d"),
            "14d": i18n(lang, "expire_14d"),
            "30d": i18n(lang, "expire_30d")
        }
    }, [lang])

    const fetchInfo = useCallback((item: ItemProps, waitUntilEnabled: boolean = false, waitUntilDisabled: boolean = false) => {
        setInfo(undefined)
        setFetchingInfo(true)
        setKey("")
        setPasswordDummy("")

        const req = () => {
            itemPublicLinkInfo(item).then(async (info) => {
                if(waitUntilEnabled){
                    if(item.type == "folder"){
                        if(typeof info.exists == "boolean" && !info.exists){
                            return setTimeout(req, 250)
                        }
                    }
                    else{
                        if(typeof info.enabled == "boolean" && !info.enabled){
                            return setTimeout(req, 250)
                        }
                    }
                }

                if(waitUntilDisabled){
                    if(item.type == "folder"){
                        if(typeof info.exists == "boolean" && info.exists){
                            return setTimeout(req, 250)
                        }
                    }
                    else{
                        if(typeof info.enabled == "boolean" && info.enabled){
                            return setTimeout(req, 250)
                        }
                    }
                }

                if(item.type == "folder" && typeof info.exists == "boolean" && info.exists){
                    const masterKeys: string[] = await db.get("masterKeys")
                    const keyDecrypted: string = await decryptFolderLinkKey(info.key, masterKeys)
    
                    if(keyDecrypted.length == 0){
                        setOpen(false)
    
                        return
                    }
    
                    setKey(keyDecrypted)
                }
    
                setInfo(info)
                setFetchingInfo(false)
            }).catch((err) => {
                setFetchingInfo(false)
    
                console.error(err)
            })
        }

        req()
    }, [])

    const enable = useCallback(async () => {
        if(typeof currentItem == "undefined"){
            return
        }

        setFetchingInfo(true)

        const loading = showToast("loading", i18n(lang, "addingItemsToPublicLink"), "bottom", ONE_YEAR)

        try{
            await enableItemPublicLink(currentItem, (current, total) => {
                const left: number = (total - current)

                if(left <= 0){
                    updateToast(loading, "loading", i18n(lang, "addingItemsToPublicLinkProgress", true, ["__LEFT__"], ["0"]), ONE_YEAR)

                    return
                }

                updateToast(loading, "loading", i18n(lang, "addingItemsToPublicLinkProgress", true, ["__LEFT__"], [left.toString()]), ONE_YEAR)
            })

            addItemsToStore([currentItem], "links").catch(console.error)

            fetchInfo(currentItem, true)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)

            fetchInfo(currentItem)
        }

        dismissToast(loading)
    }, [currentItem])

    const disable = useCallback(async () => {
        if(typeof currentItem == "undefined" || typeof info == "undefined"){
            return
        }

        setFetchingInfo(true)

        try{
            await disableItemPublicLink(currentItem, info.uuid)

            removeItemsFromStore([currentItem], "links").catch(console.error)

            if(window.location.href.indexOf("links") !== -1){
                setItems(prev => prev.filter(item => item.uuid !== currentItem.uuid))
            }

            showToast("success", i18n(lang, "publicLinkDisabled"), "bottom", 5000)

            setOpen(false)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)

            fetchInfo(currentItem)
        }
    }, [currentItem, info])

    const save = useCallback(async () => {
        if(typeof currentItem == "undefined" || typeof info == "undefined"){
            return
        }

        setFetchingInfo(true)

        try{
            await editItemPublicLink(currentItem, info.uuid, info.expirationText, passwordDummy, info.downloadBtn)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        fetchInfo(currentItem)
    }, [currentItem, info, passwordDummy])

    const windowOnKeyDown = useCallback((e: KeyboardEvent): void => {
        if(e.which == 13 && typeof currentItem !== "undefined" && isOpen.current){
            save()
        }
    }, [isOpen.current, currentItem])

    useEffect(() => {
        isOpen.current = open
    }, [open])

    useEffect(() => {
        window.addEventListener("keydown", windowOnKeyDown)

        const openPublicLinkModalListener = eventListener.on("openPublicLinkModal", ({ item }: { item: ItemProps }) => {
            setCurrentItem(item)
            fetchInfo(item)
            setOpen(true)
        })
        
        return () => {
            window.removeEventListener("keydown", windowOnKeyDown)

            openPublicLinkModalListener.remove()
        }
    }, [])

    if(typeof currentItem == "undefined"){
        return null
    }

    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "xl" : "xl"}
            autoFocus={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "publicLink")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                >
                    {
                        fetchingInfo ? (
                            <Flex
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Spinner
                                    width="32px"
                                    height="32px"
                                    color={getColor(darkMode, "textPrimary")}
                                />
                            </Flex>
                        ) : (
                            <>
                                {
                                    currentItem.type == "file" ? (
                                        <>
                                            {
                                                typeof info.enabled == "boolean" && info.enabled ? (
                                                    <>
                                                        <Flex
                                                            justifyContent="space-between"
                                                            alignItems="center"
                                                        >
                                                            <AppText
                                                                darkMode={darkMode}
                                                                isMobile={isMobile}
                                                                color={getColor(darkMode, "textSecondary")}
                                                                noOfLines={1}
                                                                wordBreak="break-all"
                                                            >
                                                                {i18n(lang, "enabled")}
                                                            </AppText>
                                                            <Switch
                                                                size="lg"
                                                                colorScheme={CHAKRA_COLOR_SCHEME}
                                                                isChecked={true}
                                                                onChange={(e) => {
                                                                    if(e.target.checked){
                                                                        return
                                                                    }

                                                                    disable()
                                                                }}
                                                            />
                                                        </Flex>
                                                        <AppText
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            color={getColor(darkMode, "textSecondary")}
                                                            noOfLines={1}
                                                            wordBreak="break-all"
                                                            fontSize={12}
                                                            marginTop="30px"
                                                        >
                                                            {i18n(lang, "publicLink")}
                                                        </AppText>
                                                        <Flex
                                                            marginTop="5px"
                                                            gap="20px"
                                                            alignItems="center"
                                                        >
                                                            <Input
                                                                darkMode={darkMode}
                                                                isMobile={isMobile}
                                                                value={window.location.protocol + "//" + window.location.host + "/d/" + info.uuid +  "#" + currentItem.key}
                                                                onChange={() => {}}
                                                                color={getColor(darkMode, "textSecondary")}
                                                                _placeholder={{
                                                                    color: getColor(darkMode, "textSecondary")
                                                                }}
                                                            />
                                                            <Button
                                                                height="38px"
                                                                backgroundColor={darkMode ? "white" : "gray"}
                                                                color={darkMode ? "black" : "white"}
                                                                border={"1px solid " + (darkMode ? "white" : "gray")}
                                                                _hover={{
                                                                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                                                                    border: "1px solid " + (darkMode ? "white" : "gray"),
                                                                    color: darkMode ? "white" : "gray"
                                                                }}
                                                                onClick={() => {
                                                                    try{
                                                                        navigator.clipboard.writeText(window.location.protocol + "//" + window.location.host + "/d/" + info.uuid +  "#" + currentItem.key)

                                                                        showToast("success", i18n(lang, "copied"), "bottom", 3000)
                                                                    }
                                                                    catch(e){
                                                                        console.error(e)
                                                                    }
                                                                }}
                                                            >
                                                                {i18n(lang, "copy")}
                                                            </Button>
                                                        </Flex>
                                                        <AppText
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            color={getColor(darkMode, "textSecondary")}
                                                            noOfLines={1}
                                                            wordBreak="break-all"
                                                            fontSize={12}
                                                            marginTop="20px"
                                                        >
                                                            {i18n(lang, "expireAfter")}
                                                        </AppText>
                                                        <Select
                                                            marginTop="5px"
                                                            value={info.expirationText}
                                                            onChange={(e) => {
                                                                setInfo((prev: any) => ({
                                                                    ...prev,
                                                                    expirationText: e.target.value
                                                                }))
                                                            }}
                                                            borderColor={getColor(darkMode, "borderPrimary")}
                                                            outline="none"
                                                            shadow="none"
                                                            _hover={{
                                                                borderColor: getColor(darkMode, "borderActive"),
                                                                outline: "none",
                                                                shadow: "none"
                                                            }}
                                                            _focus={{
                                                                borderColor: getColor(darkMode, "borderActive"),
                                                                outline: "none",
                                                                shadow: "none"
                                                            }}
                                                            _active={{
                                                                borderColor: getColor(darkMode, "borderActive"),
                                                                outline: "none",
                                                                shadow: "none"
                                                            }}
                                                        >
                                                            {
                                                                Object.keys(mapExpirationToString).map((exp) => {
                                                                    return (
                                                                        <option
                                                                            key={exp}
                                                                            value={exp}
                                                                            style={{
                                                                                backgroundColor: getColor(darkMode, "backgroundSecondary")
                                                                            }}
                                                                        >
                                                                            {mapExpirationToString[exp]}
                                                                        </option>
                                                                    )
                                                                })
                                                            }
                                                        </Select>
                                                        <AppText
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            color={getColor(darkMode, "textSecondary")}
                                                            noOfLines={1}
                                                            wordBreak="break-all"
                                                            fontSize={12}
                                                            marginTop="20px"
                                                        >
                                                            {i18n(lang, "publicLinkPassword")}
                                                        </AppText>
                                                        <Input
                                                            marginTop="5px"
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            placeholder={i18n(lang, "password")}
                                                            value={passwordDummy}
                                                            type="password"
                                                            onChange={(e) => setPasswordDummy(e.target.value)}
                                                            color={getColor(darkMode, "textSecondary")}
                                                            _placeholder={{
                                                                color: getColor(darkMode, "textSecondary")
                                                            }}
                                                        />
                                                        <Flex
                                                            justifyContent="space-between"
                                                            alignItems="center"
                                                            marginTop="30px"
                                                        >
                                                            <AppText
                                                                darkMode={darkMode}
                                                                isMobile={isMobile}
                                                                color={getColor(darkMode, "textSecondary")}
                                                                noOfLines={1}
                                                                wordBreak="break-all"
                                                            >
                                                                {i18n(lang, "publicLinkDownloadBtn")}
                                                            </AppText>
                                                            <Switch
                                                                size="lg"
                                                                colorScheme={CHAKRA_COLOR_SCHEME}
                                                                isChecked={typeof info.downloadBtn == "string" ? (info.downloadBtn == "enable") : (info.downloadBtn == 1)}
                                                                onChange={(e) => {
                                                                    setInfo((prev: any) => ({
                                                                        ...prev,
                                                                        downloadBtn: e.target.checked ? "enable" : "disable"
                                                                    }))
                                                                }}
                                                            />
                                                        </Flex>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Flex
                                                            justifyContent="space-between"
                                                            alignItems="center"
                                                        >
                                                            <AppText
                                                                darkMode={darkMode}
                                                                isMobile={isMobile}
                                                                color={getColor(darkMode, "textSecondary")}
                                                                noOfLines={1}
                                                                wordBreak="break-all"
                                                            >
                                                                {i18n(lang, "enabled")}
                                                            </AppText>
                                                            <Switch
                                                                size="lg"
                                                                colorScheme={CHAKRA_COLOR_SCHEME}
                                                                isChecked={false}
                                                                onChange={(e) => {
                                                                    if(!e.target.checked){
                                                                        return
                                                                    }

                                                                    enable()
                                                                }}
                                                            />
                                                        </Flex>
                                                    </>
                                                )
                                            }
                                        </>
                                    ) : (
                                        <>
                                            {
                                                typeof info.exists == "boolean" && info.exists && typeof key == "string" && key.length >= 32 ? (
                                                    <>
                                                        <Flex
                                                            justifyContent="space-between"
                                                            alignItems="center"
                                                        >
                                                            <AppText
                                                                darkMode={darkMode}
                                                                isMobile={isMobile}
                                                                color={getColor(darkMode, "textSecondary")}
                                                                noOfLines={1}
                                                                wordBreak="break-all"
                                                            >
                                                                {i18n(lang, "enabled")}
                                                            </AppText>
                                                            <Switch
                                                                size="lg"
                                                                colorScheme={CHAKRA_COLOR_SCHEME}
                                                                isChecked={true}
                                                                onChange={(e) => {
                                                                    if(e.target.checked){
                                                                        return
                                                                    }

                                                                    disable()
                                                                }}
                                                            />
                                                        </Flex>
                                                        <AppText
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            color={getColor(darkMode, "textSecondary")}
                                                            noOfLines={1}
                                                            wordBreak="break-all"
                                                            fontSize={12}
                                                            marginTop="30px"
                                                        >
                                                            {i18n(lang, "publicLink")}
                                                        </AppText>
                                                        <Flex
                                                            marginTop="5px"
                                                            gap="20px"
                                                            alignItems="center"
                                                        >
                                                            <Input
                                                                darkMode={darkMode}
                                                                isMobile={isMobile}
                                                                value={window.location.protocol + "//" + window.location.host + "/f/" + info.uuid +  "#" + key}
                                                                onChange={() => {}}
                                                                color={getColor(darkMode, "textSecondary")}
                                                                _placeholder={{
                                                                    color: getColor(darkMode, "textSecondary")
                                                                }}
                                                            />
                                                            <Button
                                                                height="38px"
                                                                backgroundColor={darkMode ? "white" : "gray"}
                                                                color={darkMode ? "black" : "white"}
                                                                border={"1px solid " + (darkMode ? "white" : "gray")}
                                                                _hover={{
                                                                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                                                                    border: "1px solid " + (darkMode ? "white" : "gray"),
                                                                    color: darkMode ? "white" : "gray"
                                                                }}
                                                                onClick={() => {
                                                                    try{
                                                                        navigator.clipboard.writeText(window.location.protocol + "//" + window.location.host + "/f/" + info.uuid +  "#" + key)

                                                                        showToast("success", i18n(lang, "copied"), "bottom", 3000)
                                                                    }
                                                                    catch(e){
                                                                        console.error(e)
                                                                    }
                                                                }}
                                                            >
                                                                {i18n(lang, "copy")}
                                                            </Button>
                                                        </Flex>
                                                        <AppText
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            color={getColor(darkMode, "textSecondary")}
                                                            noOfLines={1}
                                                            wordBreak="break-all"
                                                            fontSize={12}
                                                            marginTop="20px"
                                                        >
                                                            {i18n(lang, "expireAfter")}
                                                        </AppText>
                                                        <Select
                                                            marginTop="5px"
                                                            value={info.expirationText}
                                                            onChange={(e) => {
                                                                setInfo((prev: any) => ({
                                                                    ...prev,
                                                                    expirationText: e.target.value
                                                                }))
                                                            }}
                                                            borderColor={getColor(darkMode, "borderPrimary")}
                                                            outline="none"
                                                            shadow="none"
                                                            _hover={{
                                                                borderColor: getColor(darkMode, "borderActive"),
                                                                outline: "none",
                                                                shadow: "none"
                                                            }}
                                                            _focus={{
                                                                borderColor: getColor(darkMode, "borderActive"),
                                                                outline: "none",
                                                                shadow: "none"
                                                            }}
                                                            _active={{
                                                                borderColor: getColor(darkMode, "borderActive"),
                                                                outline: "none",
                                                                shadow: "none"
                                                            }}
                                                        >
                                                            {
                                                                Object.keys(mapExpirationToString).map((exp) => {
                                                                    return (
                                                                        <option
                                                                            key={exp}
                                                                            value={exp}
                                                                            style={{
                                                                                backgroundColor: getColor(darkMode, "backgroundSecondary")
                                                                            }}
                                                                        >
                                                                            {mapExpirationToString[exp]}
                                                                        </option>
                                                                    )
                                                                })
                                                            }
                                                        </Select>
                                                        <AppText
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            color={getColor(darkMode, "textSecondary")}
                                                            noOfLines={1}
                                                            wordBreak="break-all"
                                                            fontSize={12}
                                                            marginTop="20px"
                                                        >
                                                            {i18n(lang, "publicLinkPassword")}
                                                        </AppText>
                                                        <Input
                                                            darkMode={darkMode}
                                                            isMobile={isMobile}
                                                            placeholder={i18n(lang, "password")}
                                                            value={passwordDummy}
                                                            type="password"
                                                            onChange={(e) => setPasswordDummy(e.target.value)}
                                                            marginTop="5px"
                                                            color={getColor(darkMode, "textSecondary")}
                                                            _placeholder={{
                                                                color: getColor(darkMode, "textSecondary")
                                                            }}
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <Flex
                                                            justifyContent="space-between"
                                                            alignItems="center"
                                                        >
                                                            <AppText
                                                                darkMode={darkMode}
                                                                isMobile={isMobile}
                                                                color={getColor(darkMode, "textSecondary")}
                                                                noOfLines={1}
                                                                wordBreak="break-all"
                                                            >
                                                                {i18n(lang, "enabled")}
                                                            </AppText>
                                                            <Switch
                                                                size="lg"
                                                                colorScheme={CHAKRA_COLOR_SCHEME}
                                                                isChecked={false}
                                                                onChange={(e) => {
                                                                    if(!e.target.checked){
                                                                        return
                                                                    }

                                                                    enable()
                                                                }}
                                                            />
                                                        </Flex>
                                                    </>
                                                )
                                            }
                                        </>
                                    )
                                }
                            </>
                        )
                    }
                </ModalBody>
                <ModalFooter
                    marginTop="15px"
                >
                    {
                        !fetchingInfo && ((typeof info.enabled == "boolean" && info.enabled) || (typeof info.exists == "boolean" && info.exists)) && (
                            <>
                                <AppText
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    noOfLines={1}
                                    wordBreak="break-all"
                                    color={getColor(darkMode, "linkPrimary")}
                                    cursor="pointer"
                                    onClick={() => save()}
                                >
                                    {i18n(lang, "save")}
                                </AppText>
                            </>
                        )
                    }
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export default PublicLinkModal