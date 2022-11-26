import { memo, useState, useEffect, useRef, useCallback } from "react"
import type { CreateFolderModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { createFolder } from "../../lib/api"
import db from "../../lib/db"
import { orderItemsByType, getCurrentURLParentFolder } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { v4 as uuidv4 } from "uuid"
import { addFolderNameToDb } from "../../lib/services/items"
import { i18n } from "../../i18n"

const CreateFolderModal = memo(({ darkMode, isMobile, windowHeight, windowWidth, setItems, items, lang }: CreateFolderModalProps) => {
    const [open, setOpen] = useState<boolean>(false)
    const [newName, setNewName] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const inputRef = useRef()
    const currentItems = useRef<ItemProps[]>([])
    const isOpen = useRef<boolean>(false)
    const newNameRef = useRef<string>("")

    const create = async (): Promise<void> => {
        if(loading){
            return
        }

        const value = newNameRef.current.trim()

        if(value.length == 0){
            showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

            return
        }

        if(currentItems.current.filter(item => item.name == value && item.type == "folder").length > 0){
            showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

            return
        }

        setLoading(true)

        const uuid = uuidv4()
        const parent = getCurrentURLParentFolder()

        try{
            await createFolder({ uuid, name: value, parent, emitEvents: false })
            await addFolderNameToDb(uuid, value)
        }
        catch(e: any){
            console.error(e)

            setLoading(false)

            showToast("error", e.toString(), "bottom", 5000)
        }

        const newFolderItem: ItemProps = {
            type: "folder",
            parent,
            uuid,
            name: value,
            size: 0,
            mime: "Folder",
            lastModified: new Date().getTime(),
            lastModifiedSort: new Date().getTime(),
            timestamp: Math.floor(new Date().getTime() / 1000),
            selected: false,
            color: "default",
            sharerEmail: "",
            sharerId: 0,
            receiverEmail: "",
            receiverId: 0,
            version: 0,
            rm: "",
            favorited: 0,
            chunks: 0,
            writeAccess: true,
            root: "",
            key: "",
            bucket: "",
            region: ""
        }

        const sortBy = (await db.get("sortBy")) || {}

        setItems(prev => orderItemsByType([...prev, ...[{ ...newFolderItem, selected: false }]], sortBy[window.location.href], window.location.href))
        setOpen(false)
        setLoading(false)
        setNewName("")
    }

    const windowOnKeyDown = useCallback((e: KeyboardEvent): void => {
        if(e.which == 13 && isOpen.current){
            create()
        }
    }, [isOpen.current])

    useEffect(() => {
        newNameRef.current = newName
    }, [newName])

    useEffect(() => {
        currentItems.current = items
    }, [items])

    useEffect(() => {
        isOpen.current = open
    }, [open])

    useEffect(() => {
        const openCreateFolderModalListener = eventListener.on("openCreateFolderModal", () => setOpen(true))

        window.addEventListener("keydown", windowOnKeyDown)
        
        return () => {
            openCreateFolderModalListener.remove()

            window.removeEventListener("keydown", windowOnKeyDown)
        }
    }, [])

    return (
        <Modal
            onClose={() => {
                setNewName("")
                setOpen(false)
            }}
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
                    {i18n(lang, "createFolder")}
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
                        placeholder={i18n(lang, "newFolderName")}
                        autoFocus={true}
                        onChange={(e) => setNewName(e.target.value)}
                        isDisabled={loading}
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
                                onClick={() => create()}
                            >
                                {i18n(lang, "create")}
                            </AppText>
                        )
                    }
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export default CreateFolderModal