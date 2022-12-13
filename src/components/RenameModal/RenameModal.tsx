import { memo, useState, useEffect, useRef, useCallback } from "react"
import type { RenameModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { renameFile, renameFolder } from "../../lib/api"
import db from "../../lib/db"
import { orderItemsByType, getFileExt, fileAndFolderNameValidation } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { addFolderNameToDb } from "../../lib/services/items"
import { i18n } from "../../i18n"
import { changeItemsInStore } from "../../lib/services/metadata"

const RenameModal = memo(({ darkMode, isMobile, setItems, items, lang }: RenameModalProps) => {
    const [open, setOpen] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<ItemProps | undefined>(undefined)
    const [newName, setNewName] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const inputRef = useRef()
    const currentItems = useRef<ItemProps[]>([])
    const isOpen = useRef<boolean>(false)
    const newNameRef = useRef<string>("")
    const oldNameRef = useRef<string>("")

    const rename = async (): Promise<void> => {
        if(loading){
            return
        }

        if(typeof currentItem == "undefined"){
            return
        }

        const value = newNameRef.current.trim()

        if(value.length == 0 || value == currentItem.name){
            showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

            return
        }

        const sameName = currentItems.current.filter(item => item.name.toLowerCase() == value.toLowerCase() && item.type == currentItem.type)

        if(sameName.length > 0){
            if(sameName[0].uuid !== currentItem.uuid){
                showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

                return
            }
        }

        if(!fileAndFolderNameValidation(value)){
            showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

            return
        }

        setLoading(true)

        try{
            const promise = currentItem.type == "file" ? renameFile({ file: currentItem, name: value }) : renameFolder({ folder: currentItem, name: value })
            const result = await promise

            if(result){
                if(currentItem.type == "folder"){
                    await addFolderNameToDb(currentItem.uuid, value)
                }

                const sortBy = (await db.get("sortBy")) || {}

                setItems(prev => orderItemsByType(prev.map(item => item.uuid == currentItem.uuid ? { ...item, name: value, selected: true } : { ...item, selected: false }), sortBy[window.location.href], window.location.href))
            }

            changeItemsInStore([{
                ...currentItem,
                name: value,
                selected: false
            }], currentItem.parent).catch(console.error)

            showToast("success", i18n(lang, "itemRenamed"))

            setOpen(false)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setLoading(false)
    }

    const setSelectionRange = useCallback(async (): Promise<void> => {
        await new Promise((resolve) => {
            const wait = setInterval(() => {
                if(inputRef.current){
                    clearInterval(wait)

                    return resolve(true)
                }
            })
        })

        if(!inputRef.current){
            return
        }

        const input = (inputRef.current as HTMLInputElement)

        if(!input){
            return
        }
        
        if(oldNameRef.current.indexOf(".") == -1){
            input.setSelectionRange(0, oldNameRef.current.length, "forward")

            return
        }

        const extLength = getFileExt(oldNameRef.current).length + 1

        input.setSelectionRange(0, (oldNameRef.current.length - extLength), "forward")
    }, [])

    const windowOnKeyDown = useCallback((e: KeyboardEvent): void => {
        if(e.which == 13 && isOpen.current){
            rename()
        }
    }, [isOpen.current])

    useEffect(() => {
        currentItems.current = items
    }, [items])

    useEffect(() => {
        isOpen.current = open
    }, [open])

    useEffect(() => {
        newNameRef.current = newName
    }, [newName])

    useEffect(() => {
        const openRenameModalListener = eventListener.on("openRenameModal", ({ item }: { item: ItemProps }) => {
            setCurrentItem(item)
            setNewName(item.name)
            setOpen(true)
            setSelectionRange()

            oldNameRef.current = item.name
        })

        window.addEventListener("keydown", windowOnKeyDown)
        
        return () => {
            openRenameModalListener.remove()

            window.removeEventListener("keydown", windowOnKeyDown)
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
            size={isMobile ? "xl" : "md"}
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
                    {i18n(lang, "rename")}
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
                    alignItems="center"
                    justifyContent="center"
                >
                    <Input
                        darkMode={darkMode}
                        isMobile={isMobile}
                        value={newName}
                        placeholder={i18n(lang, "renameNewName")}
                        autoFocus={true}
                        onChange={(e) => setNewName(e.target.value)}
                        ref={inputRef}
                        color={getColor(darkMode, "textSecondary")}
                        _placeholder={{
                            color: getColor(darkMode, "textSecondary")
                        }}
                    />
                </ModalBody>
                <ModalFooter>
                    {
                        loading ? (
                            <Spinner
                                width="16px"
                                height="16px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color={getColor(darkMode, "linkPrimary")}
                                cursor="pointer"
                                onClick={() => rename()}
                            >
                                {i18n(lang, "save")}
                            </AppText>
                        )
                    }
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export default RenameModal