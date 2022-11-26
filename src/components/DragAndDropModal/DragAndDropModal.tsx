import { memo, useCallback, useState, useEffect, useMemo } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, Flex, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { useLocation } from "react-router-dom"
import { debounce } from "lodash"
import { i18n } from "../../i18n"

const DragAndDropModal = memo(({ darkMode, isMobile, windowHeight, windowWidth, open, setOpen, lang }: { darkMode: boolean, isMobile: boolean, windowHeight: number, windowWidth: number, open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>, lang: string }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const location = useLocation()

    const uploadBlocked: boolean = useMemo(() => {
        return window.location.hash.indexOf("shared-in") !== -1
            || window.location.hash.indexOf("trash") !== -1
            || window.location.hash.indexOf("links") !== -1
            || window.location.hash.indexOf("favorites") !== -1
            || window.location.hash.indexOf("recent") !== -1
            || window.location.hash.indexOf("account") !== -1
    }, [location])

    const changeState = useCallback(debounce((state: boolean) => {
        setIsOpen(state)
    }, 100), [])

    const onDragOverListener = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        const fileList = e.dataTransfer?.items

        if(!fileList){
            return
        }

        let hasFile: boolean = false

        for(let i = 0; i < fileList.length; i++){
            if(fileList[i].kind == "file"){
                hasFile = true
            }
        }

        if(!hasFile){
            return
        }
        
        setOpen(true)
    }, [])

    const onDragLeaveListener = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        const fileList = e.dataTransfer?.items

        if(!fileList){
            return
        }

        let hasFile: boolean = false

        for(let i = 0; i < fileList.length; i++){
            if(fileList[i].kind == "file"){
                hasFile = true
            }
        }

        if(!hasFile){
            return
        }
        
        setOpen(false)
    }, [])
    
    const onDropListener = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
        setOpen(false)
    }, [])

    useEffect(() => {
        changeState(open && !uploadBlocked)
    }, [open, location, uploadBlocked, changeState])

    return (
        <Modal
            onClose={() => setIsOpen(false)}
            isOpen={isOpen}
            isCentered={true}
            size={isMobile ? "xl" : "md"}
            blockScrollOnMount={false}
        >
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
                onDragOver={onDragOverListener}
                onDragLeave={onDragLeaveListener}
                onDrop={onDropListener}
            >
                <ModalHeader />
                <ModalBody
                    height="100%"
                    width="100%"
                    onDragOver={onDragOverListener}
                    onDragLeave={onDragLeaveListener}
                    onDrop={onDropListener}
                >
                    <Flex
                        height="250px"
                        width="100%"
                        alignItems="center"
                        justifyContent="center"
                        border={"2px dashed " + getColor(darkMode, "borderPrimary")}
                    >
                        {i18n(lang, "uploadHere")}
                    </Flex>
                </ModalBody>
                <ModalFooter />
            </ModalContent>
        </Modal>
    )
})

export default DragAndDropModal