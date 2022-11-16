import { memo, useState, useEffect, useRef } from "react"
import type { DeleteModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { trashItem } from "../../lib/api"
import db from "../../lib/db"
import { orderItemsByType } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { i18n } from "../../i18n"
import { addItemsToStore, removeItemsFromStore, DEFAULT_PARENTS } from "../../lib/services/metadata"

const DeleteModal = memo(({ darkMode, isMobile, windowHeight, windowWidth, setItems, items, lang }: DeleteModalProps) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [selected, setSelected] = useState<ItemProps[]>([])
    const toDelete = useRef<ItemProps[]>([])
    const isOpen = useRef<boolean>(false)

    const deleteItems = async () => {
        if(loading){
            return
        }

        if(toDelete.current.length == 0){
            return
        }

        setLoading(true)

        const promises = []
        const deleted: ItemProps[] = []

        for(let i = 0; i < toDelete.current.length; i++){
            promises.push(new Promise((resolve, reject) => {
                trashItem(toDelete.current[i]).then(() => {
                    deleted.push(toDelete.current[i])

                    return resolve(toDelete.current[i])
                }).catch((err) => {
                    return reject({
                        err,
                        item: toDelete.current[i]
                    })
                })
            }))
        }
        
        const results = await Promise.allSettled(promises)
        const success = results.filter(result => result.status == "fulfilled") as PromiseFulfilledResult<ItemProps>[]
        const error = results.filter(result => result.status == "rejected") as { status: string, reason: { err: Error, item: ItemProps } }[]
        const deletedUUIds: string[] = success.map(item => item.value.uuid)

        if(deletedUUIds.length > 0){
            const sortBy = (await db.get("sortBy")) || {}

            setItems(prev => orderItemsByType(prev.filter(item => !deletedUUIds.includes(item.uuid)), sortBy[window.location.href], window.location.href))
        }

        if(deleted.length > 0){
            showToast("success", i18n(lang, "itemsMovedToTrash", true, ["__COUNT__"], [success.length.toString()]), "bottom", 5000)

            Promise.all([
                addItemsToStore(deleted, "trash"),
                ...deleted.map(deletedItem => removeItemsFromStore([deletedItem], deletedItem.parent)),
                ...DEFAULT_PARENTS.map(defaultParent => ([...deleted.map(deletedItem => removeItemsFromStore([deletedItem], defaultParent))])).flat()
            ]).catch(console.error)
        }

        if(error.length > 0){
            for(let i = 0; i < error.length; i++){
                showToast("error", i18n(lang, "couldNotMoveToTrash", true, ["__NAME__", "__ERR__"], [error[i].reason.item.name, error[i].reason.err.toString()]), "bottom", 5000)
            }
        }

        toDelete.current = []

        setLoading(false)
        setSelected([])
        setOpen(false)
    }

    const windowOnKeyDown = (e: KeyboardEvent): void => {
        if(e.which == 13 && toDelete.current.length > 0 && isOpen.current){
            deleteItems()
        }
    }

    useEffect(() => {
        isOpen.current = open
    }, [open])

    useEffect(() => {
        window.addEventListener("keydown", windowOnKeyDown)

        const openDeleteModalListener = eventListener.on("openDeleteModal", ({ items }: { items: ItemProps[] }) => {
            toDelete.current = items

            setSelected(items)
            setOpen(true)
        })
        
        return () => {
            openDeleteModalListener.remove()

            window.removeEventListener("keydown", windowOnKeyDown)
        }
    }, [])

    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
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
                    {i18n(lang, "delete")}
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
                    {
                        loading ? (
                            <Spinner
                                width="32px"
                                height="32px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                color={getColor(darkMode, "textPrimary")}
                            >
                                {i18n(lang, "deleteModalSure", true, ["__COUNT__"], [selected.length.toString()])}
                            </AppText>
                        )
                    }
                </ModalBody>
                {
                    !loading && (
                        <ModalFooter>
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color="red"
                                cursor="pointer"
                                onClick={() => deleteItems()}
                            >
                                {i18n(lang, "delete")}
                            </AppText>
                        </ModalFooter>
                    )
                }
            </ModalContent>
        </Modal>
    )
})

export default DeleteModal