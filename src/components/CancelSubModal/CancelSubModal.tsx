import { memo, useState, useEffect, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { cancelSub } from "../../lib/api"
import { i18n } from "../../i18n"

const CancelSubModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const planId = useRef<string>("")
    const isCancelling = useRef<boolean>(false)

    const cancel = async () => {
        if(isCancelling.current){
            return
        }

        isCancelling.current = true

        const loading = showToast("loading", i18n(lang, "cancellingSub"), "bottom", Number.MAX_SAFE_INTEGER)

        setOpen(false)

        try{
            await cancelSub(planId.current)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        dismissToast(loading)

        isCancelling.current = false
    }

    useEffect(() => {
        const openCancelSubModalListener = eventListener.on("openCancelSubModal", (id: string) => {
            planId.current = id
            
            setOpen(true)
        })
        
        return () => {
            openCancelSubModalListener.remove()
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
                    {i18n(lang, "cancelSub")}
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
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        color={getColor(darkMode, "textPrimary")}
                    >
                        {i18n(lang, "cancelSubSure")}
                    </AppText>
                </ModalBody>
                <ModalFooter>
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        noOfLines={1}
                        wordBreak="break-all"
                        color="red.500"
                        cursor="pointer"
                        onClick={() => cancel()}
                    >
                        {i18n(lang, "cancel")}
                    </AppText>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export default CancelSubModal