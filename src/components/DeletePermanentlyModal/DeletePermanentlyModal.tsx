import { memo, useState, useEffect, useRef, useCallback } from "react"
import type { DeletePermanentlyModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import db from "../../lib/db"
import { show as showToast } from "../Toast/Toast"
import { deleteItemPermanently } from "../../lib/api"
import { orderItemsByType } from "../../lib/helpers"
import { i18n } from "../../i18n"
import { removeItemsFromStore, DEFAULT_PARENTS } from "../../lib/services/metadata"

const DeletePermanentlyModal = memo(({ darkMode, isMobile, setItems, lang }: DeletePermanentlyModalProps) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const toDelete = useRef<ItemProps[]>([])
    const [selected, setSelected] = useState<ItemProps[]>([])
    const isOpen = useRef<boolean>(false)

    const deletePermanently = async (): Promise<void> => {
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
                deleteItemPermanently(toDelete.current[i]).then(() => {
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
        const deletedUUIds: string[] = deleted.map(item => item.uuid)

        if(deleted.length > 0){
            if(deletedUUIds.length > 0){
                const sortBy = (await db.get("sortBy")) || {}

                setItems(prev => orderItemsByType(prev.filter(item => !deletedUUIds.includes(item.uuid)), sortBy[window.location.href], window.location.href))
            }

            showToast("success", i18n(lang, "itemsDeletedPerm", true, ["__COUNT__"], [success.length.toString()]), "bottom", 5000)

            Promise.all([
                ...DEFAULT_PARENTS.map(defaultParent => ([...deleted.map(deletedItem => removeItemsFromStore([deletedItem], defaultParent))])).flat()
            ]).catch(console.error)
        }

        if(error.length > 0){
            for(let i = 0; i < error.length; i++){
                showToast("error", i18n(lang, "couldNotDeletePerm", true, ["__NAME__", "__ERR__"], [error[i].reason.item.name, error[i].reason.err.toString()]), "bottom", 5000)
            }
        }

        toDelete.current = []

        setLoading(false)
        setOpen(false)
        setSelected([])
    }

    const windowKeyDown = useCallback((e: KeyboardEvent): void => {
        if(e.which == 13 && window.location.hash.indexOf("trash") !== -1 && isOpen.current){
            deletePermanently()
        }
    }, [window.location.hash, isOpen.current])

    useEffect(() => {
        isOpen.current = open
    }, [open])

    useEffect(() => {
        const openDeletePermanentlyModalListener = eventListener.on("openDeletePermanentlyModal", ({ items }: { items: ItemProps[] }) => {
            toDelete.current = items

            setSelected(items)
            setOpen(true)
        })

        window.addEventListener("keydown", windowKeyDown)
        
        return () => {
            openDeletePermanentlyModalListener.remove()

            window.removeEventListener("keydown", windowKeyDown)
        }
    }, [])

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
                    {i18n(lang, "deletePerm")}
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
                    {i18n(lang, "deletePermModalSure", true, ["__COUNT__"], [selected.length.toString()])}
                    
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
                                color="red.500"
                                cursor="pointer"
                                onClick={() => deletePermanently()}
                            >
                                {i18n(lang, "delete")}
                            </AppText>
                        )
                    }
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export default DeletePermanentlyModal